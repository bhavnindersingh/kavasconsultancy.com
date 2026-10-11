-- ============================================================================
-- Kavas workspace — email preferences.
-- ============================================================================
-- Two switches per person, both on by default, both theirs to change from
-- My account (profiles_update already lets a person edit their own row; the
-- role guard only watches role, is_active and email).
--
--   email_notifications — "assigned to you", "new comment on your task",
--                         "ready for your sign-off".
--   email_digest        — the morning summary of overdue and due-today work.
--
-- Sign-in emails (invites, password resets) ignore both: they are how a person
-- gets in, not news about the work.
--
-- Also grants the workspace tables to `service_role`. Newer Supabase projects
-- don't, and the morning digest (app/api/cron/digest) reads them with the
-- secret key. RLS doesn't apply to service_role; the grant is the only gate.
--
-- Idempotent, one transaction.
-- ============================================================================

BEGIN;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS email_digest        BOOLEAN NOT NULL DEFAULT TRUE;

GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.profiles, public.task_boards, public.tasks, public.task_subtasks,
    public.task_comments, public.task_files, public.task_dependencies,
    public.document_folders, public.documents, public.account_entries,
    public.account_files
    TO service_role;
GRANT SELECT ON public.task_events TO service_role;

COMMIT;
