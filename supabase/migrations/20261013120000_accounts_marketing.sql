-- ============================================================================
-- Kavas workspace — Accounts: a Marketing category.
-- ============================================================================
-- Kavas spends as a company; marketing (ads, events, collateral) is tracked as
-- its own category beside salaries, purchases and running costs. "personal"
-- stays allowed so old entries still read; the app no longer offers it.
--
-- The original category CHECK was declared inline, so its name was generated
-- by Postgres. It is found by its definition instead of guessed.
--
-- Idempotent, one transaction.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.account_entries'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%category%salary%'
          AND conname <> 'account_entries_per_person'
    LOOP
        EXECUTE format('ALTER TABLE public.account_entries DROP CONSTRAINT %I', c.conname);
    END LOOP;
END;
$$;

ALTER TABLE public.account_entries
    ADD CONSTRAINT account_entries_category_check
    CHECK (category IN ('salary', 'purchase', 'personal', 'company', 'marketing'));

COMMIT;
