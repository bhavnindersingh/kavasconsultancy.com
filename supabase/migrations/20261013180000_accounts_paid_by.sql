-- ============================================================================
-- Kavas workspace — Accounts: who paid (or received) each entry.
-- ============================================================================
-- The three partners share the firm equally, and any of them, or Kavas
-- Capital, may pay a bill or receive a client's payment. Each entry records
-- which one, so the app can show who has put in what and settle equal shares.
--
--   paid_by_id      — a partner (or anyone on the team), by profile
--   paid_by_entity  — another payer that isn't a person:
--                       kavas_capital      — the sister firm
--                       kavas_consultancy  — the firm's own account, kept
--                                            for when it has one
--
-- At most one of the two is set. Both are NULL on entries made before this.
-- Idempotent, one transaction.
-- ============================================================================

BEGIN;

ALTER TABLE public.account_entries
    ADD COLUMN IF NOT EXISTS paid_by_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS paid_by_entity TEXT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'account_entries_paid_by_entity_check') THEN
        ALTER TABLE public.account_entries
            ADD CONSTRAINT account_entries_paid_by_entity_check
            CHECK (paid_by_entity IS NULL OR paid_by_entity IN ('kavas_capital', 'kavas_consultancy'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'account_entries_one_payer') THEN
        ALTER TABLE public.account_entries
            ADD CONSTRAINT account_entries_one_payer
            CHECK (paid_by_id IS NULL OR paid_by_entity IS NULL);
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_account_entries_paid_by ON public.account_entries (paid_by_id);

COMMIT;
