-- Atomic coupon redemption to prevent race condition (G1 in PAYMENT_AND_DISCOUNT_AUDIT)
-- Returns true if increment succeeded (within max_redemptions), false if limit reached.

CREATE OR REPLACE FUNCTION public.try_increment_coupon_redemption(p_coupon_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.coupons
  SET current_redemptions = current_redemptions + 1,
      updated_at = now()
  WHERE id = p_coupon_id
    AND (max_redemptions IS NULL OR current_redemptions < max_redemptions);
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.try_increment_coupon_redemption(uuid) IS 'Atomically increment coupon current_redemptions if under max_redemptions; returns false if limit reached.';
