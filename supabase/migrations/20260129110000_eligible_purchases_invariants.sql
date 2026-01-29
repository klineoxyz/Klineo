-- KLINEO: Business invariants for eligible_purchases.
-- Purchase status: only PENDING -> COMPLETED | FAILED | CANCELLED.
-- Completed purchases: amount and currency immutable. Allocation runs once per purchase.

-- 1) Status transition: only allow pending -> completed | failed | cancelled; completed/failed/cancelled are final
CREATE OR REPLACE FUNCTION public.eligible_purchases_validate_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF OLD.status != 'pending' THEN
    RAISE EXCEPTION 'eligible_purchases: invalid status transition from % (only pending can change)', OLD.status
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.status NOT IN ('completed', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'eligible_purchases: status can only change to completed, failed, or cancelled, got %', NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS eligible_purchases_status_transition ON public.eligible_purchases;
CREATE TRIGGER eligible_purchases_status_transition
  BEFORE UPDATE OF status ON public.eligible_purchases
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE PROCEDURE public.eligible_purchases_validate_status_transition();

-- 2) Completed purchases: amount and currency immutable
CREATE OR REPLACE FUNCTION public.eligible_purchases_validate_completed_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'completed' AND (OLD.amount IS DISTINCT FROM NEW.amount OR OLD.currency IS DISTINCT FROM NEW.currency) THEN
    RAISE EXCEPTION 'eligible_purchases: amount and currency cannot be changed for completed purchase'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS eligible_purchases_completed_immutable ON public.eligible_purchases;
CREATE TRIGGER eligible_purchases_completed_immutable
  BEFORE UPDATE OF amount, currency ON public.eligible_purchases
  FOR EACH ROW
  WHEN (OLD.status = 'completed')
  EXECUTE PROCEDURE public.eligible_purchases_validate_completed_immutable();

COMMENT ON FUNCTION public.eligible_purchases_validate_status_transition() IS
  'Only allow status transition from pending to completed, failed, or cancelled.';
COMMENT ON FUNCTION public.eligible_purchases_validate_completed_immutable() IS
  'Completed purchases cannot have amount or currency changed.';
