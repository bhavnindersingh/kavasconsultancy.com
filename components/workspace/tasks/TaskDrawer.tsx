"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { notifyAssigned, notifyComment, notifyReadyForSignOff } from "@/app/(workspace)/workspace/(app)/tasks/actions";
import { errorText, formatBytes, objectKey, openObject, removeObjects, uploadObject } from "@/lib/workspace/files";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import {
  STATUS_LABEL,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskBoard,
  type TaskComment,
  type TaskEvent,
  type TaskFile,
  type TaskSubtask,
} from "@/lib/workspace/types";
import { changed, useLive } from "@/lib/workspace/useLive";
import ConfirmButton from "../ConfirmButton";
import Modal from "../Modal";
import { useWorkspace } from "../WorkspaceContext";
import ActivityTrail from "./ActivityTrail";
import { STATUS_COLOR } from "./bits";

type Linked = Pick<Task, "id" | "title" | "status">;

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export default function TaskDrawer({
  taskId,
  board,
  onClose,
  onChanged,
  onDeleted,
}: {
  taskId: string;
  board: TaskBoard;
  onClose: () => void;
  onChanged: (t: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const { me, people, nameOf } = useWorkspace();
  const supabase = supabaseBrowser();
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [waitsOn, setWaitsOn] = useState<Linked[]>([]);
  const [blocks, setBlocks] = useState<Linked[]>([]);
  const [siblings, setSiblings] = useState<Linked[]>([]);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [t, s, c, f, w, b, sib, ev] = await Promise.all([
      supabase.from("tasks").select("*").eq("id", taskId).single(),
      supabase.from("task_subtasks").select("*").eq("task_id", taskId).order("sort_order").order("created_at"),
      supabase.from("task_comments").select("*").eq("task_id", taskId).order("created_at"),
      supabase.from("task_files").select("*").eq("task_id", taskId).order("created_at"),
      supabase
        .from("task_dependencies")
        .select("task:tasks!task_dependencies_depends_on_task_id_fkey(id, title, status)")
        .eq("task_id", taskId),
      supabase
        .from("task_dependencies")
        .select("task:tasks!task_dependencies_task_id_fkey(id, title, status)")
        .eq("depends_on_task_id", taskId),
      supabase.from("tasks").select("id, title, status").eq("board_id", board.id).neq("id", taskId).order("sort_order"),
      supabase.from("task_events").select("*").eq("task_id", taskId).order("seq", { ascending: false }).limit(200),
    ]);
    if (t.error) return setError(t.error.message);
    const linked = (rows: unknown) => ((rows ?? []) as unknown as { task: Linked | null }[]).flatMap((r) => (r.task ? [r.task] : []));
    setTask(t.data as Task);
    setSubtasks((s.data ?? []) as TaskSubtask[]);
    setComments((c.data ?? []) as TaskComment[]);
    setFiles((f.data ?? []) as TaskFile[]);
    setWaitsOn(linked(w.data));
    setBlocks(linked(b.data));
    setSiblings((sib.data ?? []) as Linked[]);
    setEvents((ev.data ?? []) as TaskEvent[]);
  }, [supabase, taskId, board.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on open
    load();
  }, [load]);

  // Someone else editing this task, its parts, or a task it's linked to.
  useLive(
    `task-${taskId}`,
    ["tasks", "task_subtasks", "task_comments", "task_files", "task_dependencies", "task_events"],
    (c) => {
      const id = changed(c, "id");
      if (c.table === "tasks") return id === taskId || [...waitsOn, ...blocks].some((x) => x.id === id);
      if (c.table === "task_dependencies") return changed(c, "task_id") === taskId || changed(c, "depends_on_task_id") === taskId;
      if (changed(c, "task_id") === taskId) return true;
      const mine: { id: string }[] = c.table === "task_subtasks" ? subtasks : c.table === "task_comments" ? comments : c.table === "task_files" ? files : [];
      return mine.some((x) => x.id === id);
    },
    load,
  );

  async function link(dependsOn: string) {
    if (!dependsOn) return;
    setError(null);
    const { error } = await supabase.from("task_dependencies").insert({ task_id: taskId, depends_on_task_id: dependsOn });
    if (error) return setError(error.message);
    load();
  }

  async function unlink(dependsOn: string) {
    const { error } = await supabase.from("task_dependencies").delete().eq("task_id", taskId).eq("depends_on_task_id", dependsOn);
    if (error) return setError(error.message);
    load();
  }

  async function patch(fields: Partial<Task>) {
    if (!task) return;
    const prev = task;
    setTask({ ...task, ...fields });
    setError(null);
    const { data, error } = await supabase.from("tasks").update(fields).eq("id", task.id).select().single();
    if (error) {
      setTask(prev);
      return setError(error.message);
    }
    setTask(data as Task);
    onChanged(data as Task);
    refreshEvents();
    // Emails, fire and forget: the save has landed whatever happens to them.
    if (fields.assignee_id && fields.assignee_id !== prev.assignee_id) notifyAssigned(task.id).catch(() => {});
    if (fields.status === "quality_check" && prev.status !== "quality_check") notifyReadyForSignOff(task.id).catch(() => {});
  }

  async function refreshEvents() {
    const { data } = await supabase.from("task_events").select("*").eq("task_id", taskId).order("seq", { ascending: false }).limit(200);
    if (data) setEvents(data as TaskEvent[]);
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    const { data, error } = await supabase
      .from("task_subtasks")
      .insert({ task_id: taskId, title: newSubtask.trim(), sort_order: subtasks.length + 1 })
      .select()
      .single();
    if (error) return setError(error.message);
    setSubtasks((s) => [...s, data as TaskSubtask]);
    setNewSubtask("");
  }

  async function toggleSubtask(s: TaskSubtask) {
    setSubtasks((all) => all.map((x) => (x.id === s.id ? { ...x, is_done: !x.is_done } : x)));
    const { error } = await supabase.from("task_subtasks").update({ is_done: !s.is_done }).eq("id", s.id);
    if (error) {
      setError(error.message);
      load();
    }
  }

  async function removeSubtask(id: string) {
    const { error } = await supabase.from("task_subtasks").delete().eq("id", id);
    if (error) return setError(error.message);
    setSubtasks((all) => all.filter((x) => x.id !== id));
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    const { data, error } = await supabase
      .from("task_comments")
      .insert({ task_id: taskId, author_id: me.id, body: comment.trim() })
      .select()
      .single();
    if (error) return setError(error.message);
    setComments((c) => [...c, data as TaskComment]);
    setComment("");
    notifyComment((data as TaskComment).id).catch(() => {});
  }

  async function removeComment(id: string) {
    const { error } = await supabase.from("task_comments").delete().eq("id", id);
    if (error) return setError(error.message);
    setComments((c) => c.filter((x) => x.id !== id));
  }

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(list)) {
        if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is over 10 MB`);
        const key = objectKey(taskId, file);
        await uploadObject("task-files", key, file);
        const { data, error } = await supabase
          .from("task_files")
          .insert({ task_id: taskId, name: file.name, storage_path: key, mime_type: file.type || null, file_size: file.size })
          .select()
          .single();
        if (error) {
          await removeObjects("task-files", [key]);
          throw error;
        }
        setFiles((f) => [...f, data as TaskFile]);
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removeFile(f: TaskFile) {
    const { error } = await supabase.from("task_files").delete().eq("id", f.id);
    if (error) return setError(error.message);
    await removeObjects("task-files", [f.storage_path]);
    setFiles((all) => all.filter((x) => x.id !== f.id));
  }

  async function removeTask() {
    if (!task) return;
    const keys = files.map((f) => f.storage_path);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) return setError(error.message);
    await removeObjects("task-files", keys);
    onDeleted(task.id);
  }

  const canSignOff = !board.owner_id || board.owner_id === me.id || me.role === "partner";
  const doneCount = subtasks.filter((s) => s.is_done).length;

  return (
    <Modal title={task?.title ?? "Task"} onClose={onClose} side>
      {!task ? (
        <p className="text-mute">{error ?? "Loading…"}</p>
      ) : (
        <div className="space-y-6">
          {error && <p className="rounded-lg bg-[#fef3f2] text-[#b42318] px-3 py-2 text-sm" role="alert">{error}</p>}

          <BlurInput
            className="ws-input !text-lg font-medium"
            value={task.title}
            onCommit={(v) => v.trim() && v !== task.title && patch({ title: v.trim() })}
            aria-label="Title"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ws-label" htmlFor="t-status">Status</label>
              <select id="t-status" className="ws-input" value={task.status} onChange={(e) => patch({ status: e.target.value as Task["status"] })}>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s} disabled={s === "done" && !canSignOff && task.status !== "done"}>
                    {STATUS_LABEL[s]}
                    {s === "done" && !canSignOff ? ` (${nameOf(board.owner_id)} signs off)` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ws-label" htmlFor="t-priority">Priority</label>
              <select id="t-priority" className="ws-input capitalize" value={task.priority} onChange={(e) => patch({ priority: e.target.value as Task["priority"] })}>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="ws-label" htmlFor="t-assignee">Assignee</label>
              <select id="t-assignee" className="ws-input" value={task.assignee_id ?? ""} onChange={(e) => patch({ assignee_id: e.target.value || null })}>
                <option value="">Unassigned</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="ws-label" htmlFor="t-start">Start</label>
              <input id="t-start" type="date" className="ws-input" value={task.start_date ?? ""} max={task.due_date ?? undefined} onChange={(e) => patch({ start_date: e.target.value || null })} />
            </div>
            <div>
              <label className="ws-label" htmlFor="t-due">Due</label>
              <input id="t-due" type="date" className="ws-input" value={task.due_date ?? ""} min={task.start_date ?? undefined} onChange={(e) => patch({ due_date: e.target.value || null })} />
            </div>
            <div className="col-span-2">
              <label className="ws-label" htmlFor="t-progress">Progress — {task.progress}%</label>
              <input
                id="t-progress"
                type="range"
                min={0}
                max={100}
                step={5}
                className="w-full accent-[#140700]"
                defaultValue={task.progress}
                key={task.progress}
                onPointerUp={(e) => patch({ progress: Number((e.target as HTMLInputElement).value) })}
                onKeyUp={(e) => patch({ progress: Number((e.target as HTMLInputElement).value) })}
              />
            </div>
          </div>

          <div>
            <label className="ws-label" htmlFor="t-desc">Description</label>
            <BlurInput
              id="t-desc"
              multiline
              className="ws-input min-h-24"
              value={task.description ?? ""}
              onCommit={(v) => v !== (task.description ?? "") && patch({ description: v.trim() || null })}
            />
          </div>

          <section>
            <h3 className="text-sm font-medium mb-2">
              Subtasks {subtasks.length > 0 && <span className="text-mute font-normal">{doneCount}/{subtasks.length}</span>}
            </h3>
            <ul className="space-y-1 mb-2">
              {subtasks.map((s) => (
                <li key={s.id} className="group flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={s.is_done} onChange={() => toggleSubtask(s)} aria-label={s.title} />
                  <span className={`flex-1 ${s.is_done ? "line-through text-mute" : ""}`}>{s.title}</span>
                  <button className="text-mute opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => removeSubtask(s.id)} aria-label="Remove subtask">✕</button>
                </li>
              ))}
            </ul>
            <form onSubmit={addSubtask}>
              <input className="ws-input" placeholder="Add a subtask" value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} />
            </form>
          </section>

          <section>
            <h3 className="text-sm font-medium mb-2">
              Waiting on {waitsOn.length > 0 && <span className="text-mute font-normal">{waitsOn.filter((x) => x.status !== "done").length} open</span>}
            </h3>
            <ul className="space-y-1 mb-2">
              {waitsOn.map((d) => (
                <li key={d.id} className="group flex items-center gap-2 text-sm">
                  <span className="inline-block size-2 flex-none rounded-full" style={{ background: STATUS_COLOR[d.status] }} title={STATUS_LABEL[d.status]} />
                  <span className={`flex-1 truncate ${d.status === "done" ? "line-through text-mute" : ""}`}>{d.title}</span>
                  <span className="text-xs text-mute">{STATUS_LABEL[d.status]}</span>
                  <button className="text-mute opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => unlink(d.id)} aria-label={`Stop waiting on ${d.title}`}>✕</button>
                </li>
              ))}
            </ul>
            <select className="ws-input" value="" onChange={(e) => link(e.target.value)} aria-label="Add a task this one waits on">
              <option value="">{siblings.length ? "+ Waits on another task on this board…" : "No other tasks on this board"}</option>
              {siblings
                .filter((x) => !waitsOn.some((d) => d.id === x.id))
                .map((x) => (
                  <option key={x.id} value={x.id}>{x.title}</option>
                ))}
            </select>
            {blocks.length > 0 && (
              <p className="mt-2 text-xs text-mute">
                Holding up: {blocks.map((b) => b.title).join(", ")}
              </p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-medium mb-2">Files</h3>
            <ul className="space-y-1 mb-2">
              {files.map((f) => (
                <li key={f.id} className="group flex items-center gap-2 text-sm">
                  <button className="flex-1 truncate text-left underline underline-offset-2" onClick={() => openObject("task-files", f.storage_path).catch((e) => setError(errorText(e)))}>
                    {f.name}
                  </button>
                  <span className="text-mute text-xs">{formatBytes(f.file_size)}</span>
                  <button className="text-mute opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => removeFile(f)} aria-label={`Remove ${f.name}`}>✕</button>
                </li>
              ))}
            </ul>
            <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
            <button className="ws-btn" disabled={uploading} onClick={() => fileInput.current?.click()}>
              {uploading ? "Uploading…" : "Attach files"}
            </button>
          </section>

          <section>
            <h3 className="text-sm font-medium mb-2">Comments</h3>
            <ul className="space-y-3 mb-3">
              {comments.map((c) => (
                <li key={c.id} className="group rounded-xl bg-card border border-line p-3 text-sm">
                  <div className="flex justify-between text-xs text-mute mb-1">
                    <span>{nameOf(c.author_id)} · {new Date(c.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                    {(c.author_id === me.id || me.role === "partner") && (
                      <button className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => removeComment(c.id)}>Delete</button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap">{c.body}</p>
                </li>
              ))}
            </ul>
            <form onSubmit={addComment} className="flex gap-2">
              <input className="ws-input" placeholder="Write a comment" value={comment} onChange={(e) => setComment(e.target.value)} />
              <button className="ws-btn" type="submit">Post</button>
            </form>
          </section>

          <ActivityTrail events={events} />

          <div className="border-t border-line pt-4 flex justify-between items-center text-xs text-mute">
            <span>
              Created {new Date(task.created_at).toLocaleDateString("en-IN")}
              {task.completed_at && ` · Done ${new Date(task.completed_at).toLocaleDateString("en-IN")}`}
            </span>
            <ConfirmButton label="Delete task" confirmLabel="Delete for good?" onConfirm={removeTask} />
          </div>
        </div>
      )}
    </Modal>
  );
}

/** A text field that saves when you leave it, not on every keystroke. */
function BlurInput({
  value,
  onCommit,
  multiline,
  ...rest
}: { value: string; onCommit: (v: string) => void; multiline?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setDraft(value);
  }
  if (multiline)
    return (
      <textarea
        id={rest.id}
        className={rest.className}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft)}
      />
    );
  return (
    <input
      {...rest}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}
