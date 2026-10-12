"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notifyReadyForSignOff } from "@/app/(workspace)/workspace/(app)/tasks/actions";
import { errorText, removeObjects } from "@/lib/workspace/files";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import { NO_FILTERS, applyFilters, filtersActive, moveInOrder, waitingOn, type Stub, type TaskFilters } from "@/lib/workspace/tasks";
import type { Zoom } from "@/lib/workspace/timeline";
import { BOARD_COLORS, STATUS_LABEL, type Task, type TaskBoard, type TaskDependency, type TaskStatus } from "@/lib/workspace/types";
import { changed, useLive } from "@/lib/workspace/useLive";
import { useWorkspace } from "../WorkspaceContext";
import BoardRail from "./BoardRail";
import BoardView, { type Checklist } from "./BoardView";
import GanttView from "./GanttView";
import ListView from "./ListView";
import PersonView from "./PersonView";
import TaskDrawer, { type DrawerTarget, type NewDefaults } from "./TaskDrawer";
import { Disc, LATE, daysUntilDue, shortDate, today } from "./bits";

// The task board, as in the Conscious Cafe manager: a rail of boards on the
// left (its order is the priority), the open board — or one person's work
// across every board — on the right. The page opens on My work.

type BoardTab = "board" | "list" | "timeline";
type PersonTab = "list" | "timeline";
type Row = Task & { task_subtasks?: { title: string; is_done: boolean; sort_order?: number }[] };
type Toast = { id: number; kind: "ok" | "error"; text: string; action?: { label: string; run: () => void } } | null;
/** "all" = everyone's work, "none" = nobody's yet, else a profile id. */
type PersonKey = string;

const RAIL_KEY = "ws_tasks_rail_collapsed";
const LAST_BOARD_KEY = "ws_tasks_last_board";
const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

export default function TasksApp({ initialTaskId = null }: { initialTaskId?: string | null }) {
  const { me, people, nameOf } = useWorkspace();
  const supabase = supabaseBrowser();
  const isPartner = me.role === "partner";

  const [boards, setBoards] = useState<TaskBoard[]>([]);
  const [boardsLoaded, setBoardsLoaded] = useState(false);
  const [mode, setMode] = useState<"person" | "board">("person");
  const [boardId, setBoardId] = useState<string | null>(null);
  const [personId, setPersonId] = useState<PersonKey>(me.id);
  const [boardTab, setBoardTab] = useState<BoardTab>("board");
  const [personTab, setPersonTab] = useState<PersonTab>("list");
  const [zoom, setZoom] = useState<Zoom>("day");
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [awaiting, setAwaiting] = useState<Task[]>([]);
  const [deps, setDeps] = useState<TaskDependency[]>([]);
  const [stubs, setStubs] = useState<Stub[]>([]);
  const [checklists, setChecklists] = useState<Map<string, Checklist>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TaskFilters>(NO_FILTERS);
  const [drawer, setDrawer] = useState<{ target: DrawerTarget; boardId: string; nonce: number } | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const writing = useRef(false);
  const loadToken = useRef(0);
  const search = useRef<HTMLInputElement>(null);

  // ── Feedback ─────────────────────────────────────────────────────────────
  // One toast, bottom-centre, above the drawer. Successes fade; errors stay.

  const say = useCallback((text: string, kind: "ok" | "error" = "ok", action?: { label: string; run: () => void }) => {
    setToast({ id: Date.now(), kind, text, action });
  }, []);
  useEffect(() => {
    if (!toast || toast.kind === "error") return;
    const t = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), toast.action ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!flashId) return;
    const t = setTimeout(() => setFlashId(null), 2000);
    return () => clearTimeout(t);
  }, [flashId]);

  // ── Per-viewer preferences and the address bar ───────────────────────────

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore a per-viewer preference
    if (store.get(RAIL_KEY) === "1") setRailCollapsed(true);
    // ?board=&view= and ?person=&view= reopen the same place (bookmarks, Back).
    const q = new URLSearchParams(window.location.search);
    const b = q.get("board");
    const p = q.get("person");
    const v = q.get("view");
    if (b) {
      setMode("board");
      setBoardId(b);
      if (v === "board" || v === "list" || v === "timeline") setBoardTab(v);
    } else if (p) {
      setPersonId(p);
      if (v === "list" || v === "timeline") setPersonTab(v);
    }
  }, []);
  const toggleRail = useCallback(() => {
    setRailCollapsed((c) => {
      store.set(RAIL_KEY, c ? "0" : "1");
      return !c;
    });
  }, []);
  useEffect(() => {
    if (initialTaskId) return; // the deep link rewrites the URL itself
    const q = new URLSearchParams();
    if (mode === "board" && boardId) {
      q.set("board", boardId);
      if (boardTab !== "board") q.set("view", boardTab);
    } else if (mode === "person") {
      if (personId !== me.id) q.set("person", personId);
      if (personTab !== "list") q.set("view", personTab);
    }
    const next = `${window.location.pathname}${q.size ? `?${q}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", next);
  }, [mode, boardId, boardTab, personId, personTab, me.id, initialTaskId]);

  const board = boards.find((b) => b.id === boardId) ?? null;
  const liveBoards = useMemo(() => boards.filter((b) => !b.is_archived), [boards]);
  const boardNames = useMemo(() => new Map(boards.map((b) => [b.id, b.name])), [boards]);
  const ownedLive = useMemo(() => liveBoards.filter((b) => b.owner_id === me.id).map((b) => b.id), [liveBoards, me.id]);

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
  }, [supabase, say]);

  const liveIds = liveBoards.map((b) => b.id).join(",");
  const ownedKey = ownedLive.join(",");
  const loadTasks = useCallback(async () => {
    const token = ++loadToken.current;
    let q = supabase.from("tasks").select("*, task_subtasks(title, is_done, sort_order)");
    const ids = liveIds ? liveIds.split(",") : [];
    if (mode === "board") {
      if (!boardId) return;
      q = q.eq("board_id", boardId).order("sort_order").order("created_at");
    } else {
      if (!boardsLoaded) return;
      if (!ids.length) {
        setTasks([]);
        setAwaiting([]);
        setDeps([]);
        setLoading(false);
        return;
      }
      if (personId === "none") q = q.is("assignee_id", null);
      else if (personId !== "all") q = q.eq("assignee_id", personId);
      q = q.in("board_id", ids).order("due_date", { ascending: true, nullsFirst: false }).order("created_at");
    }
    // My work also shows what's waiting for MY sign-off, whoever did it.
    const owned = ownedKey ? ownedKey.split(",") : [];
    const wantAwaiting = mode === "person" && personId === me.id && owned.length > 0;
    const [{ data, error }, aw] = await Promise.all([
      q,
      wantAwaiting
        ? supabase.from("tasks").select("*").eq("status", "quality_check").in("board_id", owned).order("updated_at", { ascending: false })
        : Promise.resolve({ data: [] as Task[] }),
    ]);
    if (token !== loadToken.current) return; // a newer load is on its way
    if (error) return say(error.message, "error");
    const rows = (data ?? []) as Row[];
    const lists = new Map<string, Checklist>();
    const clean = rows.map(({ task_subtasks, ...t }) => {
      const steps = [...(task_subtasks ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      if (steps.length) lists.set(t.id, { total: steps.length, done: steps.filter((s) => s.is_done).length, open: steps.filter((s) => !s.is_done).map((s) => s.title) });
      return t as Task;
    });
    const taskIds = clean.map((t) => t.id);
    let links: TaskDependency[] = [];
    let extra: Stub[] = [];
    if (taskIds.length) {
      const { data: d } = await supabase.from("task_dependencies").select("task_id, depends_on_task_id").in("task_id", taskIds);
      links = (d ?? []) as TaskDependency[];
      // Prerequisites on other boards, so "Waiting on" is right everywhere.
      const missing = [...new Set(links.map((l) => l.depends_on_task_id).filter((x) => !taskIds.includes(x)))];
      if (missing.length) extra = ((await supabase.from("tasks").select("id, title, status").in("id", missing)).data ?? []) as Stub[];
    }
    if (token !== loadToken.current) return;
    setTasks(clean);
    // Sign-off rows that are also the viewer's own stay in their own bucket.
    setAwaiting(((aw.data ?? []) as Task[]).filter((t) => !taskIds.includes(t.id)));
    setChecklists(lists);
    setDeps(links);
    setStubs(extra);
    setLoading(false);
  }, [supabase, mode, boardId, personId, boardsLoaded, liveIds, ownedKey, me.id, say]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    loadBoards();
  }, [loadBoards]);

  // Switching board, person or mode: never show the last set's cards under
  // the new heading while the new set loads.
  const viewKey = `${mode}:${mode === "board" ? boardId : personId}`;
  const lastView = useRef(viewKey);
  useEffect(() => {
    if (lastView.current !== viewKey) {
      lastView.current = viewKey;
      setLoading(true);
      setTasks([]);
      setAwaiting([]);
      setDeps([]);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on board/person/mode change
    loadTasks();
  }, [viewKey, loadTasks]);

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
    `tasks-${viewKey}`,
    ["tasks", "task_dependencies", "task_subtasks"],
    (c) => {
      const inSet = (id: unknown) => tasks.some((t) => t.id === id) || awaiting.some((t) => t.id === id);
      if (c.table === "task_dependencies") return inSet(changed(c, "task_id")) || inSet(changed(c, "depends_on_task_id"));
      if (c.table === "task_subtasks") return inSet(changed(c, "task_id"));
      if (inSet(changed(c, "id"))) return true;
      if (mode === "board") return changed(c, "board_id") === boardId;
      if (personId === "all") return true;
      return changed(c, "assignee_id") === (personId === "none" ? null : personId) || changed(c, "status") === "quality_check";
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
        setDrawer({ target: { kind: "edit", id: data.id }, boardId: data.board_id, nonce: Date.now() });
      });
    window.history.replaceState(null, "", window.location.pathname);
    return () => {
      cancelled = true;
    };
  }, [initialTaskId, supabase, say]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const todayIso = today();
  const visible = useMemo(() => applyFilters(tasks, filters, todayIso), [tasks, filters, todayIso]);
  const lookup = useMemo(() => new Map<string, Stub>([...stubs, ...tasks, ...awaiting].map((t) => [t.id, t])), [tasks, stubs, awaiting]);
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
  const personLabel =
    personId === me.id ? "My work" : personId === "all" ? "Everyone’s work" : personId === "none" ? "Nobody’s work" : `${nameOf(personId).split(" ")[0]}’s work`;
  const canSignOffHere = !board?.owner_id || board.owner_id === me.id;
  const signOffName = board?.owner_id ? nameOf(board.owner_id) : null;

  // ── Boards ───────────────────────────────────────────────────────────────

  const boardError = (msg: string, name?: string) =>
    say(msg.includes("uq_task_boards_name") || msg.includes("duplicate") ? `A board called "${name}" already exists.` : msg, "error");

  const openBoard = (id: string) => {
    setMode("board");
    setBoardId(id);
    setColorOpen(false);
    setEditingDesc(false);
    store.set(LAST_BOARD_KEY, id);
  };

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
    openBoard((data as TaskBoard).id);
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

  // ── Tasks ────────────────────────────────────────────────────────────────

  /** Put tasks back exactly as they were — the Undo behind a move or a reschedule. */
  async function restore(rows: Task[], text: string) {
    writing.current = true;
    try {
      for (const r of rows) {
        const { error } = await supabase
          .from("tasks")
          .update({ status: r.status, sort_order: r.sort_order, progress: r.progress, start_date: r.start_date, due_date: r.due_date })
          .eq("id", r.id);
        if (error) throw error;
      }
      say(text);
    } catch (e) {
      say(errorText(e), "error");
    } finally {
      writing.current = false;
      loadTasks();
      loadBoards();
    }
  }

  /** Move a task to `status`, landing before `beforeId` (or at the end), against the FULL column. */
  async function moveTask(taskId: string, status: TaskStatus, beforeId: string | null) {
    const moving = tasks.find((t) => t.id === taskId);
    if (!moving || taskId === beforeId) return;
    const prev = tasks;
    setToast(null);
    writing.current = true;
    let touched: Task[] = [];
    try {
      if (status === "done") {
        // Done is a log: only the status is written, nothing renumbered.
        if (moving.status === "done") return;
        touched = [moving];
        setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status } : t)));
        const { data, error } = await supabase.from("tasks").update({ status }).eq("id", taskId).select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("That task could not be found. The move was not saved.");
      } else {
        const column = tasks.filter((t) => t.status === status && t.id !== taskId).sort((a, b) => a.sort_order - b.sort_order);
        const at = beforeId ? column.findIndex((t) => t.id === beforeId) : column.length;
        column.splice(at < 0 ? column.length : at, 0, { ...moving, status });
        const updates = column.map((t, i) => ({ ...t, sort_order: i + 1 }));
        const changedOrder = updates.filter((u) => prev.find((p) => p.id === u.id)?.sort_order !== u.sort_order);
        touched = prev.filter((p) => p.id === taskId || changedOrder.some((u) => u.id === p.id));
        setTasks((ts) => ts.map((t) => updates.find((u) => u.id === t.id) ?? t));
        if (moving.status !== status) {
          const { data, error } = await supabase.from("tasks").update({ status }).eq("id", taskId).select("id");
          if (error) throw error;
          if (!data?.length) throw new Error("That task could not be found. The move was not saved.");
        }
        const results = await Promise.all(changedOrder.map((u) => supabase.from("tasks").update({ sort_order: u.sort_order }).eq("id", u.id).select("id")));
        if (results.some((r) => r.error || !r.data?.length)) throw new Error("Only part of that move was saved — the board has been reloaded.");
      }
      if (status === "quality_check" && moving.status !== status) notifyReadyForSignOff(taskId).catch(() => {});
      if (moving.status !== status) {
        const snapshot = touched;
        const where = status === "quality_check" && !canSignOffHere ? `Quality Check — ${signOffName?.split(" ")[0] ?? "the owner"} signs it off` : STATUS_LABEL[status];
        say(`“${moving.title}” moved to ${where}.`, "ok", { label: "Undo", run: () => restore(snapshot, "Move undone.") });
      }
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
    const before = tasks.find((t) => t.id === taskId);
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, ...dates } : t)));
    const { error } = await supabase.from("tasks").update(dates).eq("id", taskId);
    if (error) {
      setTasks(prev);
      return say(error.message, "error");
    }
    if (before)
      say(`Rescheduled${dates.due_date ? ` — due ${shortDate(dates.due_date)}` : ""}.`, "ok", { label: "Undo", run: () => restore([before], "Dates restored.") });
  }

  const openTask = (t: Pick<Task, "id" | "board_id">) => setDrawer({ target: { kind: "edit", id: t.id }, boardId: t.board_id, nonce: Date.now() });
  /** Where a new task goes when it isn't started from a board: the last board used. */
  const defaultBoardId = () => {
    const last = store.get(LAST_BOARD_KEY);
    return liveBoards.find((b) => b.id === last)?.id ?? liveBoards[0]?.id ?? null;
  };
  const newTask = useCallback(
    (status: TaskStatus = "todo", title = "", forBoard?: string | null, defaults?: NewDefaults) => {
      const id = forBoard ?? (mode === "board" ? boardId : null) ?? defaultBoardId();
      if (!id) return say("Create a board first — every task lives on one.", "error");
      setDrawer({ target: { kind: "new", status, title, defaults }, boardId: id, nonce: Date.now() });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaultBoardId reads liveBoards
    [mode, boardId, liveBoards, say],
  );
  const drawerBoard = drawer ? boards.find((b) => b.id === drawer.boardId) : null;

  // ── Keys ─────────────────────────────────────────────────────────────────
  // n new task · / search · j/k next/previous task · [ rail · ? legend.

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || drawer) return;
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      if (e.key === "n") {
        e.preventDefault();
        newTask();
      } else if (e.key === "/") {
        e.preventDefault();
        search.current?.focus();
      } else if (e.key === "[") {
        e.preventDefault();
        toggleRail();
      } else if (e.key === "?") {
        e.preventDefault();
        setLegendOpen((o) => !o);
        if (railCollapsed) toggleRail();
      } else if (e.key === "j" || e.key === "k") {
        const rows = [...document.querySelectorAll<HTMLElement>("main [data-tk-row], main [data-tk-id]")].filter((r) => r.offsetParent);
        if (!rows.length) return;
        e.preventDefault();
        const i = rows.indexOf(document.activeElement as HTMLElement);
        const next = rows[i < 0 ? 0 : Math.max(0, Math.min(rows.length - 1, i + (e.key === "j" ? 1 : -1)))];
        next.focus();
        next.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer, newTask, toggleRail, railCollapsed]);

  // ── Render ───────────────────────────────────────────────────────────────

  const awaitingPerson = mode === "person" && (!boardsLoaded || loading);
  const allDone = mode === "board" && board && !board.is_archived && !loading && tasks.length > 0 && stats.open === 0;
  const peopleOptions = (
    <>
      {people.map((p) => (
        <option key={p.id} value={p.id}>
          {p.full_name || p.email}
          {p.id === me.id ? " (you)" : ""}
        </option>
      ))}
    </>
  );

  return (
    <div>
      <header className="mb-5 flex min-h-12 flex-wrap items-center gap-x-6 gap-y-3">
        <h1 className="font-serif text-3xl">Tasks</h1>
        {(mode === "person" || board) && (
          <div className={`order-last flex w-full flex-wrap items-center gap-x-5 gap-y-2 text-sm md:order-none md:w-auto md:flex-1 ${loading ? "opacity-40" : ""}`} aria-busy={loading}>
            <Stat n={stats.open} label="open" />
            {mode === "board" ? <Stat n={stats.done} label="done" /> : <Stat n={stats.soon} label="due in 7 days" />}
            {awaiting.length > 0 && <Stat n={awaiting.length} label="to sign off" />}
            {stats.overdue > 0 && (
              <button
                className={`rounded-full px-2.5 py-0.5 ${filters.overdueOnly ? "bg-[#fef3f2] ring-1 ring-[#f4b8b2]" : "hover:bg-[#fef3f2]"}`}
                style={{ color: LATE }}
                aria-pressed={filters.overdueOnly}
                title={filters.overdueOnly ? "Show everything again" : "Show only what is overdue"}
                onClick={() => setFilters((f) => ({ ...f, overdueOnly: !f.overdueOnly, noDeadline: false }))}
              >
                <strong>{stats.overdue}</strong> overdue
              </button>
            )}
            {stats.undated > 0 && (
              <button
                className={`rounded-full px-2.5 py-0.5 text-body ${filters.noDeadline ? "bg-cream ring-1 ring-ghost" : "hover:bg-cream"}`}
                aria-pressed={filters.noDeadline}
                title={filters.noDeadline ? "Show everything again" : "Show only the work with no deadline"}
                onClick={() => setFilters((f) => ({ ...f, noDeadline: !f.noDeadline, overdueOnly: false }))}
              >
                <strong>{stats.undated}</strong> with no deadline
              </button>
            )}
          </div>
        )}
        <button className="ws-btn ws-btn--primary ml-auto" onClick={() => newTask()} title="New task (n)">
          New task <kbd className="hidden rounded bg-paper/15 px-1 font-mono text-[11px] md:inline">n</kbd>
        </button>
      </header>

      {/* Phones and small tablets: boards as a strip of pills, not a rail. */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden" role="tablist" aria-label="Boards">
        <button role="tab" aria-selected={mode === "person"} onClick={() => setMode("person")} className={`ws-btn flex-none ${mode === "person" ? "ws-btn--primary" : ""}`}>
          {personLabel}
        </button>
        {liveBoards.map((b) => (
          <button
            key={b.id}
            role="tab"
            aria-selected={mode === "board" && b.id === boardId}
            onClick={() => openBoard(b.id)}
            className={`ws-btn flex-none ${mode === "board" && b.id === boardId ? "ws-btn--primary" : ""}`}
          >
            <span className="size-2 rounded-full" style={{ background: b.color }} />
            {b.name}
          </button>
        ))}
      </div>

      <div className={`grid gap-6 ${railCollapsed ? "lg:grid-cols-[48px_minmax(0,1fr)]" : "lg:grid-cols-[240px_minmax(0,1fr)]"}`}>
        <div className="hidden lg:block">
          <BoardRail
            boards={boards}
            activeId={boardId}
            personMode={mode === "person"}
            personLabel={personLabel}
            onPerson={() => setMode("person")}
            onSelect={openBoard}
            onCreate={createBoard}
            onRename={(b, name) => updateBoard(b, { name })}
            onArchive={archiveBoard}
            onRestore={restoreBoard}
            onDelete={deleteBoard}
            onMove={moveBoard}
            collapsed={railCollapsed}
            onToggleCollapsed={toggleRail}
            legendOpen={legendOpen}
            onLegendToggle={setLegendOpen}
          />
        </div>

        <section className="min-w-0">
          {mode === "board" && !board && boardsLoaded && (
            <div className="rounded-2xl border border-dashed border-ghost p-10 text-center">
              <p className="mb-2 font-serif text-2xl">{boards.length ? "That board isn’t here any more" : "No boards yet"}</p>
              <p className="mx-auto max-w-md text-body">
                A board is a project: “Client onboarding”, “Compliance”, “Q3 launch”. Create one on the left, then add the tasks it takes.
              </p>
            </div>
          )}

          {mode === "person" && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Disc id={personId === "none" || personId === "all" ? null : personId} name={personId === "none" || personId === "all" ? null : nameOf(personId)} size={28} />
              <label className="sr-only" htmlFor="tk-person">Showing</label>
              <select
                id="tk-person"
                className="ws-input !w-auto"
                value={personId}
                title="One person’s work across every board, in the order it has to happen."
                onChange={(e) => setPersonId(e.target.value)}
              >
                {peopleOptions}
                <option value="all">Everyone</option>
                <option value="none">Nobody yet</option>
              </select>
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
                <div className="inline-flex rounded-full border border-line bg-card p-0.5" role="tablist" aria-label="View">
                  {(mode === "board"
                    ? ([["board", "Board"], ["list", "List"], ["timeline", "Timeline"]] as const)
                    : ([["list", personId === "all" ? "Everyone" : personId === me.id ? "My work" : "Work"], ["timeline", "Timeline"]] as const)
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
                  ref={search}
                  className="ws-input !w-52"
                  placeholder="Search tasks…  /"
                  aria-label="Search tasks"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setFilters((f) => ({ ...f, search: "" }));
                      e.currentTarget.blur();
                    }
                  }}
                />
                {mode === "board" && (
                  <select className="ws-input !w-auto" value={filters.owner} onChange={(e) => setFilters((f) => ({ ...f, owner: e.target.value }))} aria-label="Assigned to">
                    <option value="">Everyone</option>
                    <option value="none">Nobody yet</option>
                    {peopleOptions}
                  </select>
                )}
                {mode === "board" && (
                  <Toggle on={filters.overdueOnly} onClick={() => setFilters((f) => ({ ...f, overdueOnly: !f.overdueOnly, noDeadline: false }))}>Overdue only</Toggle>
                )}
                {mode === "board" && (stats.undated > 0 || filters.noDeadline) && (
                  <Toggle on={filters.noDeadline} onClick={() => setFilters((f) => ({ ...f, noDeadline: !f.noDeadline, overdueOnly: false }))}>No deadline</Toggle>
                )}
                <Toggle on={!filters.showDone} onClick={() => setFilters((f) => ({ ...f, showDone: !f.showDone }))}>Hide done</Toggle>
              </div>

              {narrowed && tasks.length > 0 && visible.length > 0 && (
                <p className="mb-3 text-sm text-mute">
                  Showing {visible.length} of {tasks.length} tasks.{" "}
                  <button className="underline" onClick={() => setFilters(NO_FILTERS)}>Clear filters</button>
                </p>
              )}

              {awaitingPerson || (mode === "board" && loading) ? (
                <Skeleton />
              ) : narrowed && tasks.length > 0 && visible.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ghost p-8 text-center">
                  <p className="mb-1 font-serif text-xl">No tasks match</p>
                  <p className="mb-4 text-body">
                    All {tasks.length} tasks {mode === "board" ? "on this board are" : "here are"} hidden by the filters above.
                  </p>
                  <button className="ws-btn" onClick={() => setFilters(NO_FILTERS)}>Clear filters</button>
                </div>
              ) : mode === "person" ? (
                tasks.length === 0 && awaiting.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-ghost p-8 text-center">
                    <p className="mb-1 font-serif text-xl">{personId === me.id ? "Nothing on your plate" : "Nothing assigned"}</p>
                    <p className="mb-4 text-body">
                      {personId === me.id ? "No open task on any board is assigned to you." : "No task on any board is assigned here."} Press <kbd className="rounded border border-line bg-paper px-1 font-mono text-xs">n</kbd> to add one.
                    </p>
                    <button className="ws-btn ws-btn--primary" onClick={() => newTask()}>New task</button>
                  </div>
                ) : personTab === "list" ? (
                  <PersonView tasks={visible} awaiting={awaiting} showAssignee={personId === "all"} waiting={waiting} boardNames={boardNames} onOpen={openTask} />
                ) : (
                  <GanttView tasks={visible} deps={deps} waiting={waiting} zoom={zoom} onZoom={setZoom} boardNames={boardNames} onOpen={(id) => openTask(tasks.find((t) => t.id === id)!)} onReschedule={rescheduleTask} />
                )
              ) : boardTab === "board" ? (
                <BoardView
                  tasks={visible}
                  waiting={waiting}
                  checklists={checklists}
                  onOpen={(id) => board && openTask({ id, board_id: board.id })}
                  onNew={(status, title) => newTask(status, title)}
                  onMove={moveTask}
                  filtered={narrowed}
                  canSignOff={canSignOffHere}
                  signOffName={signOffName}
                  flashId={flashId}
                  boardKey={board?.id ?? ""}
                />
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
          key={drawer.nonce}
          target={drawer.target}
          board={drawerBoard}
          boards={drawer.target.kind === "new" ? liveBoards : undefined}
          onBoardChange={(id) => {
            store.set(LAST_BOARD_KEY, id);
            setDrawer((d) => (d ? { ...d, boardId: id } : d));
          }}
          onClose={() => setDrawer(null)}
          onSaved={(t, created, again) => {
            loadTasks();
            loadBoards();
            if (!created) return setDrawer(null);
            store.set(LAST_BOARD_KEY, t.board_id);
            setFlashId(t.id);
            if (again) {
              // Same board, column, assignee, priority and date: only the title is new.
              setDrawer({
                target: { kind: "new", status: t.status === "done" ? "todo" : t.status, title: "", defaults: { assignee_id: t.assignee_id, priority: t.priority, due_date: t.due_date, start_date: t.start_date } },
                boardId: t.board_id,
                nonce: Date.now(),
              });
              say(`“${t.title}” created. Next one…`);
            } else {
              setDrawer(null);
              say(`“${t.title}” created${mode === "board" && t.board_id === boardId ? "" : ` on ${boardNames.get(t.board_id) ?? "its board"}`}.`, "ok", { label: "Open", run: () => openTask(t) });
            }
          }}
          onDeleted={() => {
            setDrawer(null);
            say("Task deleted.");
            loadTasks();
            loadBoards();
          }}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
          <div
            role={toast.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex max-w-xl items-start gap-3 rounded-xl px-4 py-2.5 text-sm shadow-xl ring-1 ${toast.kind === "error" ? "bg-[#fef3f2] text-[#b42318] ring-[#f4b8b2]" : "bg-ink text-paper ring-ink"}`}
          >
            <span className="flex-1">{toast.text}</span>
            {toast.action && (
              <button
                className="font-medium underline underline-offset-2"
                onClick={() => {
                  const run = toast.action!.run;
                  setToast(null);
                  run();
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button aria-label="Dismiss" className="opacity-70 hover:opacity-100" onClick={() => setToast(null)}>✕</button>
          </div>
        </div>
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

/** Placeholder columns while a set loads: the layout holds its shape. */
function Skeleton() {
  return (
    <div className="flex gap-3 overflow-hidden" aria-busy="true" aria-label="Loading tasks">
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-[272px] flex-none space-y-2 rounded-2xl bg-[#efedea] p-2">
          <div className="h-6 w-24 rounded bg-ghost/50" />
          {[0, 1].map((j) => (
            <div key={j} className="h-16 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ))}
    </div>
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
}: {
  board: TaskBoard;
  isPartner: boolean;
  colorOpen: boolean;
  setColorOpen: (v: boolean) => void;
  editingDesc: boolean;
  setEditingDesc: (v: boolean) => void;
  onUpdate: (patch: Partial<TaskBoard>) => void;
}) {
  const { me, people, nameOf } = useWorkspace();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="relative">
        <button className="block size-4 rounded-full ring-1 ring-line" style={{ background: board.color }} title="Board colour" aria-label="Board colour" aria-expanded={colorOpen} onClick={() => setColorOpen(!colorOpen)} />
        {colorOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setColorOpen(false)} />
            <div className="absolute left-0 top-6 z-40 grid grid-cols-4 gap-2 rounded-xl border border-line bg-card p-3 shadow-xl">
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
      <h2 className="font-serif text-xl leading-tight">
        {board.name}
        {board.is_archived && <span className="ml-2 text-sm italic text-mute">archived</span>}
      </h2>
      {editingDesc ? (
        <input
          autoFocus
          className="ws-input !w-auto min-w-64 flex-1 !py-1 text-sm"
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
        <button className={`min-w-0 flex-1 truncate text-left text-sm ${board.description ? "text-body" : "text-mute"}`} title={board.description ?? undefined} onClick={() => setEditingDesc(true)}>
          {board.description || "Add a description"}
        </button>
      )}
      <label className="flex items-center gap-2 text-sm text-mute" title="Approves work moved to Done on this board">
        Signed off by
        {isPartner ? (
          <select className="ws-input !w-auto !py-1" value={board.owner_id ?? ""} onChange={(e) => onUpdate({ owner_id: e.target.value || null })} aria-label="Signed off by">
            <option value="">Anyone (no owner)</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || p.email}
                {p.id === me.id ? " (you)" : ""}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-ink">{board.owner_id ? nameOf(board.owner_id) : "anyone"}</span>
        )}
      </label>
    </div>
  );
}
