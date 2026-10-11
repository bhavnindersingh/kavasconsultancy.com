-- ============================================================================
-- Kavas workspace — Tasks and Documents rules brought in line with the
-- Conscious Cafe manager.
-- ============================================================================
--   1. Boards     — a colour per board; names unique (case-insensitive);
--                   only a partner may set or change who signs a board off.
--   2. Sign-off   — on a board with an owner, only that owner may move a task
--                   INTO done. No partner exemption: the owner is the one who
--                   approves the work, which is the point of naming one.
--   3. Comments   — the author can edit their own (stamped `edited_at`); the
--                   author is taken from the login, never from the client.
--   4. Documents  — folders nest five levels deep at most; a folder can be
--                   deleted with everything in it, in one transaction.
--
-- Idempotent, one transaction.
-- ============================================================================

BEGIN;

-- ── 1. Boards ───────────────────────────────────────────────────────────────

ALTER TABLE public.task_boards
    ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#26532b';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_boards_color_hex') THEN
        ALTER TABLE public.task_boards
            ADD CONSTRAINT task_boards_color_hex CHECK (color ~ '^#[0-9a-fA-F]{6}$');
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_task_boards_name
    ON public.task_boards (LOWER(TRIM(name)));

-- Who signs a board off is a partner's call. A change made outside a login
-- (the SQL editor, a migration) is allowed.
CREATE OR REPLACE FUNCTION public.guard_task_board_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_partner()
       AND NEW.owner_id IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.owner_id ELSE NULL END) THEN
        RAISE EXCEPTION 'Only a partner can change who signs off this board''s work'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_task_board_owner ON public.task_boards;
CREATE TRIGGER trigger_guard_task_board_owner
    BEFORE INSERT OR UPDATE OF owner_id ON public.task_boards
    FOR EACH ROW EXECUTE FUNCTION public.guard_task_board_owner();

-- ── 2. Sign-off: the owner alone ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.guard_task_sign_off()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    board_owner UUID;
BEGIN
    -- Only the move INTO done is gated; reopening or editing a done task isn't.
    IF NEW.status <> 'done' OR (TG_OP = 'UPDATE' AND OLD.status = 'done') THEN
        RETURN NEW;
    END IF;
    SELECT owner_id INTO board_owner FROM task_boards WHERE id = NEW.board_id;
    IF board_owner IS NULL OR board_owner = auth.uid() OR auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Work on this board is signed off by %. Move it to Quality Check and it will reach them.',
        COALESCE(public.profile_name(board_owner), 'its owner')
        USING ERRCODE = '42501';
END;
$$;

-- ── 3. Comments: edit your own ──────────────────────────────────────────────

ALTER TABLE public.task_comments
    ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- The author is the login, whatever the client sent; it never changes after.
-- An edit stamps edited_at.
CREATE OR REPLACE FUNCTION public.stamp_task_comment()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF auth.uid() IS NOT NULL THEN
            NEW.author_id := auth.uid();
        END IF;
        NEW.edited_at := NULL;
    ELSE
        NEW.author_id := OLD.author_id;
        NEW.created_at := OLD.created_at;
        IF NEW.body IS DISTINCT FROM OLD.body THEN
            NEW.edited_at := NOW();
        ELSE
            NEW.edited_at := OLD.edited_at;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_stamp_task_comment ON public.task_comments;
CREATE TRIGGER trigger_stamp_task_comment
    BEFORE INSERT OR UPDATE ON public.task_comments
    FOR EACH ROW EXECUTE FUNCTION public.stamp_task_comment();

DROP POLICY IF EXISTS task_comments_insert ON public.task_comments;
CREATE POLICY task_comments_insert ON public.task_comments
    FOR INSERT TO authenticated WITH CHECK (public.is_member());

DROP POLICY IF EXISTS task_comments_update ON public.task_comments;
CREATE POLICY task_comments_update ON public.task_comments
    FOR UPDATE TO authenticated
    USING (public.is_member() AND author_id = auth.uid())
    WITH CHECK (public.is_member() AND author_id = auth.uid());

-- ── 4. Documents ────────────────────────────────────────────────────────────

-- Five levels at most: a new or moved folder may have at most four ancestors.
-- (Moving a subtree can carry its own children past five; the cap is checked
-- on the row being written, as in the manager.)
CREATE OR REPLACE FUNCTION public.guard_document_folder_cycle()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    cursor_id UUID := NEW.parent_id;
    ancestors INTEGER := 0;
BEGIN
    WHILE cursor_id IS NOT NULL LOOP
        IF cursor_id = NEW.id THEN
            RAISE EXCEPTION 'A folder cannot be moved inside one of its own subfolders'
                USING ERRCODE = 'check_violation';
        END IF;
        ancestors := ancestors + 1;
        IF ancestors > 4 THEN
            RAISE EXCEPTION 'Folders can only nest five levels deep'
                USING ERRCODE = 'check_violation';
        END IF;
        SELECT parent_id INTO cursor_id FROM document_folders WHERE id = cursor_id;
    END LOOP;
    RETURN NEW;
END;
$$;

-- Deletes a folder, its subfolders and every document in them, in one
-- transaction, and returns the storage keys so the caller can sweep the files.
-- SECURITY INVOKER: it runs under the caller's RLS, so a member deletes
-- nothing. Folders go deepest first because parent_id is ON DELETE RESTRICT.
CREATE OR REPLACE FUNCTION public.delete_document_folder_tree(p_folder UUID)
RETURNS SETOF TEXT LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
    tree_ids UUID[];
    depths   INTEGER[];
    lvl      INTEGER;
BEGIN
    IF NOT public.is_partner() THEN
        RAISE EXCEPTION 'Only a partner can delete folders' USING ERRCODE = '42501';
    END IF;

    WITH RECURSIVE tree(id, depth) AS (
        SELECT f.id, 0 FROM document_folders f WHERE f.id = p_folder
        UNION ALL
        SELECT c.id, t.depth + 1 FROM document_folders c JOIN tree t ON c.parent_id = t.id
        WHERE t.depth < 32
    )
    SELECT array_agg(id), array_agg(depth) INTO tree_ids, depths FROM tree;

    IF tree_ids IS NULL THEN
        RAISE EXCEPTION 'That folder no longer exists' USING ERRCODE = 'no_data_found';
    END IF;

    RETURN QUERY
        DELETE FROM documents d WHERE d.folder_id = ANY (tree_ids) RETURNING d.storage_path;

    FOR lvl IN SELECT DISTINCT x FROM unnest(depths) AS x ORDER BY x DESC LOOP
        DELETE FROM document_folders f
        WHERE f.id IN (SELECT t.i FROM unnest(tree_ids, depths) AS t(i, d) WHERE t.d = lvl);
    END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_document_folder_tree(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_document_folder_tree(UUID) TO authenticated;

COMMIT;
