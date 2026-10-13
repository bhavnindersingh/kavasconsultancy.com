-- ============================================================================
-- Kavas workspace — Accounts: projects, and partners' project fees.
-- ============================================================================
-- Partners earn through fees on the projects they work on; whatever a
-- project leaves after its costs and those fees is kept by the firm as Cash
-- reserves (the app's books do that sum; nothing here is stored for it).
--
--   projects              — a client engagement. Invoices and bills can be
--                           tagged with one, for project-wise P&L.
--   project_partner_fees  — per project, per partner: a fixed amount, or a
--                           percentage of what the client pays on it. The
--                           app suggests the fee from this; the fee itself is
--                           recorded as an account entry.
--   account_entries
--     .project_id         — the project an entry belongs to (optional).
--     category 'partner_fee'
--                         — a fee the firm owes a partner for a project.
--                           Always names the partner (owner_id) and the
--                           project, and only a firm partner can earn one.
--
-- Partners only, like the rest of Accounts. Idempotent, one transaction.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.projects (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
    client     TEXT,
    notes      TEXT,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_name ON public.projects (LOWER(TRIM(name)));

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.project_partner_fees (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    mode       TEXT NOT NULL CHECK (mode IN ('fixed', 'percent')),
    value      NUMERIC(14, 2) NOT NULL CHECK (value >= 0),
    CONSTRAINT project_partner_fees_percent CHECK (mode <> 'percent' OR value <= 100),
    CONSTRAINT project_partner_fees_once UNIQUE (project_id, partner_id)
);
CREATE INDEX IF NOT EXISTS idx_project_partner_fees_project ON public.project_partner_fees (project_id);

ALTER TABLE public.account_entries
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_account_entries_project ON public.account_entries (project_id);

ALTER TABLE public.account_entries DROP CONSTRAINT IF EXISTS account_entries_category_check;
ALTER TABLE public.account_entries
    ADD CONSTRAINT account_entries_category_check
    CHECK (category IN (
        'invoice',
        'salary', 'office', 'subscription', 'marketing', 'travel',
        'professional', 'purchase', 'tax_bank', 'company',
        'partner_fee',
        'personal'
    ));

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'account_entries_partner_fee') THEN
        ALTER TABLE public.account_entries
            ADD CONSTRAINT account_entries_partner_fee
            CHECK (category <> 'partner_fee' OR (owner_id IS NOT NULL AND project_id IS NOT NULL));
    END IF;
END;
$$;

-- Only a firm partner earns a project fee, or is named in a project's fee rules.
CREATE OR REPLACE FUNCTION public.guard_partner_fee()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    who UUID := CASE WHEN TG_TABLE_NAME = 'account_entries' THEN NEW.owner_id ELSE NEW.partner_id END;
BEGIN
    IF (TG_TABLE_NAME <> 'account_entries' OR NEW.category = 'partner_fee')
       AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = who AND is_firm_partner) THEN
        RAISE EXCEPTION 'Only a partner in the firm earns a project fee' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_partner_fee ON public.account_entries;
CREATE TRIGGER trigger_guard_partner_fee
    BEFORE INSERT OR UPDATE OF category, owner_id ON public.account_entries
    FOR EACH ROW EXECUTE FUNCTION public.guard_partner_fee();

DROP TRIGGER IF EXISTS trigger_guard_project_partner_fee ON public.project_partner_fees;
CREATE TRIGGER trigger_guard_project_partner_fee
    BEFORE INSERT OR UPDATE OF partner_id ON public.project_partner_fees
    FOR EACH ROW EXECUTE FUNCTION public.guard_partner_fee();

ALTER TABLE public.projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_partner_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_partner ON public.projects;
CREATE POLICY projects_partner ON public.projects
    FOR ALL TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
DROP POLICY IF EXISTS project_partner_fees_partner ON public.project_partner_fees;
CREATE POLICY project_partner_fees_partner ON public.project_partner_fees
    FOR ALL TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());

REVOKE ALL ON public.projects, public.project_partner_fees FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects, public.project_partner_fees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects, public.project_partner_fees TO service_role;

COMMIT;
