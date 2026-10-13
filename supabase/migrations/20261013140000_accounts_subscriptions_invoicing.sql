-- ============================================================================
-- Kavas workspace — Accounts: Subscriptions, and Invoicing (money in).
-- ============================================================================
-- subscription — software and services paid for on a schedule; spending,
--                like every other category.
-- invoice      — what Kavas invoices its clients: money IN. The app keeps it
--                apart from spending and shows in, out and the difference.
--                `party` is the client; `invoice_no` / `invoice_date` hold
--                the invoice whether or not it carries GST.
--
-- Replaces the category CHECK added in 20261013120000. Idempotent, one
-- transaction.
-- ============================================================================

BEGIN;

ALTER TABLE public.account_entries DROP CONSTRAINT IF EXISTS account_entries_category_check;

ALTER TABLE public.account_entries
    ADD CONSTRAINT account_entries_category_check
    CHECK (category IN ('salary', 'purchase', 'personal', 'company', 'marketing', 'subscription', 'invoice'));

COMMIT;
