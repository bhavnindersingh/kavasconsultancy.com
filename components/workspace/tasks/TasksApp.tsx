"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notifyReadyForSignOff } from "@/app/(workspace)/workspace/(app)/tasks/actions";
import { errorText, removeObjects } from "@/lib/workspace/files";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import { NO_FILTERS, applyFilters, filtersActive, moveInOrder, waitingOn, type Stub, type TaskFilters } from "@/lib/workspace/tasks";
import type { Zoom } from "@/lib/workspace/timeline";
import { BOARD_COLORS, type Task, type TaskBoard, type TaskDependency, type TaskStatus } from "@/lib/workspace/types";
import { changed, useLive } from "@/lib/workspace/useLive";
import { useWorkspace } from "../WorkspaceContext";
import BoardRail from "./BoardRail";
import BoardView, { type Checklist } from "./BoardView";
import GanttView from "./GanttView";
import ListView from "./ListView";
import PersonView from "./PersonView";
import TaskDrawer, { type DrawerTarget } from "./TaskDrawer";
import { Disc, LATE, daysUntilDue, today } from "./bits";

// The task board, as in the Conscious Cafe manager: a rail of boards on the
// left (its order is the priority), the open board — or one person's work
// across every board — on the right. The page opens on My work.

type BoardTab = "board" | "list" | "timeline";
type PersonTab = "list" | "timeline";
type Banner = { kind: "ok" | "error"; text: string } | null;
type Row = Task & { task_subtasks?: { title: string; is_done: boolean }[] };

export default function TasksApp({ initialTaskId = null }: { initialTaskId?: string | null }) {
  const { me, people, nameOf } = useWorkspace();
  const supabase = supabaseBrowser();
  const isPartner = me.role === "partner";

  const [boards, setBoards] = useState<TaskBoard[]>([]);
  const [boardsLoaded, setBoardsLoaded] = useState(false);
  const [mode, setMode] = useState<"person" | "board">("person");
  const [boardId, setBoardId] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string>(me.id); // "none" = Nobody yet
  const [boardTab, setBoardTab] = useState<BoardTab>("board");
  const [personTab, setPersonTab] = useState<PersonTab>("list");
  const [zoom, setZoom] = useState<Zoom>("day");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [deps, setDeps] = useState<TaskDependency[]>([]);
  const [stubs, setStubs] = useState<Stub[]>([]);
  const [checklists, setChecklists] = useState<Map<string, Checklist>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TaskFilters>(NO_FILTERS);
  const [drawer, setDrawer] = useState<{ target: DrawerTarget; boardId: string } | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const writing = useRef(false);
  const loadToken = useRef(0);

  const say = (text: string, kind: "ok" | "error" = "ok") => setBanner({ kind, text });
  useEffect(() => {
    if (banner?.kind !== "ok") return;
    const t = setTimeout(() => setBanner(null), 3000);
    return () => clearTimeout(t);
  }, [banner]);

  const board = boards.find((b) => b.id === boardId) ?? null;
  const liveBoards = useMemo(() => boards.filter((b) => !b.is_archived), [boards]);
  const boardNames = useMemo(() => new Map(boards.map((b) => [b.id, b.name])), [boards]);

  // ── Loading ──────────────────────────────────────────────────────────────

  const loadBoards = useCallback(async () => {
    const { data, error } = await supabase
      .from("task_boards")
      .select("*, open:tasks(count)")
      .neq("open.status", "done")
      .order("is_archived")
      .order("sort_order")
      .order("name");
    if (error) return say(error.message, "error");
    const list = ((data ?? []) as (TaskBoard & { open?: { count: number }[] })[]).map(({ open, ...b }) => ({ ...b, open_count: open?.[0]?.count }));
    setBoards(list);
    setBoardsLoaded(true);
  }, [supabase]);

  const liveIds = liveBoards.map((b) => b.id).join(",");
  const loadTasks = useCallback(async () => {
    const token = ++loadToken.current;
    let q = supabase.from("tasks").select("*, task_subtasks(title, is_done, sort_order)");
    if (mode === "board") {
      if (!boardId) return;
      q = q.eq("board_id", boardId).order("sort_order").order("created_at");
    } else {
      if (!boardsLoaded) return;
      const ids = liveIds ? liveIds.split(",") : [];
      if (!ids.length) {
        setTasks([]);
        setDeps([]);
        setLoading(false);
        return;
      }
      q = (personId === "none" ? q.is("assignee_id", null) : q.eq("assignee_id", personId))
        .in("board_id", ids)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at");
    }
    const { data, error } = await q;
    if (token !== loadToken.current) return; // a newer load is on its way
    if (error) return say(error.message, "error");
    const rows = (data ?? []) as Row[];
    const lists = new Map<string, Checklist>();
    const clean = rows.map(({ task_subtasks, ...t }) => {
      const steps = [...(task_subtasks ?? [])].sort((a, b) => ((a as { sort_order?: number }).sort_order ?? 0) - ((b as { sort_order?: number }).sort_order ?? 0));
      if (steps.length) lists.set(t.id, { total: steps.length, done: steps.filter((s) => s.is_done).length, open: steps.filter((s) => !s.is_done).map((s) => s.title) });
      return t as Task;
    });
    const ids = clean.map((t) => t.id);
    let links: TaskDependency[] = [];
    let extra: Stub[] = [];
    if (ids.length) {
      const { data: d } = await supabase.from("task_dependencies").select("task_id, depends_on_task_id").in("task_id", ids);
      links = (d ?? []) as TaskDependency[];
      // Prerequisites on other boards, so "Waiting on" is right everywhere.
      const missing = [...new Set(links.map((l) => l.depends_on_task_id).filter((x) => !ids.includes(x)))];
      if (missing.length) extra = ((await supabase.from("tasks").select("id, title, status").in("id", missing)).data ?? []) as Stub[];
    }
    if (token !== loadToken.current) return;
    setTasks(clean);
    setChecklists(lists);
    setDeps(links);
    setStubs(extra);
    setLoading(false);
  }, [supabase, mode, boardId, personId, boardsLoaded, liveIds]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    loadBoards();
  }, [loadBoards]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on board/person/mode change
    loadTasks();
  }, [loadTasks]);

  // Coming back to the tab refetches; so does someone else's change.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible" && !writing.current) {
        loadBoards();
        loadTasks();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadBoards, loadTasks]);
  useLive("boards", ["task_boards"], () => true, loadBoards);
  useLive(
    `tasks-${mode}-${boardId ?? personId}`,
    ["tasks", "task_dependencies", "task_subtasks"],
    (c) => {
      const inSet = (id: unknown) => tasks.some((t) => t.id === id);
      if (c.table === "task_dependencies") return inSet(changed(c, "task_id")) || inSet(changed(c, "depends_on_task_id"));
      if (c.table === "task_subtasks") return inSet(changed(c, "task_id"));
      if (inSet(changed(c, "id"))) return true;
      return mode === "board" ? changed(c, "board_id") === boardId : changed(c, "assignee_id") === (personId === "none" ? null : personId);
    },
    () => {
      if (writing.current) return;
      loadTasks();
      loadBoards();
    },
  );

  // Opened from an email link: switch to the task's board and open it.
  useEffect(() => {
    if (!initialTaskId) return;
    let cancelled = false;
    supabase
      .from("tasks")
      .select("id, board_id")
      .eq("id", initialTaskId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data) return say("That task no longer exists.", "error");
        setMode("board");
        setBoardId(data.board_id);
        setDrawer({ target: { kind: "edit", id: data.id }, boardId: data.board_id });
      });
    window.history.replaceState(null, "", window.location.pathname);
    return () => {
      cancelled = true;
    };
  }, [initialTaskId, supabase]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const todayIso = today();
  const visible = useMemo(() => applyFilters(tasks, filters, todayIso), [tasks, filters, todayIso]);
  const lookup = useMemo(() => new Map<string, Stub>([...stubs, ...tasks].map((t) => [t.id, t])), [tasks, stubs]);
  const waiting = useMemo(() => waitingOn(deps, lookup), [deps, lookup]);
  const open = tasks.filter((t) => t.status !== "done");
  const stats = {
    open: open.length,
    done: tasks.length - open.length,
    soon: open.filter((t) => {
      const d = daysUntilDue(t);
      return d !== null && d >= 0 && d <= 7;
    }).length,
    overdue: open.filter((t) => t.due_date && t.due_date < todayIso).length,
    undated: open.filter((t) => !t.due_date).length,
  };
  const narrowed = filtersActive(filters);
  const personLabel = personId === me.id ? "My work" : personId === "none" ? "Nobody’s work" : `${nameOf(personId).split(" ")[0]}’s work`;

  // ── Boards ───────────────────────────────────────────────────────────────

  const boardError = (msg: string, name?: string) =>
    say(msg.includes("uq_task_boards_name") || msg.includes("duplicate") ? `A board called "${name}" already exists.` : msg, "error");

  async function createBoard(name: string) {
    if (!name.trim()) {
      say("Give the board a name.", "error");
      return false;
    }
    const next = Math.max(0, ...liveBoards.map((b) => b.sort_order)) + 1;
    const { data, error } = await supabase.from("task_boards").insert({ name: name.trim(), sort_order: next }).select().single();
    if (error) {
      boardError(error.message, name.trim());
      return false;
    }
    await loadBoards();
    setMode("board");
    setBoardId((data as TaskBoard).id);
    setBoardTab("board");
    say(`Board "${name.trim()}" created.`);
    return true;
  }

  async function updateBoard(b: TaskBoard, patch: Partial<TaskBoard>, label?: string) {
    setBoards((all) => all.map((x) => (x.id === b.id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("task_boards").update(patch).eq("id", b.id);
    if (error) {
      loadBoards();
      boardError(error.message, (patch.name as string) ?? b.name);
      return false;
    }
    if (label) say(label);
    return true;
  }

  async function archiveBoard(b: TaskBoard) {
    if (await updateBoard(b, { is_archived: true }, `"${b.name}" archived. It’s under Archived at the foot of the rail.`)) loadBoards();
  }

  async function restoreBoard(b: TaskBoard) {
    if (await updateBoard(b, { is_archived: false }, `"${b.name}" is back.`)) loadBoards();
  }

  async function deleteBoard(b: TaskBoard) {
    // Re-count on the server: the rail's number may be stale.
    const { count } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("board_id", b.id).neq("status", "done");
    if (count) {
      return say(
        `"${b.name}" still has ${count} unfinished task${count === 1 ? "" : "s"}. Finish them, or archive the board instead — archiving keeps everything and can be undone.`,
        "error",
      );
    }
    const { data: files } = await supabase.from("task_files").select("storage_path, task:tasks!inner(board_id)").eq("task.board_id", b.id);
    const { data, error } = await supabase.from("task_boards").delete().eq("id", b.id).select("id");
    if (error) return say(error.message, "error");
    if (!data?.length) return say("Only the board’s owner, its creator or a partner can delete it.", "error");
    await removeObjects("task-files", (files ?? []).map((f) => f.storage_path));
    if (boardId === b.id) {
      setBoardId(null);
      setMode("person");
    }
    say(`"${b.name}" deleted.`);
    loadBoards();
  }

  async function moveBoard(b: TaskBoard, dir: -1 | 1) {
    const next = moveInOrder(liveBoards, b.id, dir);
    if (!next) return;
    const renumbered = next.map((x, i) => ({ ...x, sort_order: i + 1 }));
    const changedRows = renumbered.filter((x) => liveBoards.find((y) => y.id === x.id)?.sort_order !== x.sort_order);
    setBoards((all) => [...renumbered, ...all.filter((x) => x.is_archived)]);
    // One at a time; the first failure abandons the rest and reloads.
    for (const row of changedRows) {
      const { error } = await supabase.from("task_boards").update({ sort_order: row.sort_order }).eq("id", row.id);
      if (error) {
        say(error.message, "error");
        break;
      }
    }
    loadBoards();
  }

  async function setOwner(ownerId: string | null) {
    if (!board) return;
    if (!isPartner) return say("Only a partner can change who signs off this board’s work.", "error");
    updateBoard(board, { owner_id: ownerId });
  }

  // ── Tasks ────────────────────────────────────────────────────────────────

  /** Move a task to `status`, landing before `beforeId` (or at the end), against the FULL column. */
  async function moveTask(taskId: string, status: TaskStatus, beforeId: string | null) {
    const moving = tasks.find((t) => t.id === taskId);
    if (!moving || taskId === beforeId) return;
    const prev = tasks;
    setBanner(null);
    writing.current = true;
    try {
      if (status === "done") {
        // Done is a log: only the status is written, nothing renumbered.
        if (moving.status === "done") return;
        setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status } : t)));
        const { data, error } = await supabase.from("tasks").update({ status }).eq("id", taskId).select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("That task could not be found. The move was not saved.");
      } else {
        const column = tasks.filter((t) => t.status === status && t.id !== taskId).sort((a, b) => a.sort_order - b.sort_order);
        const at = beforeId ? column.findIndex((t) => t.id === beforeId) : column.length;
        column.splice(at < 0 ? column.length : at, 0, { ...moving, status });
        const updates = column.map((t, i) => ({ ...t, sort_order: i + 1 }));
        setTasks((ts) => ts.map((t) => updates.find((u) => u.id === t.id) ?? t));
        if (moving.status !== status) {
          const { data, error } = await supabase.from("tasks").update({ status }).eq("id", taskId).select("id");
          if (error) throw error;
          if (!data?.length) throw new Error("That task could not be found. The move was not saved.");
        }
        const changedOrder = updates.filter((u) => prev.find((p) => p.id === u.id)?.sort_order !== u.sort_order);
        const results = await Promise.all(changedOrder.map((u) => supabase.from("tasks").update({ sort_order: u.sort_order }).eq("id", u.id).select("id")));
        if (results.some((r) => r.error || !r.data?.length)) throw new Error("Only part of that move was saved — the board has been reloaded.");
      }
      if (status === "quality_check" && moving.status !== status) notifyReadyForSignOff(taskId).catch(() => {});
    } catch (e) {
      setTasks(prev);
      say(errorText(e), "error");
    } finally {
      writing.current = false;
      if (moving.status !== status || status !== "done") loadTasks();
    }
  }

  async function rescheduleTask(taskId: string, dates: Pick<Task, "start_date" | "due_date">) {
    const prev = tasks;
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, ...dates } : t)));
    const { error } = await supabase.from("tasks").update(dates).eq("id", taskId);
    if (error) {
      setTasks(prev);
      say(error.message, "error");
    }
  }

  const openTask = (t: Pick<Task, "id" | "board_id">) => setDrawer({ target: { kind: "edit", id: t.id }, boardId: t.board_id });
  const newTask = (status: TaskStatus, title: string) => board && setDrawer({ target: { kind: "new", status, title }, boardId: board.id });
  const drawerBoard = drawer ? boards.find((b) => b.id === drawer.boardId) : null;

  // ── Render ───────────────────────────────────────────────────────────────

  const awaitingPerson = mode === "person" && (!boardsLoaded || loading);
  const allDone = mode === "board" && board && !board.is_archived && !loading && tasks.length > 0 && stats.open === 0;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Tasks</h1>
          <p className="mt-1 text-sm text-mute">Work that spans days and people — engagements, filings, launches.</p>
        </div>
        {(mode === "person" || board) && !loading && (
          <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Stat n={stats.open} label="open" />
            {mode === "board" ? <Stat n={stats.done} label="done" /> : <Stat n={stats.soon} label="due in 7 days" />}
            {stats.overdue > 0 && (
              <button
                className={`rounded-full px-2.5 py-0.5 ${filters.overdueOnly ? "bg-[#fef3f2] ring-1 ring-[#f4b8b2]" : "hover:bg-[#fef3f2]"}`}
                style={{ color: LATE }}
                title={filters.overdueOnly ? "Show everything again" : "Show only what is overdue"}
                onClick={() => setFilters((f) => ({ ...f, overdueOnly: !f.overdueOnly, noDeadline: false }))}
              >
                <strong>{stats.overdue}</strong> overdue
              </button>
            )}
            {stats.undated > 0 && (
              <button
                className={`rounded-full px-2.5 py-0.5 text-body ${filters.noDeadline ? "bg-cream ring-1 ring-ghost" : "hover:bg-cream"}`}
                title={filters.noDeadline ? "Show everything again" : "Show only the work with no deadline"}
                onClick={() => setFilters((f) => ({ ...f, noDeadline: !f.noDeadline, overdueOnly: false }))}
              >
                <strong>{stats.undated}</strong> with no deadline
              </button>
            )}
          </dl>
        )}
      </header>

      {banner && (
        <p
          className={`mb-4 flex items-start gap-3 rounded-lg px-3 py-2 text-sm ${banner.kind === "error" ? "bg-[#fef3f2] text-[#b42318]" : "bg-[#ecfdf3] text-[#067647]"}`}
          role={banner.kind === "error" ? "alert" : "status"}
        >
          <span className="flex-1">{banner.text}</span>
          <button aria-label="Dismiss" onClick={() => setBanner(null)}>✕</button>
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
        <BoardRail
          boards={boards}
          activeId={boardId}
          personMode={mode === "person"}
          personLabel={personLabel}
          onPerson={() => setMode("person")}
          onSelect={(id) => {
            setMode("board");
            setBoardId(id);
            setColorOpen(false);
            setEditingDesc(false);
          }}
          onCreate={createBoard}
          onRename={(b, name) => updateBoard(b, { name })}
          onArchive={archiveBoard}
          onRestore={restoreBoard}
          onDelete={deleteBoard}
          onMove={moveBoard}
        />

        <section className="min-w-0">
          {mode === "board" && !board && (
            <div className="rounded-2xl border border-dashed border-ghost p-10 text-center">
              <p className="mb-2 font-serif text-2xl">No board open</p>
              <p className="mx-auto max-w-md text-body">
                A board is a project: “Client onboarding”, “Compliance”, “Q3 launch”. Create one on the left, then add the tasks it takes.
              </p>
            </div>
          )}

          {mode === "person" && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
              <Disc id={personId === "none" ? null : personId} name={personId === "none" ? null : nameOf(personId)} size={32} />
              <label className="text-sm text-mute" htmlFor="tk-person">Showing</label>
              <select id="tk-person" className="ws-input !w-auto" value={personId} onChange={(e) => setPersonId(e.target.value)}>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                    {p.id === me.id ? " (you)" : ""}
                  </option>
                ))}
                <option value="none">Nobody yet</option>
              </select>
              <span className="text-sm text-mute">Every board, in the order it has to happen.</span>
            </div>
          )}

          {mode === "board" && board && (
            <BoardBar
              board={board}
              isPartner={isPartner}
              colorOpen={colorOpen}
              setColorOpen={setColorOpen}
              editingDesc={editingDesc}
              setEditingDesc={setEditingDesc}
              onUpdate={(patch) => updateBoard(board, patch)}
              onOwner={setOwner}
            />
          )}

          {allDone && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#ecfdf3] px-4 py-3 text-sm text-[#067647]">
              <span>{tasks.length === 1 ? "The only task on this board is done." : `All ${tasks.length} tasks on this board are done.`}</span>
              <button className="ws-btn" onClick={() => board && archiveBoard(board)}>Archive this board</button>
            </div>
          )}

          {(mode === "person" || board) && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-full border border-line bg-card p-0.5" role="tablist">
                  {(mode === "board"
                    ? ([["board", "Board"], ["list", "List"], ["timeline", "Timeline"]] as const)
                    : ([["list", "My work"], ["timeline", "Timeline"]] as const)
                  ).map(([v, label]) => {
                    const on = mode === "board" ? boardTab === v : personTab === v;
                    return (
                      <button
                        key={v}
                        role="tab"
                        aria-selected={on}
                        onClick={() => (mode === "board" ? setBoardTab(v as BoardTab) : setPersonTab(v as PersonTab))}
                        className={`rounded-full px-3 py-1 text-sm ${on ? "bg-ink text-paper" : ""}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <input
                  className="ws-input !w-52"
                  placeholder="Search tasks…"
                  aria-label="Search tasks"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  onKeyDown={(e) => e.key === "Escape" && setFilters((f) => ({ ...f, search: "" }))}
                />
                {mode === "board" && (
                  <select className="ws-input !w-auto" value={filters.owner} onChange={(e) => setFilters((f) => ({ ...f, owner: e.target.value }))} aria-label="Owner">
                    <option value="">Everyone</option>
                    <option value="none">Nobody yet</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.email}
                        {p.id === me.id ? " (you)" : ""}
                      </option>
                    ))}
                  </select>
                )}
                <Toggle on={filters.overdueOnly} onClick={() => setFilters((f) => ({ ...f, overdueOnly: !f.overdueOnly, noDeadline: false }))}>Overdue only</Toggle>
                <Toggle on={filters.noDeadline} onClick={() => setFilters((f) => ({ ...f, noDeadline: !f.noDeadline, overdueOnly: false }))}>No deadline</Toggle>
                <Toggle on={filters.showDone} onClick={() => setFilters((f) => ({ ...f, showDone: !f.showDone }))}>Show done</Toggle>
                {mode === "board" && (
                  <button className="ws-btn ws-btn--primary ml-auto" onClick={() => newTask("todo", "")}>New task</button>
                )}
              </div>

              {narrowed && tasks.length > 0 && visible.length > 0 && (
                <p className="mb-3 text-sm text-mute">
                  Showing {visible.length} of {tasks.length} tasks.{" "}
                  <button className="underline" onClick={() => setFilters(NO_FILTERS)}>Clear filters</button>
                </p>
              )}

              {awaitingPerson || (mode === "board" && loading) ? (
                <p className="text-mute">Loading tasks…</p>
              ) : narrowed && tasks.length > 0 && visible.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ghost p-8 text-center">
                  <p className="mb-1 font-serif text-xl">No tasks match</p>
                  <p className="mb-4 text-body">
                    All {tasks.length} tasks {mode === "board" ? "on this board are" : "assigned to this person are"} hidden by the filters above.
                  </p>
                  <button className="ws-btn" onClick={() => setFilters(NO_FILTERS)}>Clear filters</button>
                </div>
              ) : mode === "person" ? (
                tasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-ghost p-8 text-center">
                    <p className="mb-1 font-serif text-xl">Nothing assigned</p>
                    <p className="text-body">No task on any board has this person as its owner. Open a board and set an owner on the tasks they are carrying.</p>
                  </div>
                ) : personTab === "list" ? (
                  <PersonView tasks={visible} waiting={waiting} boardNames={boardNames} onOpen={openTask} />
                ) : (
                  <GanttView tasks={visible} deps={deps} waiting={waiting} zoom={zoom} onZoom={setZoom} boardNames={boardNames} onOpen={(id) => openTask(tasks.find((t) => t.id === id)!)} onReschedule={rescheduleTask} />
                )
              ) : boardTab === "board" ? (
                <BoardView tasks={visible} waiting={waiting} checklists={checklists} onOpen={(id) => board && openTask({ id, board_id: board.id })} onNew={newTask} onMove={moveTask} filtered={narrowed} />
              ) : boardTab === "list" ? (
                <ListView tasks={visible} waiting={waiting} onOpen={(id) => board && openTask({ id, board_id: board.id })} />
              ) : (
                <GanttView tasks={visible} deps={deps} waiting={waiting} zoom={zoom} onZoom={setZoom} onOpen={(id) => board && openTask({ id, board_id: board.id })} onReschedule={rescheduleTask} />
              )}
            </>
          )}
        </section>
      </div>

      {drawer && drawerBoard && (
        <TaskDrawer
          key={drawer.target.kind === "edit" ? drawer.target.id : "new"}
          target={drawer.target}
          board={drawerBoard}
          onClose={() => setDrawer(null)}
          onSaved={(t, created) => {
            loadTasks();
            loadBoards();
            if (created) {
              say("Task created.");
              setDrawer({ target: { kind: "edit", id: t.id }, boardId: t.board_id });
            } else setDrawer(null);
          }}
          onDeleted={() => {
            setDrawer(null);
            say("Task deleted.");
            loadTasks();
            loadBoards();
          }}
        />
      )}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <span className="text-body">
      <strong className="text-ink">{n}</strong> {label}
    </span>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`ws-btn !py-1.5 ${on ? "!border-ink !bg-ink !text-paper" : ""}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

function BoardBar({
  board,
  isPartner,
  colorOpen,
  setColorOpen,
  editingDesc,
  setEditingDesc,
  onUpdate,
  onOwner,
}: {
  board: TaskBoard;
  isPartner: boolean;
  colorOpen: boolean;
  setColorOpen: (v: boolean) => void;
  editingDesc: boolean;
  setEditingDesc: (v: boolean) => void;
  onUpdate: (patch: Partial<TaskBoard>) => void;
  onOwner: (id: string | null) => void;
}) {
  const { me, people } = useWorkspace();
  return (
    <div className="mb-4 flex flex-wrap items-start gap-x-6 gap-y-3 rounded-2xl border border-line bg-card px-4 py-3">
      <div className="flex min-w-0 flex-1 basis-72 items-start gap-3">
        <span className="relative mt-1">
          <button className="block size-5 rounded-full ring-1 ring-line" style={{ background: board.color }} title="Board colour" aria-label="Board colour" aria-expanded={colorOpen} onClick={() => setColorOpen(!colorOpen)} />
          {colorOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setColorOpen(false)} />
              <div className="absolute left-0 top-7 z-40 grid grid-cols-4 gap-2 rounded-xl border border-line bg-card p-3 shadow-xl">
                {BOARD_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`size-6 rounded-full ${board.color === c ? "ring-2 ring-ink ring-offset-2" : ""}`}
                    style={{ background: c }}
                    aria-label={`Colour ${c}`}
                    aria-pressed={board.color === c}
                    onClick={() => {
                      setColorOpen(false);
                      if (board.color !== c) onUpdate({ color: c });
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-xl leading-tight">
            {board.name}
            {board.is_archived && <span className="ml-2 text-sm italic text-mute">archived</span>}
          </h2>
          {editingDesc ? (
            <input
              autoFocus
              className="ws-input mt-1 !py-1 text-sm"
              placeholder="What is this board for?"
              defaultValue={board.description ?? ""}
              onBlur={(e) => {
                setEditingDesc(false);
                const v = e.target.value.trim() || null;
                if (v !== (board.description ?? null)) onUpdate({ description: v });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingDesc(false);
              }}
            />
          ) : (
            <button className={`mt-0.5 text-left text-sm ${board.description ? "text-body" : "text-mute"}`} onClick={() => setEditingDesc(true)}>
              {board.description || "Add a description"}
            </button>
          )}
        </div>
      </div>
      <div className="min-w-56">
        <label className="ws-label" htmlFor="tk-owner">Board owner</label>
        <select
          id="tk-owner"
          className={`ws-input ${isPartner ? "" : "opacity-60"}`}
          aria-disabled={!isPartner}
          value={board.owner_id ?? ""}
          onChange={(e) => onOwner(e.target.value || null)}
        >
          <option value="">No owner</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name || p.email}
              {p.id === me.id ? " (you)" : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-mute">
          Approves finished work on this board.{!isPartner && " Only a partner can change this."}
        </p>
      </div>
    </div>
  );
}
