-- ============================================================================
-- Kavas workspace — work.kavasconsultancy.com
-- ============================================================================
-- Tasks, Documents and Accounts for the partners and the team.
--
--   Tasks      — boards of tasks with subtasks, comments and files. Ported from
--                the Conscious Cafe manager's task board (same statuses, same
--                priorities, same board-owner sign-off rule).
--   Documents  — a nested folder cabinet of company files.
--   Accounts   — the partners' ledger: salaries, purchases, personal and
--                company spending, with GST details and receipts. Ported from
--                Nightingale's Account Management.
--
-- WHO SEES WHAT
--   member  — any active login. Works Tasks.
--   partner — also Documents and Accounts.
-- Logins are Supabase Auth users; `profiles` mirrors each one (created by the
-- trigger below). Nobody signs themselves up — add users from the Supabase
-- dashboard, then promote partners:
--     UPDATE profiles SET role = 'partner' WHERE email = 'someone@example.com';
--
-- The UI hiding a route is a convenience, never a boundary: every table and
-- every bucket is gated here by RLS on is_member() / is_partner().
--
-- Idempotent, one transaction.
-- ============================================================================

BEGIN;

-- ── 0. Shared helpers ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

-- ── 1. Profiles ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    full_name   TEXT,
    role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('partner', 'member')),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        LOWER(NEW.email),
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', SPLIT_PART(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Users that existed before this migration.
INSERT INTO public.profiles (id, email, full_name)
SELECT id, LOWER(email), SPLIT_PART(email, '@', 1) FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- SECURITY DEFINER so policies on `profiles` itself don't recurse.
CREATE OR REPLACE FUNCTION public.is_member()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active);
$$;

CREATE OR REPLACE FUNCTION public.is_partner()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active AND role = 'partner');
$$;

-- A member may not promote themselves: only a partner changes role/is_active.
CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active
        OR NEW.email IS DISTINCT FROM OLD.email)
       AND auth.uid() IS NOT NULL AND NOT public.is_partner() THEN
        RAISE EXCEPTION 'Only a partner can change roles' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_profile_role ON public.profiles;
CREATE TRIGGER trigger_guard_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
    FOR SELECT TO authenticated USING (public.is_member());

DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_partner())
    WITH CHECK (id = auth.uid() OR public.is_partner());

-- ── 2. Tasks ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.task_boards (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
    description TEXT,
    -- Who signs finished work off. NULL = anyone may move a task to done.
    owner_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id     UUID NOT NULL REFERENCES public.task_boards(id) ON DELETE CASCADE,
    title        TEXT NOT NULL CHECK (LENGTH(TRIM(title)) > 0),
    description  TEXT,
    status       TEXT NOT NULL DEFAULT 'todo'
                 CHECK (status IN ('todo', 'in_progress', 'blocked', 'quality_check', 'done')),
    priority     TEXT NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assignee_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- DATE, not TIMESTAMP: a due date has no time of day.
    start_date   DATE,
    due_date     DATE,
    progress     SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tasks_dates_ordered CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date)
);

CREATE INDEX IF NOT EXISTS idx_tasks_board ON public.tasks (board_id, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks (assignee_id);

CREATE TABLE IF NOT EXISTS public.task_subtasks (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title      TEXT NOT NULL CHECK (LENGTH(TRIM(title)) > 0),
    is_done    BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_subtasks_task ON public.task_subtasks (task_id, sort_order);

CREATE TABLE IF NOT EXISTS public.task_comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    body       TEXT NOT NULL CHECK (LENGTH(TRIM(body)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments (task_id, created_at);

CREATE TABLE IF NOT EXISTS public.task_files (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id      UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,                    -- display name; never a path
    storage_path TEXT NOT NULL UNIQUE,             -- object key in `task-files`
    mime_type    TEXT,
    file_size    BIGINT,
    uploaded_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_files_task ON public.task_files (task_id);

DROP TRIGGER IF EXISTS trigger_task_boards_updated_at ON public.task_boards;
CREATE TRIGGER trigger_task_boards_updated_at
    BEFORE UPDATE ON public.task_boards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON public.tasks;
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- completed_at follows status, so "when did this finish" is never hand-kept.
CREATE OR REPLACE FUNCTION public.stamp_task_completion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status <> 'done') THEN
        NEW.completed_at := NOW();
        NEW.progress := 100;
    ELSIF NEW.status <> 'done' THEN
        NEW.completed_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_stamp_task_completion ON public.tasks;
CREATE TRIGGER trigger_stamp_task_completion
    BEFORE INSERT OR UPDATE OF status ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.stamp_task_completion();

-- Sign-off: on a board with an owner, only the owner (or a partner) may move
-- a task to done. Everyone else sends it to quality_check.
CREATE OR REPLACE FUNCTION public.guard_task_sign_off()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    board_owner UUID;
BEGIN
    IF NEW.status <> 'done' OR (TG_OP = 'UPDATE' AND OLD.status = 'done') THEN
        RETURN NEW;
    END IF;
    SELECT owner_id INTO board_owner FROM task_boards WHERE id = NEW.board_id;
    IF board_owner IS NULL OR board_owner = auth.uid() OR public.is_partner() THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Only the board owner can sign this task off — move it to Quality check instead'
        USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_task_sign_off ON public.tasks;
CREATE TRIGGER trigger_guard_task_sign_off
    BEFORE INSERT OR UPDATE OF status ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.guard_task_sign_off();

ALTER TABLE public.task_boards   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_files    ENABLE ROW LEVEL SECURITY;

-- Boards: any member reads/creates/edits; deleting a board (and every task
-- on it) is for its owner, its creator or a partner.
DROP POLICY IF EXISTS task_boards_select ON public.task_boards;
CREATE POLICY task_boards_select ON public.task_boards
    FOR SELECT TO authenticated USING (public.is_member());
DROP POLICY IF EXISTS task_boards_insert ON public.task_boards;
CREATE POLICY task_boards_insert ON public.task_boards
    FOR INSERT TO authenticated WITH CHECK (public.is_member());
DROP POLICY IF EXISTS task_boards_update ON public.task_boards;
CREATE POLICY task_boards_update ON public.task_boards
    FOR UPDATE TO authenticated USING (public.is_member()) WITH CHECK (public.is_member());
DROP POLICY IF EXISTS task_boards_delete ON public.task_boards;
CREATE POLICY task_boards_delete ON public.task_boards
    FOR DELETE TO authenticated
    USING (public.is_partner() OR owner_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS tasks_all ON public.tasks;
CREATE POLICY tasks_all ON public.tasks
    FOR ALL TO authenticated USING (public.is_member()) WITH CHECK (public.is_member());
DROP POLICY IF EXISTS task_subtasks_all ON public.task_subtasks;
CREATE POLICY task_subtasks_all ON public.task_subtasks
    FOR ALL TO authenticated USING (public.is_member()) WITH CHECK (public.is_member());

-- Comments: everyone reads; you write as yourself; you (or a partner) remove yours.
DROP POLICY IF EXISTS task_comments_select ON public.task_comments;
CREATE POLICY task_comments_select ON public.task_comments
    FOR SELECT TO authenticated USING (public.is_member());
DROP POLICY IF EXISTS task_comments_insert ON public.task_comments;
CREATE POLICY task_comments_insert ON public.task_comments
    FOR INSERT TO authenticated WITH CHECK (public.is_member() AND author_id = auth.uid());
DROP POLICY IF EXISTS task_comments_delete ON public.task_comments;
CREATE POLICY task_comments_delete ON public.task_comments
    FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_partner());

DROP POLICY IF EXISTS task_files_all ON public.task_files;
CREATE POLICY task_files_all ON public.task_files
    FOR ALL TO authenticated USING (public.is_member()) WITH CHECK (public.is_member());

-- ── 3. Documents ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.document_folders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id   UUID REFERENCES public.document_folders(id) ON DELETE RESTRICT,
    name        TEXT NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
    created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT document_folders_not_self CHECK (parent_id IS DISTINCT FROM id)
);

-- Sibling names are unique, case-insensitively. The sentinel UUID stands in
-- for "top level" because NULLs never collide in a unique index.
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_folders_sibling_name
    ON public.document_folders (
        COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(name))
    );

-- Moving a folder under its own descendant would orphan the subtree.
CREATE OR REPLACE FUNCTION public.guard_document_folder_cycle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    cursor_id UUID := NEW.parent_id;
    depth     INTEGER := 0;
BEGIN
    WHILE cursor_id IS NOT NULL LOOP
        IF cursor_id = NEW.id THEN
            RAISE EXCEPTION 'A folder cannot be moved inside itself';
        END IF;
        depth := depth + 1;
        IF depth > 8 THEN
            RAISE EXCEPTION 'Folders nest at most 8 levels deep';
        END IF;
        SELECT parent_id INTO cursor_id FROM document_folders WHERE id = cursor_id;
    END LOOP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_document_folder_cycle ON public.document_folders;
CREATE TRIGGER trigger_guard_document_folder_cycle
    BEFORE INSERT OR UPDATE OF parent_id ON public.document_folders
    FOR EACH ROW EXECUTE FUNCTION public.guard_document_folder_cycle();

CREATE TABLE IF NOT EXISTS public.documents (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- RESTRICT: a folder with files in it must be emptied before it goes.
    folder_id    UUID NOT NULL REFERENCES public.document_folders(id) ON DELETE RESTRICT,
    name         TEXT NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
    description  TEXT,
    storage_path TEXT NOT NULL UNIQUE,             -- object key in `company-documents`
    mime_type    TEXT,
    file_size    BIGINT,
    uploaded_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON public.documents (folder_id, name);

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_folders_partner ON public.document_folders;
CREATE POLICY document_folders_partner ON public.document_folders
    FOR ALL TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
DROP POLICY IF EXISTS documents_partner ON public.documents;
CREATE POLICY documents_partner ON public.documents
    FOR ALL TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());

-- ── 4. Accounts ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.account_entries (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_date     DATE NOT NULL,
    category       TEXT NOT NULL CHECK (category IN ('salary', 'purchase', 'personal', 'company')),
    party          TEXT,                            -- who the money went to
    description    TEXT NOT NULL CHECK (LENGTH(TRIM(description)) > 0),
    amount         NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    currency       TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD')),
    payment_method TEXT,
    -- NULL = joint; otherwise the partner it belongs to.
    owner_id       UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    salary_month   DATE,                            -- 1st of the month a salary is for
    notes          TEXT,
    -- Transfer details — what the bank statement shows.
    paid_from      TEXT,
    reference_no   TEXT,
    payee_account  TEXT,
    bank_narration TEXT,
    -- GST
    gst_applicable BOOLEAN NOT NULL DEFAULT FALSE,
    vendor_gstin   TEXT CHECK (vendor_gstin IS NULL
                     OR vendor_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
    invoice_no     TEXT,
    invoice_date   DATE,
    gst_rate       NUMERIC(5, 2) CHECK (gst_rate IS NULL OR gst_rate BETWEEN 0 AND 100),
    taxable_value  NUMERIC(14, 2) CHECK (taxable_value IS NULL OR taxable_value >= 0),
    gst_amount     NUMERIC(14, 2) CHECK (gst_amount IS NULL OR gst_amount >= 0),
    created_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- A salary or a personal expense is always ONE partner's.
    CONSTRAINT account_entries_per_person
        CHECK (category NOT IN ('salary', 'personal') OR owner_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_account_entries_date ON public.account_entries (entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_account_entries_category ON public.account_entries (category);
CREATE INDEX IF NOT EXISTS idx_account_entries_owner ON public.account_entries (owner_id);
CREATE INDEX IF NOT EXISTS idx_account_entries_salary_month
    ON public.account_entries (salary_month) WHERE category = 'salary';

-- A salary is for a month: normalise to the 1st, defaulting to the pay date's
-- month. Anything that isn't a salary carries none. GSTIN is kept upper-case.
CREATE OR REPLACE FUNCTION public.normalise_account_entry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.category = 'salary' THEN
        NEW.salary_month := DATE_TRUNC('month', COALESCE(NEW.salary_month, NEW.entry_date))::date;
    ELSE
        NEW.salary_month := NULL;
    END IF;
    NEW.vendor_gstin := NULLIF(UPPER(TRIM(NEW.vendor_gstin)), '');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_normalise_account_entry ON public.account_entries;
CREATE TRIGGER trigger_normalise_account_entry
    BEFORE INSERT OR UPDATE ON public.account_entries
    FOR EACH ROW EXECUTE FUNCTION public.normalise_account_entry();

DROP TRIGGER IF EXISTS trigger_account_entries_updated_at ON public.account_entries;
CREATE TRIGGER trigger_account_entries_updated_at
    BEFORE UPDATE ON public.account_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.account_files (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id     UUID NOT NULL REFERENCES public.account_entries(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,              -- object key in `account-files`
    mime_type    TEXT,
    file_size    BIGINT,
    uploaded_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_account_files_entry ON public.account_files (entry_id);

ALTER TABLE public.account_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_files   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_entries_partner ON public.account_entries;
CREATE POLICY account_entries_partner ON public.account_entries
    FOR ALL TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
DROP POLICY IF EXISTS account_files_partner ON public.account_files;
CREATE POLICY account_files_partner ON public.account_files
    FOR ALL TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());

-- ── 5. Table privileges ─────────────────────────────────────────────────────
-- Newer Supabase projects no longer grant new tables to the API roles by
-- default. Signed-in users get table access (RLS above decides which rows);
-- `anon` gets nothing — no workspace data is ever public.

REVOKE ALL ON public.profiles, public.task_boards, public.tasks, public.task_subtasks,
              public.task_comments, public.task_files, public.document_folders,
              public.documents, public.account_entries, public.account_files
    FROM anon;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.task_boards, public.tasks, public.task_subtasks, public.task_comments,
    public.task_files, public.document_folders, public.documents,
    public.account_entries, public.account_files
    TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_member(), public.is_partner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_member(), public.is_partner() TO authenticated;

-- ── 6. Storage ──────────────────────────────────────────────────────────────
-- Three private buckets, one gate each. Files open through short-lived signed
-- URLs; nothing is ever public.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
    ('task-files',        'task-files',        FALSE, 10485760),
    ('company-documents', 'company-documents', FALSE, 20971520),
    ('account-files',     'account-files',     FALSE, 10485760)
ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "workspace task files" ON storage.objects;
CREATE POLICY "workspace task files" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'task-files' AND public.is_member())
    WITH CHECK (bucket_id = 'task-files' AND public.is_member());

DROP POLICY IF EXISTS "workspace company documents" ON storage.objects;
CREATE POLICY "workspace company documents" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'company-documents' AND public.is_partner())
    WITH CHECK (bucket_id = 'company-documents' AND public.is_partner());

DROP POLICY IF EXISTS "workspace account files" ON storage.objects;
CREATE POLICY "workspace account files" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'account-files' AND public.is_partner())
    WITH CHECK (bucket_id = 'account-files' AND public.is_partner());

COMMIT;
