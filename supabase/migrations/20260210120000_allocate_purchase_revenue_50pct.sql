-- KLINEO: Change referral pool from 70% to 50% of purchase.
-- 50% of each purchase is distributed among L1–L7 (e.g. $50 on a $100 package).
-- Split: 50% community (7 levels), 20% platform, 30% marketing (+ remainder).

CREATE OR REPLACE FUNCTION public.allocate_purchase_revenue(p_purchase_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_purchase RECORD;
  v_exists BOOLEAN;
  v_amount NUMERIC(20, 4);
  v_currency TEXT;
  v_upline UUID[];
  v_current_id UUID;
  v_referrer_id UUID;
  v_level INT;
  -- Level weights (L1..L7): 30, 20, 10, 8, 6, 4, 2; sum = 80. Pool = 50%.
  v_level_pct NUMERIC[] := ARRAY[
    30.0/80*50, 20.0/80*50, 10.0/80*50, 8.0/80*50, 6.0/80*50, 4.0/80*50, 2.0/80*50
  ];
  v_level_amt NUMERIC[];
  v_platform_amt NUMERIC(20, 4);
  v_marketing_base NUMERIC(20, 4);
  v_marketing_total NUMERIC(20, 4);
  v_referral_total NUMERIC(20, 4);
  v_remainder NUMERIC(20, 4);
  v_amt NUMERIC(20, 4);
  v_rate_pct NUMERIC(8, 4);
  v_marketing_from_splits NUMERIC(20, 4);
BEGIN
  -- 1) Lock purchase row and load (must be completed; idempotency)
  SELECT id, user_id, amount, currency, status
    INTO v_purchase
    FROM public.eligible_purchases
   WHERE id = p_purchase_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'purchase_not_found';
  END IF;

  IF v_purchase.status != 'completed' THEN
    RETURN 'purchase_not_completed';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.purchase_allocation_runs WHERE purchase_id = p_purchase_id
  ) INTO v_exists;
  IF v_exists THEN
    RETURN 'already_allocated';
  END IF;

  v_amount := v_purchase.amount;
  v_currency := COALESCE(v_purchase.currency, 'USDT');
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN 'invalid_amount';
  END IF;

  -- 2) Resolve 7-level upline (L1 = referrer of purchaser, L2 = referrer of L1, ...)
  v_upline := ARRAY[]::UUID[];
  v_current_id := v_purchase.user_id;
  FOR v_level IN 1..7 LOOP
    SELECT r.referrer_id INTO v_referrer_id
      FROM public.referrals r
     WHERE r.referred_id = v_current_id
     LIMIT 1;
    v_upline := array_append(v_upline, v_referrer_id);
    v_current_id := v_referrer_id;
  END LOOP;

  -- 3) Compute amounts: 50% pool (L1–L7), 20% platform, 30% marketing base; remainder -> marketing
  v_level_amt := ARRAY[]::NUMERIC[];
  FOR v_level IN 1..7 LOOP
    v_rate_pct := v_level_pct[v_level];
    v_amt := ROUND((v_amount * v_rate_pct / 100)::numeric, 2);
    v_level_amt := array_append(v_level_amt, v_amt);
  END LOOP;
  v_referral_total := (SELECT SUM(x) FROM unnest(v_level_amt) AS x);
  v_platform_amt := ROUND((v_amount * 20 / 100)::numeric, 2);
  v_marketing_base := ROUND((v_amount * 30 / 100)::numeric, 2);
  v_remainder := ROUND((v_amount - v_referral_total - v_platform_amt - v_marketing_base)::numeric, 2);
  v_marketing_total := v_marketing_base + v_remainder;

  -- 4) Insert referral earnings (existing upline) and marketing (missing upline)
  FOR v_level IN 1..7 LOOP
    v_amt := v_level_amt[v_level];
    v_rate_pct := v_level_pct[v_level];
    IF v_upline[v_level] IS NOT NULL AND v_amt > 0 THEN
      INSERT INTO public.purchase_referral_earnings (purchase_id, level, user_id, amount, currency, rate_pct)
      VALUES (p_purchase_id, v_level, v_upline[v_level], v_amt, v_currency, v_rate_pct);
    ELSIF v_amt > 0 THEN
      INSERT INTO public.marketing_pool_ledger (purchase_id, amount, currency, source_type, level_if_applicable)
      VALUES (p_purchase_id, v_amt, v_currency, 'missing_upline_reallocation', v_level);
    END IF;
  END LOOP;

  -- 5) Direct 30% base + remainder to marketing_pool_ledger
  IF v_marketing_base > 0 THEN
    INSERT INTO public.marketing_pool_ledger (purchase_id, amount, currency, source_type, level_if_applicable)
    VALUES (p_purchase_id, v_marketing_base, v_currency, 'direct_10pct', NULL);
  END IF;
  IF v_remainder != 0 THEN
    INSERT INTO public.marketing_pool_ledger (purchase_id, amount, currency, source_type, level_if_applicable)
    VALUES (p_purchase_id, v_remainder, v_currency, 'direct_10pct', NULL);
  END IF;

  -- 6) Revenue splits (platform, marketing)
  INSERT INTO public.purchase_revenue_splits (purchase_id, split_type, amount, currency, source_detail)
  VALUES (p_purchase_id, 'platform', v_platform_amt, v_currency, 'platform_20pct');
  INSERT INTO public.purchase_revenue_splits (purchase_id, split_type, amount, currency, source_detail)
  VALUES (p_purchase_id, 'marketing', v_marketing_total, v_currency, 'direct_30pct_plus_reallocations_and_remainder');

  -- 7) Mark allocation run (idempotency)
  INSERT INTO public.purchase_allocation_runs (purchase_id) VALUES (p_purchase_id);

  RETURN 'allocated';
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.allocate_purchase_revenue(UUID) IS
  'Allocates purchase revenue: 50% to 7-level referral pool, 20% platform, 30% marketing. Idempotent.';
