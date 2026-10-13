-- ============================================================================
-- Kavas workspace — who owns the firm, and who may pay for it.
-- ============================================================================
-- The app's "partner" role is about ACCESS (Documents, Accounts, Team) and
-- can be given to people who don't own the firm. Ownership is separate:
--
--   is_firm_partner   — an equal partner in Kavas Consultancy. Only these
--                       people may be recorded as paying (or receiving)
--                       money for the firm, and the firm's money is evened
--                       out between them in equal shares.
--   in_kavas_capital  — a partner in Kavas Capital, the sister firm that may
--                       also pay. What Kavas Capital pays counts equally to
--                       its partners in the settlement.
--
-- Guards:
--   • Only a firm partner may change either flag, except while no firm
--     partner exists yet (first-time setup). Server-side code with the
--     service key (auth.uid() IS NULL) is not limited.
--   • An account entry's paid_by_id must be a firm partner.
--
-- Idempotent, one transaction.
-- ============================================================================

BEGIN;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_firm_partner  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS in_kavas_capital BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.is_firm_partner()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active AND is_firm_partner);
$$;

CREATE OR REPLACE FUNCTION public.guard_profile_stake()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF (NEW.is_firm_partner IS DISTINCT FROM OLD.is_firm_partner
        OR NEW.in_kavas_capital IS DISTINCT FROM OLD.in_kavas_capital)
       AND auth.uid() IS NOT NULL
       AND NOT public.is_firm_partner()
       AND EXISTS (SELECT 1 FROM profiles WHERE is_firm_partner) THEN
        RAISE EXCEPTION 'Only a partner in the firm can change who owns it' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_profile_stake ON public.profiles;
CREATE TRIGGER trigger_guard_profile_stake
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_stake();

-- Only a firm partner can be the person who paid. Checked when the payer is
-- set or changed, so old entries stay editable if someone later steps down.
CREATE OR REPLACE FUNCTION public.guard_entry_payer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF NEW.paid_by_id IS NOT NULL
       AND (TG_OP = 'INSERT' OR NEW.paid_by_id IS DISTINCT FROM OLD.paid_by_id)
       AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.paid_by_id AND is_firm_partner) THEN
        RAISE EXCEPTION 'Only a partner in the firm, or Kavas Capital, can pay' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_entry_payer ON public.account_entries;
CREATE TRIGGER trigger_guard_entry_payer
    BEFORE INSERT OR UPDATE OF paid_by_id ON public.account_entries
    FOR EACH ROW EXECUTE FUNCTION public.guard_entry_payer();

COMMIT;
