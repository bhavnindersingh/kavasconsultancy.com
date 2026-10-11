"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notifyReadyForSignOff } from "@/app/(workspace)/workspace/(app)/tasks/actions";
import { errorText } from "@/lib/workspace/files";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import {
  STATUS_LABEL,
  TASK_STATUSES,
  type Task,
  type TaskBoard,
  type TaskDependency,
  type TaskStatus,
} from "@/lib/workspace/types";
import { changed, useLive } from "@/lib/workspace/useLive";
import { useWorkspace } from "../WorkspaceContext";
import BoardDialog from "./BoardDialog";
import GanttView from "./GanttView";
import PersonView from "./PersonView";
import TaskDrawer from "./TaskDrawer";
import { PriorityDot, dueLabel } from "./bits";

type View = "board" | "list" | "timeline" | "people";
const VIEW_LABEL: Record<View, string> = { board: "Board", list: "List", timeline: "Timeline", people: "People" };

export default function TasksApp({ initialTaskId = null }: { initialTaskId?: string | null }) {
  const { me, people, nameOf } = useWorkspace();
  const supabase = supabaseBrowser();

  const [boards, setBoards] = useState<TaskBoard[]>([]);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deps, setDeps] = useState<TaskDependency[]>([]);
  const [view, setView] = useState<View>("board");
  const [assignee, setAssignee] = useState<string>("");
  const [search, setSearch] = useState("");
  const [openTask, setOpenTask] = useState<{ id: string; boardId: string } | null>(null);
  const [personNonce, setPersonNonce] = useState(0);
  const [boardDialog, setBoardDialog] = useState<TaskBoard | "new" | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // While a drag is being written, a live refetch would snap cards back to a
  // half-saved order. The refetch runs once the writes land instead.
  const writing = useRef(false);

  const loadBoards = useCallback(async () => {
    const { data, error } = await supabase.from("task_boards").select("*").order("sort_order").order("created_at");
    if (error) return setError(error.message);
    const list = (data ?? []) as TaskBoard[];
    setBoards(list);
    setBoardId((cur) => (cur && list.some((b) => b.id === cur) ? cur : (list.find((b) => !b.is_archived)?.id ?? null)));
    if (!list.length) setLoading(false);
  }, [supabase]);

  const loadTasks = useCallback(async () => {
    if (!boardId) {
      setTasks([]);
      setDeps([]);
      return;
    }
    const [t, d] = await Promise.all([
      supabase.from("tasks").select("*").eq("board_id", boardId).order("sort_order").order("created_at"),
      supabase
        .from("task_dependencies")
        .select("task_id, depends_on_task_id, task:tasks!task_dependencies_task_id_fkey!inner(board_id)")
        .eq("task.board_id", boardId),
    ]);
    if (t.error) setError(t.error.message);
    setTasks((t.data ?? []) as Task[]);
    setDeps(((d.data ?? []) as TaskDependency[]).map(({ task_id, depends_on_task_id }) => ({ task_id, depends_on_task_id })));
    setLoading(false);
  }, [supabase, boardId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    loadBoards();
  }, [loadBoards]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on board switch
    loadTasks();
  }, [loadTasks]);

  // Opened from an email link: find the task's board, switch to it, open it.
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
        if (!data) return setError("That task no longer exists.");
        setView((v) => (v === "people" ? "board" : v));
        setBoardId(data.board_id);
        setOpenTask({ id: data.id, boardId: data.board_id });
      });
    // Drop ?task= so a reload doesn't reopen it.
    window.history.replaceState(null, "", window.location.pathname);
    return () => {
      cancelled = true;
    };
  }, [initialTaskId, supabase]);

  // Live: someone else changed a board, or a task / link on this board.
  useLive("boards", ["task_boards"], () => true, loadBoards);
  useLive(
    boardId ? `board-${boardId}` : null,
    ["tasks", "task_dependencies"],
    (c) => {
      if (c.table === "task_dependencies") {
        const ids = [changed(c, "task_id"), changed(c, "depends_on_task_id")];
        return tasks.some((t) => ids.includes(t.id));
      }
      return changed(c, "board_id") === boardId || tasks.some((t) => t.id === changed(c, "id"));
    },
    () => {
      if (!writing.current) loadTasks();
    },
  );

  const board = boards.find((b) => b.id === boardId) ?? null;
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter(
      (t) =>
        (!assignee || (assignee === "me" ? t.assignee_id === me.id : assignee === "none" ? !t.assignee_id : t.assignee_id === assignee)) &&
        (!q || t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)),
    );
  }, [tasks, assignee, search, me.id]);

  /** How many unfinished tasks each task is still waiting on. */
  const waiting = useMemo(() => {
    const status = new Map(tasks.map((t) => [t.id, t.status]));
    const out = new Map<string, number>();
    for (const d of deps) if (status.get(d.depends_on_task_id) !== "done") out.set(d.task_id, (out.get(d.task_id) ?? 0) + 1);
    return out;
  }, [tasks, deps]);

  async function addTask(status: TaskStatus, title: string) {
    if (!boardId || !title.trim()) return;
    const last = tasks.filter((t) => t.status === status).at(-1);
    const { data, error } = await supabase
      .from("tasks")
      .insert({ board_id: boardId, title: title.trim(), status, sort_order: (last?.sort_order ?? 0) + 1 })
      .select()
      .single();
    if (error) return setError(error.message);
    setTasks((ts) => (ts.some((t) => t.id === data.id) ? ts : [...ts, data as Task]));
  }

  /** Move a task to `status`, landing before `beforeId` (or at the end). */
  async function moveTask(taskId: string, status: TaskStatus, beforeId: string | null) {
    const moving = tasks.find((t) => t.id === taskId);
    if (!moving || taskId === beforeId) return;
    const column = tasks.filter((t) => t.status === status && t.id !== taskId);
    const at = beforeId ? column.findIndex((t) => t.id === beforeId) : column.length;
    column.splice(at < 0 ? column.length : at, 0, { ...moving, status });
    const updates = column.map((t, i) => ({ ...t, sort_order: i + 1 }));
    const prev = tasks;
    setTasks((ts) => ts.map((t) => updates.find((u) => u.id === t.id) ?? t));
    setError(null);
    writing.current = true;
    try {
      if (moving.status !== status) {
        const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
        if (error) throw error;
      }
      const changedOrder = updates.filter((u) => prev.find((p) => p.id === u.id)?.sort_order !== u.sort_order);
      await Promise.all(
        changedOrder.map(async (u) => {
          const { error } = await supabase.from("tasks").update({ sort_order: u.sort_order }).eq("id", u.id);
          if (error) throw error;
        }),
      );
      // The completion trigger may have changed progress/completed_at.
      if (moving.status !== status) loadTasks();
      if (status === "quality_check" && moving.status !== status) notifyReadyForSignOff(taskId).catch(() => {});
    } catch (e) {
      setTasks(prev);
      setError(errorText(e));
    } finally {
      writing.current = false;
    }
  }

  /** New dates from the timeline: shown at once, written, rolled back if refused. */
  async function rescheduleTask(taskId: string, dates: Pick<Task, "start_date" | "due_date">) {
    const prev = tasks;
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, ...dates } : t)));
    setError(null);
    const { error } = await supabase.from("tasks").update(dates).eq("id", taskId);
    if (error) {
      setTasks(prev);
      setError(error.message);
    }
  }

  const activeBoards = boards.filter((b) => !b.is_archived);
  const archivedBoards = boards.filter((b) => b.is_archived);
  const drawerBoard = openTask ? boards.find((b) => b.id === openTask.boardId) : null;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl">Tasks</h1>
          {view !== "people" && board?.owner_id && (
            <p className="text-sm text-mute mt-1">Signed off by {nameOf(board.owner_id)}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="ws-btn" onClick={() => setBoardDialog("new")}>New board</button>
          {board && view !== "people" && <button className="ws-btn" onClick={() => setBoardDialog(board)}>Board settings</button>}
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-[#fef3f2] text-[#b42318] px-3 py-2 text-sm" role="alert">
          {error} <button className="underline ml-2" onClick={() => setError(null)}>Dismiss</button>
        </p>
      )}

      {boards.length > 0 && (
        <div className="inline-flex rounded-full border border-line bg-card p-0.5 mb-4" role="group" aria-label="View">
          {(Object.keys(VIEW_LABEL) as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-3 py-1 text-sm ${view === v ? "bg-ink text-paper" : ""}`}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
      )}

      {/* Board tabs — every view but People reads one board */}
      {view !== "people" && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
          {activeBoards.map((b) => (
            <button
              key={b.id}
              onClick={() => setBoardId(b.id)}
              className={`ws-btn ${b.id === boardId ? "ws-btn--primary" : ""}`}
            >
              {b.name}
            </button>
          ))}
          {archivedBoards.length > 0 && (
            <button className="ws-btn text-mute" onClick={() => setShowArchived((s) => !s)}>
              {showArchived ? "Hide archived" : `Archived (${archivedBoards.length})`}
            </button>
          )}
          {showArchived &&
            archivedBoards.map((b) => (
              <button key={b.id} onClick={() => setBoardId(b.id)} className={`ws-btn italic ${b.id === boardId ? "ws-btn--primary" : "text-mute"}`}>
                {b.name}
              </button>
            ))}
        </div>
      )}

      {!loading && boards.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ghost p-10 text-center">
          <p className="font-serif text-2xl mb-2">No boards yet</p>
          <p className="text-body mb-5">A board holds one stream of work: a client engagement, a launch, the back office.</p>
          <button className="ws-btn ws-btn--primary" onClick={() => setBoardDialog("new")}>Create the first board</button>
        </div>
      )}

      {view === "people" && boards.length > 0 && (
        <PersonView boards={boards} nonce={personNonce} onOpen={(id, bId) => setOpenTask({ id, boardId: bId })} />
      )}

      {view !== "people" && board && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <select className="ws-input !w-auto" value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Filter by assignee">
              <option value="">Everyone</option>
              <option value="me">Assigned to me</option>
              <option value="none">Unassigned</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
              ))}
            </select>
            <input className="ws-input !w-56" placeholder="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {view === "board" && (
            <BoardView tasks={visible} waiting={waiting} onOpen={(id) => setOpenTask({ id, boardId: board.id })} onAdd={addTask} onMove={moveTask} />
          )}
          {view === "list" && <ListView tasks={visible} waiting={waiting} onOpen={(id) => setOpenTask({ id, boardId: board.id })} />}
          {view === "timeline" && (
            <GanttView tasks={visible} deps={deps} onOpen={(id) => setOpenTask({ id, boardId: board.id })} onReschedule={rescheduleTask} />
          )}
        </>
      )}

      {openTask && drawerBoard && (
        <TaskDrawer
          key={openTask.id}
          taskId={openTask.id}
          board={drawerBoard}
          onClose={() => setOpenTask(null)}
          onChanged={(t) => {
            setTasks((ts) => ts.map((x) => (x.id === t.id ? t : x)));
            setPersonNonce((n) => n + 1);
          }}
          onDeleted={(id) => {
            setTasks((ts) => ts.filter((x) => x.id !== id));
            setPersonNonce((n) => n + 1);
            setOpenTask(null);
          }}
        />
      )}

      {boardDialog && (
        <BoardDialog
          board={boardDialog === "new" ? null : boardDialog}
          onClose={() => setBoardDialog(null)}
          onSaved={async (id) => {
            setBoardDialog(null);
            await loadBoards();
            if (id) setBoardId(id);
          }}
        />
      )}
    </div>
  );
}

function BoardView({
  tasks,
  waiting,
  onOpen,
  onAdd,
  onMove,
}: {
  tasks: Task[];
  waiting: Map<string, number>;
  onOpen: (id: string) => void;
  onAdd: (s: TaskStatus, title: string) => void;
  onMove: (id: string, s: TaskStatus, beforeId: string | null) => void;
}) {
  const { nameOf } = useWorkspace();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
      {TASK_STATUSES.map((status) => {
        const col = tasks.filter((t) => t.status === status);
        return (
          <section
            key={status}
            className={`flex-none w-[272px] rounded-2xl p-2 transition-colors ${over === status ? "bg-cream" : "bg-[#efedea]"}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(status);
            }}
            onDragLeave={() => setOver((o) => (o === status ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/task");
              setOver(null);
              setDragging(null);
              if (id) onMove(id, status, null);
            }}
          >
            <h2 className="flex items-center justify-between px-2 py-1.5 text-sm font-medium">
              {STATUS_LABEL[status]}
              <span className="text-mute font-normal">{col.length}</span>
            </h2>
            <div className="flex flex-col gap-2 min-h-8">
              {col.map((t) => (
                <article
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/task", t.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragging(t.id);
                  }}
                  onDragEnd={() => setDragging(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const id = e.dataTransfer.getData("text/task");
                    setOver(null);
                    setDragging(null);
                    if (id) onMove(id, status, t.id);
                  }}
                  onClick={() => onOpen(t.id)}
                  className={`cursor-pointer rounded-xl bg-card border border-line p-3 hover:border-ghost ${dragging === t.id ? "opacity-40" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <PriorityDot priority={t.priority} />
                    <p className="text-[14px] leading-snug">{t.title}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-mute">
                    {t.assignee_id && <span className="ws-chip">{nameOf(t.assignee_id)}</span>}
                    {t.due_date && <span className={dueLabel(t).late ? "text-[#b42318]" : ""}>{dueLabel(t).text}</span>}
                    {t.progress > 0 && t.status !== "done" && <span>{t.progress}%</span>}
                    {waiting.get(t.id) && t.status !== "done" && <WaitingChip n={waiting.get(t.id)!} />}
                  </div>
                </article>
              ))}
            </div>
            <QuickAdd onAdd={(title) => onAdd(status, title)} />
          </section>
        );
      })}
    </div>
  );
}

function QuickAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  if (!open)
    return (
      <button className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-sm text-mute hover:bg-card" onClick={() => setOpen(true)}>
        + Add task
      </button>
    );
  return (
    <form
      className="mt-2"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(title);
        setTitle("");
      }}
    >
      <input
        autoFocus
        className="ws-input"
        placeholder="Task title, then Enter"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => !title && setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      />
    </form>
  );
}

function WaitingChip({ n }: { n: number }) {
  return (
    <span className="ws-chip !bg-[#fef3f2] !text-[#b42318]" title={`Waiting on ${n} unfinished task${n === 1 ? "" : "s"}`}>
      Waiting on {n}
    </span>
  );
}

function ListView({ tasks, waiting, onOpen }: { tasks: Task[]; waiting: Map<string, number>; onOpen: (id: string) => void }) {
  const { nameOf } = useWorkspace();
  const sorted = [...tasks].sort(
    (a, b) =>
      Number(a.status === "done") - Number(b.status === "done") ||
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") ||
      a.sort_order - b.sort_order,
  );
  if (!sorted.length) return <p className="text-mute">No tasks match.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="w-full text-sm">
        <thead className="text-left text-mute">
          <tr className="border-b border-line">
            <th className="font-normal px-4 py-2.5">Task</th>
            <th className="font-normal px-4 py-2.5">Status</th>
            <th className="font-normal px-4 py-2.5">Assignee</th>
            <th className="font-normal px-4 py-2.5">Due</th>
            <th className="font-normal px-4 py-2.5 text-right">Progress</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => (
            <tr key={t.id} onClick={() => onOpen(t.id)} className="border-b border-line last:border-0 cursor-pointer hover:bg-paper">
              <td className="px-4 py-2.5">
                <span className="inline-flex items-center gap-2">
                  <PriorityDot priority={t.priority} />
                  <span className={t.status === "done" ? "line-through text-mute" : ""}>{t.title}</span>
                  {waiting.get(t.id) && t.status !== "done" && <WaitingChip n={waiting.get(t.id)!} />}
                </span>
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap">{STATUS_LABEL[t.status]}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">{t.assignee_id ? nameOf(t.assignee_id) : <span className="text-mute">—</span>}</td>
              <td className={`px-4 py-2.5 whitespace-nowrap ${dueLabel(t).late ? "text-[#b42318]" : ""}`}>{t.due_date ? dueLabel(t).text : "—"}</td>
              <td className="px-4 py-2.5 text-right">{t.progress}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
