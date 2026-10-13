-- ============================================================================
-- Kavas workspace — Accounts: major expense heads.
-- ============================================================================
-- Four new heads so every bill has an obvious home:
--   office       — rent, co-working, electricity, internet, phone
--   travel       — flights, cabs, hotels, client meals
--   professional — CA, legal, ROC/GST filings, consultants
--   tax_bank     — GST/TDS paid, bank and gateway charges, penalties
--
-- Existing values keep their meaning; the app relabels them:
--   purchase → "Equipment & purchases", subscription → "Software &
--   subscriptions", company → "Other". No rows change.
--
-- Replaces the category CHECK from 20261013140000. Idempotent, one
-- transaction.
-- ============================================================================

BEGIN;

ALTER TABLE public.account_entries DROP CONSTRAINT IF EXISTS account_entries_category_check;

ALTER TABLE public.account_entries
    ADD CONSTRAINT account_entries_category_check
    CHECK (category IN (
        'invoice',
        'salary', 'office', 'subscription', 'marketing', 'travel',
        'professional', 'purchase', 'tax_bank', 'company',
        'personal'
    ));

COMMIT;
