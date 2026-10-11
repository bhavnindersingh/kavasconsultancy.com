"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notifyAssigned, notifyReadyForSignOff } from "@/app/(workspace)/workspace/(app)/tasks/actions";
import { removeObjects } from "@/lib/workspace/files";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import { needsDueDate, progressCompletes, type Stub } from "@/lib/workspace/tasks";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskBoard,
  type TaskStatus,
  type TaskSubtask,
} from "@/lib/workspace/types";
import { changed, useLive } from "@/lib/workspace/useLive";
import { useWorkspace } from "../WorkspaceContext";
import { LinkIcon, PRIORITY_COLOR, StatusDot, StatusPill, fullTime } from "./bits";
import TaskRecord from "./TaskRecord";
import TwoTap from "./TwoTap";

// The task record, as in the Conscious Cafe manager: notes, checklist and the
// record (discussion, files, activity) on the left; the facts on a resizable
// rail on the right. Facts are saved explicitly with Save — the checklist and
// links write as you go.

export type DrawerTarget = { kind: "edit"; id: string } | { kind: "new"; title: string; status: TaskStatus };

type Draft = Pick<Task, "title" | "description" | "status" | "priority" | "assignee_id" | "start_date" | "due_date" | "progress">;
const FIELDS: (keyof Draft)[] = ["title", "description", "status", "priority", "assignee_id", "start_date", "due_date", "progress"];

const RAIL_KEY = "ws_tasks_rail_width";
const RAIL_MIN = 280;
const RAIL_MAX = 560;
const RAIL_DEFAULT = 380;

function draftOf(t: Task): Draft {
  return {
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assignee_id: t.assignee_id,
    start_date: t.start_date,
    due_date: t.due_date,
    progress: t.progress,
  };
}

function normalise(d: Draft): Draft {
  return {
    ...d,
    title: d.title.trim(),
    description: d.description?.trim() ? d.description.trim() : null,
    start_date: d.start_date || null,
    due_date: d.due_date || null,
    progress: Math.max(0, Math.min(100, Math.round(d.progress))),
  };
}

export default function TaskDrawer({
  target,
  board,
  onClose,
  onSaved,
  onDeleted,
}: {
  target: DrawerTarget;
  board: TaskBoard;
  onClose: () => void;
  onSaved: (t: Task, created: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  const { me, people, nameOf } = useWorkspace();
  const supabase = supabaseBrowser();
  const isNew = target.kind === "new";

  const [task, setTask] = useState<Task | null>(null);
  const [draft, setDraft] = useState<Draft | null>(
    isNew
      ? { title: target.title, description: null, status: target.status, priority: "medium", assignee_id: null, start_date: null, due_date: null, progress: 0 }
      : null,
  );
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
  const [waitsOn, setWaitsOn] = useState<Stub[]>([]);
  const [holdingUp, setHoldingUp] = useState<Stub[]>([]);
  const [siblings, setSiblings] = useState<Stub[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [staleNotice, setStaleNotice] = useState(false);
  const [newStep, setNewStep] = useState("");
  const [linkTo, setLinkTo] = useState("");
  const [rail, setRail] = useState(RAIL_DEFAULT);

  const taskId = target.kind === "edit" ? target.id : task?.id ?? null;

  // ── Loading ──────────────────────────────────────────────────────────────

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).single();
    if (error) return setError(error.message);
    setTask(data as Task);
    return data as Task;
  }, [supabase, taskId]);

  const loadParts = useCallback(async () => {
    if (!taskId) return;
    const linked = (rows: unknown) => ((rows ?? []) as unknown as { task: Stub | null }[]).flatMap((r) => (r.task ? [r.task] : []));
    const [s, w, h, sib] = await Promise.all([
      supabase.from("task_subtasks").select("*").eq("task_id", taskId).order("sort_order").order("created_at"),
      supabase.from("task_dependencies").select("task:tasks!task_dependencies_depends_on_task_id_fkey(id, title, status)").eq("task_id", taskId),
      supabase.from("task_dependencies").select("task:tasks!task_dependencies_task_id_fkey(id, title, status)").eq("depends_on_task_id", taskId),
      supabase.from("tasks").select("id, title, status").eq("board_id", board.id).neq("id", taskId).order("sort_order"),
    ]);
    setSubtasks((s.data ?? []) as TaskSubtask[]);
    setWaitsOn(linked(w.data));
    setHoldingUp(linked(h.data));
    setSiblings((sib.data ?? []) as Stub[]);
  }, [supabase, taskId, board.id]);

  useEffect(() => {
    if (target.kind !== "edit") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on open
    loadTask().then((t) => t && setDraft(draftOf(t)));
    loadParts();
  }, [target, loadTask, loadParts]);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(RAIL_KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore a per-viewer preference
      if (saved >= RAIL_MIN && saved <= RAIL_MAX) setRail(saved);
    } catch {}
  }, []);

  const dirty = useMemo(() => {
    if (!draft) return false;
    if (!task) return isNew;
    const a = normalise(draft);
    const b = draftOf(task);
    return FIELDS.some((f) => a[f] !== b[f]);
  }, [draft, task, isNew]);

  // Live: someone else changed this task or its parts. The facts are never
  // overwritten under an unsaved edit — a notice offers the reload instead.
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  });
  useLive(
    taskId ? `drawer-${taskId}` : null,
    ["tasks", "task_subtasks", "task_dependencies"],
    (c) => {
      if (c.table === "tasks") return changed(c, "id") === taskId || [...waitsOn, ...holdingUp].some((x) => x.id === changed(c, "id"));
      if (c.table === "task_dependencies") return changed(c, "task_id") === taskId || changed(c, "depends_on_task_id") === taskId;
      return changed(c, "task_id") === taskId || subtasks.some((x) => x.id === changed(c, "id"));
    },
    () => {
      loadParts();
      loadTask().then((t) => {
        if (!t) return;
        if (!dirtyRef.current) setDraft(draftOf(t));
        else setStaleNotice(true);
      });
    },
  );

  // ── Closing ──────────────────────────────────────────────────────────────

  const close = useCallback(() => {
    if (dirty && !window.confirm("Discard the changes to this task?")) return;
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !e.defaultPrevented && close();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [close]);

  // ── Rules ────────────────────────────────────────────────────────────────

  const ownerName = board.owner_id ? (people.some((p) => p.id === board.owner_id) ? nameOf(board.owner_id) : "someone since removed") : null;
  const signOffMessage = `Work on this board is signed off by ${ownerName}. Move it to Quality Check and it will reach them.`;
  const canSignOff = !board.owner_id || board.owner_id === me.id || task?.status === "done";

  const prevFacts = task ? { status: task.status, progress: task.progress } : null;
  const willComplete = draft ? progressCompletes(prevFacts, draft) : false;
  const datesBackwards = !!(draft?.start_date && draft?.due_date && draft.due_date < draft.start_date);
  const missingDue = draft ? needsDueDate(prevFacts, draft) : false;
  const unticked = subtasks.filter((s) => !s.is_done).length;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  async function save() {
    if (!draft || saving) return;
    const next = normalise(draft);
    if (!next.title) return setError("Give the task a title.");
    if (datesBackwards) return setError("The due date is before the start date.");
    if (missingDue) return setError("Every task needs a deadline. Without one it can never be late, so nobody is ever told to chase it.");
    if (willComplete) next.status = "done";
    if (next.status === "done" && !canSignOff) return setError(signOffMessage);
    setSaving(true);
    setError(null);

    if (!task) {
      const { data: last } = await supabase
        .from("tasks")
        .select("sort_order")
        .eq("board_id", board.id)
        .eq("status", next.status)
        .order("sort_order", { ascending: false })
        .limit(1);
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...next, board_id: board.id, sort_order: (last?.[0]?.sort_order ?? 0) + 1 })
        .select()
        .single();
      setSaving(false);
      if (error) return setError(error.message);
      const created = data as Task;
      if (created.assignee_id && created.assignee_id !== me.id) notifyAssigned(created.id).catch(() => {});
      onSaved(created, true);
      return;
    }

    const before = draftOf(task);
    const patch: Partial<Draft> = {};
    for (const f of FIELDS) if (next[f] !== before[f]) (patch as Record<string, unknown>)[f] = next[f];
    if (!Object.keys(patch).length) {
      setSaving(false);
      return onClose();
    }
    const { data, error } = await supabase.from("tasks").update(patch).eq("id", task.id).select().single();
    setSaving(false);
    if (error) return setError(error.message);
    const saved = data as Task;
    if (patch.assignee_id && patch.assignee_id !== me.id) notifyAssigned(saved.id).catch(() => {});
    if (patch.status === "quality_check") notifyReadyForSignOff(saved.id).catch(() => {});
    onSaved(saved, false);
  }

  async function removeTask() {
    if (!task) return;
    const { data: files } = await supabase.from("task_files").select("storage_path").eq("task_id", task.id);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) return setError(error.message);
    await removeObjects("task-files", (files ?? []).map((f) => f.storage_path));
    onDeleted(task.id);
  }

  // ── Checklist (writes immediately) ───────────────────────────────────────

  async function addStep(e: React.FormEvent) {
    e.preventDefault();
    const title = newStep.trim();
    if (!title || !taskId) return;
    const { data, error } = await supabase
      .from("task_subtasks")
      .insert({ task_id: taskId, title, sort_order: (subtasks.at(-1)?.sort_order ?? 0) + 1 })
      .select()
      .single();
    if (error) return setError(error.message);
    setSubtasks((s) => [...s, data as TaskSubtask]);
    setNewStep("");
  }

  async function toggleStep(s: TaskSubtask) {
    setSubtasks((all) => all.map((x) => (x.id === s.id ? { ...x, is_done: !x.is_done } : x)));
    const { error } = await supabase.from("task_subtasks").update({ is_done: !s.is_done }).eq("id", s.id);
    if (error) {
      setError(error.message);
      loadParts();
    }
  }

  async function removeStep(id: string) {
    setSubtasks((all) => all.filter((x) => x.id !== id));
    const { error } = await supabase.from("task_subtasks").delete().eq("id", id);
    if (error) {
      setError(error.message);
      loadParts();
    }
  }

  // ── Links (write immediately) ────────────────────────────────────────────

  async function link() {
    if (!linkTo || !taskId) return;
    const { error } = await supabase.from("task_dependencies").insert({ task_id: taskId, depends_on_task_id: linkTo });
    if (error) return setError(error.message.includes("circular") ? "That would create a circular dependency." : error.message);
    setLinkTo("");
    loadParts();
  }

  async function unlink(waiting: string, dependsOn: string) {
    const { error } = await supabase.from("task_dependencies").delete().eq("task_id", waiting).eq("depends_on_task_id", dependsOn);
    if (error) return setError(error.message);
    loadParts();
  }

  // ── Rail resize ──────────────────────────────────────────────────────────

  const clampRail = (w: number) => Math.max(RAIL_MIN, Math.min(RAIL_MAX, Math.round(w)));
  const setRailSaved = (w: number) => {
    const v = clampRail(w);
    setRail(v);
    try {
      localStorage.setItem(RAIL_KEY, String(v));
    } catch {}
  };
  const dragFrom = useRef<{ x: number; w: number } | null>(null);

  // ── Render ───────────────────────────────────────────────────────────────

  const linkable = siblings.filter((s) => !waitsOn.some((w) => w.id === s.id) && !holdingUp.some((h) => h.id === s.id));
  const canSave = !!draft?.title.trim() && !datesBackwards && !missingDue && !saving;

  return (
    <div className="fixed inset-0 z-50 flex md:p-6" role="dialog" aria-modal="true" aria-label={isNew && !task ? "New task" : "Edit task"}>
      <div className="absolute inset-0 bg-ink/30" onClick={close} />
      <div className="relative m-auto flex h-full w-full flex-col overflow-hidden bg-paper shadow-2xl md:h-[min(820px,90vh)] md:w-[min(1140px,94vw)] md:rounded-2xl">
        <header className="flex items-start gap-3 border-b border-line bg-paper px-5 py-3">
          <div className="min-w-0 flex-1">
            {isNew && !task && <p className="text-xs text-mute">New task</p>}
            {draft ? (
              <input
                autoFocus={isNew}
                className="w-full bg-transparent font-serif text-2xl outline-none placeholder:text-ghost"
                placeholder={isNew ? "What needs doing?" : "Untitled task"}
                maxLength={200}
                aria-label="Title"
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
              />
            ) : (
              <p className="font-serif text-2xl text-mute">{error ?? "Loading…"}</p>
            )}
            <p className="mt-0.5 text-xs text-mute">{board.name}</p>
          </div>
          <button className="ws-btn !px-3" onClick={close} aria-label="Close">✕</button>
        </header>

        {error && (
          <p className="mx-5 mt-3 rounded-lg bg-[#fef3f2] px-3 py-2 text-sm text-[#b42318]" role="alert">
            {error} <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
          </p>
        )}
        {staleNotice && (
          <p className="mx-5 mt-3 rounded-lg bg-cream px-3 py-2 text-sm" role="status">
            Someone else just changed this task.{" "}
            <button
              className="underline"
              onClick={() => {
                if (task) setDraft(draftOf(task));
                setStaleNotice(false);
              }}
            >
              Load their version
            </button>{" "}
            (your unsaved changes here are dropped).
          </p>
        )}

        {draft && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
            <div className="min-w-0 flex-1 space-y-8 px-5 py-5 md:overflow-y-auto">
              <div>
                <label className="ws-label" htmlFor="t-notes">Notes</label>
                <AutoGrow
                  id="t-notes"
                  className="ws-input min-h-24"
                  placeholder="Anything the person picking this up needs to know."
                  value={draft.description ?? ""}
                  onChange={(v) => set("description", v)}
                />
              </div>

              {task && (
                <section>
                  <h3 className="mb-2 text-sm font-medium">
                    Checklist{" "}
                    {subtasks.length > 0 && (
                      <span className="font-normal text-mute">
                        {subtasks.length - unticked} of {subtasks.length} done
                      </span>
                    )}
                  </h3>
                  <ul className="mb-2 space-y-1">
                    {subtasks.map((s) => (
                      <li key={s.id} className="group flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={s.is_done} onChange={() => toggleStep(s)} aria-label={s.title} />
                        <span className={`flex-1 ${s.is_done ? "text-mute line-through" : ""}`}>{s.title}</span>
                        <button className="text-mute opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => removeStep(s.id)} aria-label={`Remove step ${s.title}`}>
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                  <form onSubmit={addStep} className="flex gap-2">
                    <input
                      className="ws-input"
                      maxLength={200}
                      placeholder={subtasks.length ? "Add another step…" : "Break this into steps…"}
                      value={newStep}
                      onChange={(e) => setNewStep(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape" && newStep) {
                          e.preventDefault();
                          setNewStep("");
                        }
                      }}
                    />
                    <button className="ws-btn" type="submit" disabled={!newStep.trim()}>Add</button>
                  </form>
                </section>
              )}

              {task ? (
                <TaskRecord taskId={task.id} onError={setError} />
              ) : (
                <p className="text-sm text-mute">The checklist, discussion, files and links open once the task is created.</p>
              )}
            </div>

            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize the details panel"
              aria-valuemin={RAIL_MIN}
              aria-valuemax={RAIL_MAX}
              aria-valuenow={rail}
              tabIndex={0}
              title="Drag to resize · double-click to reset"
              className="hidden w-1.5 flex-none cursor-col-resize touch-none bg-line/60 hover:bg-ghost focus:bg-ghost md:block"
              onPointerDown={(e) => {
                capture(e);
                dragFrom.current = { x: e.clientX, w: rail };
              }}
              onPointerMove={(e) => dragFrom.current && setRail(clampRail(dragFrom.current.w - (e.clientX - dragFrom.current.x)))}
              onPointerUp={() => {
                if (dragFrom.current) setRailSaved(rail);
                dragFrom.current = null;
              }}
              onDoubleClick={() => setRailSaved(RAIL_DEFAULT)}
              onKeyDown={(e) => {
                const step = e.shiftKey ? 64 : 16;
                if (e.key === "ArrowLeft") setRailSaved(rail + step);
                if (e.key === "ArrowRight") setRailSaved(rail - step);
                if (e.key === "Home") setRailSaved(RAIL_DEFAULT);
              }}
            />

            <aside className="ws-facts flex-none space-y-6 border-t border-line bg-card px-5 py-5 md:overflow-y-auto md:border-t-0" style={{ "--rail": `${rail}px` } as React.CSSProperties}>
              <div>
                <span className="ws-label">Status</span>
                <div className="flex flex-col gap-1" role="radiogroup" aria-label="Status">
                  {TASK_STATUSES.map((s) => {
                    const locked = s === "done" && !canSignOff;
                    const on = draft.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-disabled={locked}
                        title={locked ? signOffMessage : undefined}
                        onClick={() => (locked ? setError(signOffMessage) : set("status", s))}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm ${on ? "border-ink bg-paper" : "border-line hover:border-ghost"} ${locked ? "opacity-45" : ""}`}
                      >
                        <StatusDot status={s} />
                        {STATUS_LABEL[s]}
                      </button>
                    );
                  })}
                </div>
                {draft.status === "done" && task?.status !== "done" && unticked > 0 && (
                  <p className="mt-2 text-xs text-mute">
                    The checklist below still has {unticked} unticked step{unticked === 1 ? "" : "s"}.
                  </p>
                )}
              </div>

              <div>
                <span className="ws-label">Priority</span>
                <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Priority">
                  {TASK_PRIORITIES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={draft.priority === p}
                      onClick={() => set("priority", p)}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-1.5 text-xs ${draft.priority === p ? "border-ink bg-paper" : "border-line hover:border-ghost"}`}
                    >
                      <span className="h-1 w-5 rounded-full" style={{ background: PRIORITY_COLOR[p] }} />
                      {PRIORITY_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="ws-label" htmlFor="t-owner">Owner</label>
                <select id="t-owner" className="ws-input" value={draft.assignee_id ?? ""} onChange={(e) => set("assignee_id", e.target.value || null)}>
                  <option value="">Nobody yet</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email} — {p.role === "partner" ? "Partner" : "Member"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ws-label" htmlFor="t-start">Starts</label>
                  <input id="t-start" type="date" className="ws-input" value={draft.start_date ?? ""} max={draft.due_date ?? undefined} onChange={(e) => set("start_date", e.target.value || null)} />
                </div>
                <div>
                  <label className="ws-label" htmlFor="t-due">Due</label>
                  <input
                    id="t-due"
                    type="date"
                    className={`ws-input ${missingDue ? "!border-[#b42318]" : ""}`}
                    value={draft.due_date ?? ""}
                    min={draft.start_date ?? undefined}
                    onChange={(e) => set("due_date", e.target.value || null)}
                  />
                </div>
                {datesBackwards && <p className="col-span-2 text-xs text-[#b42318]">The due date is before the start date.</p>}
                {missingDue && (
                  <p className="col-span-2 text-xs text-[#b42318]">Every task needs a deadline. Without one it can never be late, so nobody is ever told to chase it.</p>
                )}
                {draft.due_date && !draft.start_date && (
                  <p className="col-span-2 text-xs text-mute">No start date — the timeline draws this as a milestone on its due date.</p>
                )}
              </div>

              <div>
                <label className="ws-label" htmlFor="t-progress">Progress {draft.progress}%</label>
                <input
                  id="t-progress"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  className="w-full accent-[#140700]"
                  value={draft.progress}
                  onChange={(e) => set("progress", Number(e.target.value))}
                />
                {draft.status === "done" && task?.status !== "done" ? (
                  <p className="text-xs text-mute">Moving this to Done saves it at 100%.</p>
                ) : willComplete ? (
                  <p className="text-xs text-mute">Saving at 100% marks this task Done.</p>
                ) : draft.progress === 100 && draft.status !== "done" ? (
                  <p className="text-xs text-mute">
                    At 100% but not marked Done —{" "}
                    <button className="underline" onClick={() => (canSignOff ? set("status", "done") : setError(signOffMessage))}>
                      mark it Done
                    </button>
                  </p>
                ) : null}
              </div>

              {task && (
                <div>
                  <span className="ws-label">Waiting on</span>
                  {waitsOn.length === 0 ? (
                    <p className="mb-2 text-sm text-mute">Nothing — this can start whenever.</p>
                  ) : (
                    <ul className="mb-2 space-y-1.5">
                      {waitsOn.map((d) => (
                        <li key={d.id} className="flex items-center gap-2 text-sm">
                          <span className="text-mute"><LinkIcon /></span>
                          <span className={`min-w-0 flex-1 truncate ${d.status === "done" ? "text-mute line-through" : ""}`}>{d.title}</span>
                          <StatusPill status={d.status} label={STATUS_LABEL[d.status]} />
                          <button className="text-mute hover:text-ink" onClick={() => unlink(task.id, d.id)} aria-label={`Stop waiting on ${d.title}`}>✕</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <select className="ws-input" value={linkTo} onChange={(e) => setLinkTo(e.target.value)} aria-label="Add a task this waits on">
                      <option value="">Add a task this waits on…</option>
                      {linkable.map((s) => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                    <button className="ws-btn" disabled={!linkTo} onClick={link}>Link</button>
                  </div>
                  {holdingUp.length > 0 && (
                    <div className="mt-4">
                      <span className="ws-label">
                        Holding up — {holdingUp.length} task{holdingUp.length === 1 ? "" : "s"} can’t start until this is done
                      </span>
                      <ul className="space-y-1.5">
                        {holdingUp.map((d) => (
                          <li key={d.id} className="flex items-center gap-2 text-sm">
                            <span className="min-w-0 flex-1 truncate">{d.title}</span>
                            <StatusPill status={d.status} label={STATUS_LABEL[d.status]} />
                            <button className="text-mute hover:text-ink" onClick={() => unlink(d.id, task.id)} aria-label={`Stop ${d.title} waiting on this task`}>✕</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {task && (
                <dl className="space-y-1 border-t border-line pt-4 text-xs text-mute">
                  {task.completed_at && (
                    <div className="flex justify-between gap-3">
                      <dt>Completed</dt>
                      <dd>{fullTime(task.completed_at)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt>Created</dt>
                    <dd>{fullTime(task.created_at)}</dd>
                  </div>
                </dl>
              )}
            </aside>
          </div>
        )}

        <footer className="flex items-center gap-2 border-t border-line bg-paper px-5 py-3">
          {task && <TwoTap label="Delete" armedLabel="Tap again to delete" onConfirm={removeTask} />}
          <span className="flex-1" />
          <button className="ws-btn" onClick={close}>Cancel</button>
          <button className="ws-btn ws-btn--primary" disabled={!canSave} onClick={save}>
            {saving ? "Saving…" : task ? "Save" : "Create task"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function AutoGrow({
  value,
  onChange,
  ...rest
}: { value: string; onChange: (v: string) => void } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return <textarea ref={ref} {...rest} value={value} onChange={(e) => onChange(e.target.value)} />;
}

/** Pointer capture keeps a drag alive off the element; some pointers refuse it. */
function capture(e: React.PointerEvent) {
  try {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  } catch {}
}
