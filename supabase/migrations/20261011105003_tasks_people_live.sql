-- ============================================================================
-- Kavas workspace — dependencies, the activity trail, live updates, and the
-- last-partner guard.
-- ============================================================================
--   1. task_dependencies — "this task waits on that one", with a cycle guard.
--   2. task_events       — who changed what on a task. Append-only, written by
--                          triggers alone. Ported from the Conscious Cafe
--                          manager's task_events.
--   3. Profiles          — the workspace can never be left without an active
--                          partner (the Team page edits roles from the app now).
--   4. Realtime          — the task tables join `supabase_realtime`, so a board
--                          and an open task refresh when someone else edits them.
--
-- Idempotent, one transaction.
-- ============================================================================

BEGIN;

-- ── 1. Dependencies ─────────────────────────────────────────────────────────
-- "task_id waits on depends_on_task_id". Edges only. The constraint names are
-- spelled out because the client embeds through them by name.

CREATE TABLE IF NOT EXISTS public.task_dependencies (
    task_id            UUID NOT NULL,
    depends_on_task_id UUID NOT NULL,
    created_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (task_id, depends_on_task_id),
    CONSTRAINT task_dependencies_task_id_fkey
        FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
    CONSTRAINT task_dependencies_depends_on_task_id_fkey
        FOREIGN KEY (depends_on_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
    CONSTRAINT task_dependencies_no_self CHECK (task_id <> depends_on_task_id)
);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on
    ON public.task_dependencies (depends_on_task_id);

-- The CHECK stops A→A; this stops A→B→C→A, which would make any walk of the
-- graph loop forever. Walk forward from the proposed prerequisite: reaching the
-- task that is about to depend on it means the new edge closes a loop.
CREATE OR REPLACE FUNCTION public.guard_task_dependency_cycle()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF EXISTS (
        WITH RECURSIVE reachable(id) AS (
            SELECT NEW.depends_on_task_id
            UNION
            SELECT d.depends_on_task_id
            FROM task_dependencies d
            JOIN reachable r ON d.task_id = r.id
        )
        SELECT 1 FROM reachable WHERE id = NEW.task_id
    ) THEN
        RAISE EXCEPTION 'That would create a circular dependency'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_task_dependency_cycle ON public.task_dependencies;
CREATE TRIGGER trigger_guard_task_dependency_cycle
    BEFORE INSERT OR UPDATE ON public.task_dependencies
    FOR EACH ROW EXECUTE FUNCTION public.guard_task_dependency_cycle();

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_dependencies_all ON public.task_dependencies;
CREATE POLICY task_dependencies_all ON public.task_dependencies
    FOR ALL TO authenticated USING (public.is_member()) WITH CHECK (public.is_member());

-- ── 2. Activity ─────────────────────────────────────────────────────────────
-- Append-only. No policy lets a client INSERT, UPDATE or DELETE a row — a log
-- its subject can amend proves nothing — so the writers are SECURITY DEFINER.
--
-- `seq`, not `created_at`, is the order: NOW() is the transaction's start, so
-- one save that moves status and due date writes rows with the same stamp.
--
-- The actor's name is frozen at write time, so a line still reads truthfully
-- after the person is renamed or removed. Values are stored raw ('in_progress',
-- '2026-10-20'); the client owns the labels. The assignee is the exception —
-- resolved to a name here, because an id is not something anyone can read.

CREATE TABLE IF NOT EXISTS public.task_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seq        BIGSERIAL NOT NULL,
    task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    actor_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    action     TEXT NOT NULL,          -- created | updated | linked | unlinked
    field      TEXT,                   -- which field, for updated / linked
    from_value TEXT,
    to_value   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_events_task ON public.task_events (task_id, seq DESC);

CREATE OR REPLACE FUNCTION public.profile_name(p_id UUID)
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT COALESCE(NULLIF(TRIM(full_name), ''), email) FROM profiles WHERE id = p_id;
$$;

-- One writer, so the actor is resolved one way. A change made outside a login
-- (the SQL editor, a migration) has no auth.uid() and is logged as "System".
CREATE OR REPLACE FUNCTION public.write_task_event(
    p_task_id UUID, p_action TEXT, p_field TEXT DEFAULT NULL,
    p_from TEXT DEFAULT NULL, p_to TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    INSERT INTO task_events (task_id, actor_id, actor_name, action, field, from_value, to_value)
    VALUES (p_task_id,
            (SELECT id FROM profiles WHERE id = auth.uid()),
            COALESCE(public.profile_name(auth.uid()), 'System'),
            p_action, p_field, p_from, p_to);
END;
$$;

-- AFTER, so the log records what landed. stamp_task_completion() forces
-- progress to 100 on the way into done, which would log a second line nobody
-- did; the progress line is suppressed in exactly that case.
--
-- The field list is an allowlist. `sort_order` is left off on purpose: a drag
-- renumbers every card below it, and position in a column is not news.
-- When nothing on the list changed, nothing is written.
CREATE OR REPLACE FUNCTION public.log_task_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_into_done BOOLEAN;
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.write_task_event(NEW.id, 'created', NULL, NULL, NEW.title);
        RETURN NULL;
    END IF;

    v_into_done := (NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done');

    IF NEW.title IS DISTINCT FROM OLD.title THEN
        PERFORM public.write_task_event(NEW.id, 'updated', 'title', OLD.title, NEW.title);
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        PERFORM public.write_task_event(NEW.id, 'updated', 'status', OLD.status, NEW.status);
    END IF;
    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
        PERFORM public.write_task_event(NEW.id, 'updated', 'priority', OLD.priority, NEW.priority);
    END IF;
    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
        PERFORM public.write_task_event(NEW.id, 'updated', 'assignee',
            public.profile_name(OLD.assignee_id), public.profile_name(NEW.assignee_id));
    END IF;
    IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN
        PERFORM public.write_task_event(NEW.id, 'updated', 'start_date',
            OLD.start_date::TEXT, NEW.start_date::TEXT);
    END IF;
    IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
        PERFORM public.write_task_event(NEW.id, 'updated', 'due_date',
            OLD.due_date::TEXT, NEW.due_date::TEXT);
    END IF;
    IF NEW.progress IS DISTINCT FROM OLD.progress AND NOT v_into_done THEN
        PERFORM public.write_task_event(NEW.id, 'updated', 'progress',
            OLD.progress::TEXT, NEW.progress::TEXT);
    END IF;
    IF NEW.board_id IS DISTINCT FROM OLD.board_id THEN
        PERFORM public.write_task_event(NEW.id, 'updated', 'board',
            (SELECT name FROM task_boards WHERE id = OLD.board_id),
            (SELECT name FROM task_boards WHERE id = NEW.board_id));
    END IF;
    -- Notes are logged as "edited", never quoted: a long field twice over
    -- would bury every other line.
    IF NEW.description IS DISTINCT FROM OLD.description THEN
        PERFORM public.write_task_event(NEW.id, 'updated', 'description', NULL, NULL);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_task_change ON public.tasks;
CREATE TRIGGER trigger_log_task_change
    AFTER INSERT OR UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.log_task_change();

-- Links are logged on BOTH tasks: "we wait on them" is news on one, "they now
-- wait on us" on the other. The NULL checks matter: deleting a task cascades
-- its edges away, and logging against a task that is going would abort the
-- delete. A link removed because its task went is not news either.
CREATE OR REPLACE FUNCTION public.log_task_link()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_row   public.task_dependencies;
    v_act   TEXT;
    v_other TEXT;
    v_this  TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN v_row := NEW; v_act := 'linked';
    ELSE v_row := OLD; v_act := 'unlinked';
    END IF;
    SELECT title INTO v_other FROM tasks WHERE id = v_row.depends_on_task_id;
    SELECT title INTO v_this  FROM tasks WHERE id = v_row.task_id;
    IF v_other IS NULL OR v_this IS NULL THEN
        RETURN NULL;
    END IF;
    PERFORM public.write_task_event(v_row.task_id, v_act, 'waits_on', NULL, v_other);
    PERFORM public.write_task_event(v_row.depends_on_task_id, v_act, 'blocks', NULL, v_this);
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_task_link ON public.task_dependencies;
CREATE TRIGGER trigger_log_task_link
    AFTER INSERT OR DELETE ON public.task_dependencies
    FOR EACH ROW EXECUTE FUNCTION public.log_task_link();

ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_events_select ON public.task_events;
CREATE POLICY task_events_select ON public.task_events
    FOR SELECT TO authenticated USING (public.is_member());

-- ── 3. Profiles: never without a partner ────────────────────────────────────
-- Demoting or deactivating the last active partner would lock everyone out of
-- Documents, Accounts and the Team page, with no way back short of SQL.
CREATE OR REPLACE FUNCTION public.guard_last_partner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF OLD.role = 'partner' AND OLD.is_active
       AND (NEW.role <> 'partner' OR NOT NEW.is_active)
       AND NOT EXISTS (SELECT 1 FROM profiles
                       WHERE role = 'partner' AND is_active AND id <> OLD.id) THEN
        RAISE EXCEPTION 'The workspace needs at least one active partner'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_last_partner ON public.profiles;
CREATE TRIGGER trigger_guard_last_partner
    BEFORE UPDATE OF role, is_active ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_last_partner();

-- ── 4. Privileges ───────────────────────────────────────────────────────────

REVOKE ALL ON public.task_dependencies, public.task_events FROM anon;
GRANT SELECT, INSERT, DELETE ON public.task_dependencies TO authenticated;
GRANT SELECT ON public.task_events TO authenticated;

-- The writers run from triggers only; nobody calls them directly.
REVOKE EXECUTE ON FUNCTION public.write_task_event(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profile_name(UUID) FROM PUBLIC, anon, authenticated;

-- ── 5. Realtime ─────────────────────────────────────────────────────────────
-- Changes stream to signed-in clients, filtered by the same RLS as a SELECT.
-- Adding a table that is already published is an error, so each is checked;
-- and a database without the publication (a bare Postgres) is left alone.
DO $$
DECLARE
    t TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        RETURN;
    END IF;
    FOREACH t IN ARRAY ARRAY['task_boards', 'tasks', 'task_subtasks', 'task_comments',
                             'task_files', 'task_dependencies', 'task_events'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END;
$$;

COMMIT;
