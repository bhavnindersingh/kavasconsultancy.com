"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { notifyComment } from "@/app/(workspace)/workspace/(app)/tasks/actions";
import { errorText, formatBytes, objectKey, openObject, removeObjects, uploadObject } from "@/lib/workspace/files";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import type { TaskComment, TaskEvent, TaskFile } from "@/lib/workspace/types";
import { changed, useLive } from "@/lib/workspace/useLive";
import { useWorkspace } from "../WorkspaceContext";
import { describeEvent } from "./ActivityTrail";
import { Disc, fullTime, relativeTime } from "./bits";
import TwoTap from "./TwoTap";

// A saved task's record: what was said, what's attached, what changed.
// Each panel fetches when it opens and refreshes live. Comment and file counts
// are deliberately not shown on cards — the card is for deciding what to do.

type Tab = "discussion" | "files" | "activity";

export default function TaskRecord({ taskId, onError }: { taskId: string; onError: (msg: string) => void }) {
  const [tab, setTab] = useState<Tab>("discussion");
  return (
    <section>
      <div className="flex gap-1 border-b border-line mb-4" role="tablist">
        {(["discussion", "files", "activity"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm capitalize ${tab === t ? "border-ink text-ink" : "border-transparent text-mute hover:text-ink"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "discussion" && <Discussion taskId={taskId} onError={onError} />}
      {tab === "files" && <Files taskId={taskId} onError={onError} />}
      {tab === "activity" && <Activity taskId={taskId} />}
    </section>
  );
}

// ── Discussion ─────────────────────────────────────────────────────────────

function Discussion({ taskId, onError }: { taskId: string; onError: (msg: string) => void }) {
  const { me, nameOf } = useWorkspace();
  const supabase = supabaseBrowser();
  const [comments, setComments] = useState<TaskComment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("task_comments").select("*").eq("task_id", taskId).order("created_at");
    if (error) onError(error.message);
    setComments((data ?? []) as TaskComment[]);
  }, [supabase, taskId, onError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on open
    load();
  }, [load]);
  useLive(`comments-${taskId}`, ["task_comments"], (c) => changed(c, "task_id") === taskId || !!comments?.some((x) => x.id === changed(c, "id")), load);

  async function post() {
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    const { data, error } = await supabase.from("task_comments").insert({ task_id: taskId, body }).select().single();
    setPosting(false);
    if (error) return onError(error.message);
    setComments((c) => [...(c ?? []), data as TaskComment]);
    setDraft("");
    notifyComment((data as TaskComment).id).catch(() => {});
  }

  async function saveEdit() {
    if (!editing) return;
    const body = editing.body.trim();
    if (!body) return onError("A comment cannot be emptied — delete it instead.");
    const { data, error } = await supabase.from("task_comments").update({ body }).eq("id", editing.id).select();
    if (error) return onError(error.message);
    if (!data?.length) return onError("Only the person who wrote a comment can edit it.");
    setComments((c) => (c ?? []).map((x) => (x.id === editing.id ? (data[0] as TaskComment) : x)));
    setEditing(null);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this comment?")) return;
    const { data, error } = await supabase.from("task_comments").delete().eq("id", id).select("id");
    if (error) return onError(error.message);
    if (!data?.length) return onError("Only the author or a partner can delete a comment.");
    setComments((c) => (c ?? []).filter((x) => x.id !== id));
  }

  return (
    <div>
      {comments && !comments.length && (
        <p className="mb-4 text-sm text-mute">
          The notes above describe the work. Comments record what happened — a quote, a decision, the reason a date moved.
        </p>
      )}
      <ol className="space-y-4 mb-4">
        {(comments ?? []).map((c) => {
          const name = nameOf(c.author_id);
          const mine = c.author_id === me.id;
          return (
            <li key={c.id} className="group flex gap-3">
              <Disc id={c.author_id} name={c.author_id ? name : null} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-medium">{name}</span>
                  <time className="text-xs text-mute" title={fullTime(c.created_at)} dateTime={c.created_at}>
                    {relativeTime(c.created_at)}
                  </time>
                  {c.edited_at && <span className="text-xs text-mute" title={`Edited ${fullTime(c.edited_at)}`}>edited</span>}
                  <span className="ml-auto flex gap-3 text-xs text-mute opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    {mine && editing?.id !== c.id && (
                      <button className="hover:text-ink" onClick={() => setEditing({ id: c.id, body: c.body })}>Edit</button>
                    )}
                    {(mine || me.role === "partner") && (
                      <button className="hover:text-[#b42318]" onClick={() => remove(c.id)}>Delete</button>
                    )}
                  </span>
                </div>
                {editing?.id === c.id ? (
                  <div className="mt-1">
                    <textarea
                      autoFocus
                      className="ws-input min-h-20"
                      value={editing.body}
                      onChange={(e) => setEditing({ id: c.id, body: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          setEditing(null);
                        }
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit();
                      }}
                    />
                    <div className="mt-2 flex gap-2">
                      <button className="ws-btn ws-btn--primary !py-1 text-xs" onClick={saveEdit}>Save</button>
                      <button className="ws-btn !py-1 text-xs" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-0.5 whitespace-pre-wrap text-[14px] text-body">{c.body}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col gap-2">
        <textarea
          className="ws-input min-h-20"
          placeholder="Add a comment…"
          aria-label="Add a comment"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              post();
            }
            if (e.key === "Escape" && draft) {
              e.stopPropagation();
              setDraft("");
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-mute">Ctrl/⌘ + Enter to post</span>
          <button className="ws-btn" disabled={!draft.trim() || posting} onClick={post}>
            {posting ? "Posting…" : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Files ──────────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const FILE_EXTS = ["pdf", "xlsx", "xls", "csv", "doc", "docx", "png", "jpg", "jpeg", "webp", "txt"];
const extOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");

function fileProblem(f: File) {
  if (!FILE_EXTS.includes(extOf(f.name))) return `“${f.name}” isn’t a kind this board takes — PDFs, spreadsheets, documents, images and text.`;
  if (f.size === 0) return `“${f.name}” is empty.`;
  if (f.size > MAX_FILE_BYTES) return `“${f.name}” is ${formatBytes(f.size)} — the limit is 10 MB.`;
  return null;
}

function Files({ taskId, onError }: { taskId: string; onError: (msg: string) => void }) {
  const { nameOf } = useWorkspace();
  const supabase = supabaseBrowser();
  const [files, setFiles] = useState<TaskFile[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("task_files").select("*").eq("task_id", taskId).order("created_at", { ascending: false });
    if (error) onError(error.message);
    setFiles((data ?? []) as TaskFile[]);
  }, [supabase, taskId, onError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on open
    load();
  }, [load]);
  useLive(`files-${taskId}`, ["task_files"], (c) => changed(c, "task_id") === taskId || !!files?.some((x) => x.id === changed(c, "id")), load);

  async function upload(list: FileList | File[] | null) {
    const picked = Array.from(list ?? []);
    if (!picked.length || busy) return;
    const problem = picked.map(fileProblem).find(Boolean);
    if (problem) return onError(problem);
    setBusy(true);
    try {
      for (const file of picked) {
        const key = objectKey(taskId, file);
        await uploadObject("task-files", key, file);
        const { error } = await supabase
          .from("task_files")
          .insert({ task_id: taskId, name: file.name, storage_path: key, mime_type: file.type || null, file_size: file.size });
        if (error) {
          await removeObjects("task-files", [key]);
          throw error;
        }
      }
    } catch (e) {
      onError(errorText(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
      load();
    }
  }

  async function remove(f: TaskFile) {
    const { error } = await supabase.from("task_files").delete().eq("id", f.id);
    if (error) return onError(error.message);
    await removeObjects("task-files", [f.storage_path]);
    setFiles((all) => (all ?? []).filter((x) => x.id !== f.id));
  }

  const open = (f: TaskFile, download?: boolean) =>
    openObject("task-files", f.storage_path, download ? f.name : undefined).catch((e) => {
      const msg = errorText(e);
      onError(/popup|blocked/i.test(msg) ? "Your browser blocked the new tab. Allow pop-ups for this site, or use Download." : msg);
    });

  return (
    <div>
      <label
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center text-sm transition-colors ${over ? "border-ink bg-cream" : "border-ghost hover:border-ink"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          upload(e.dataTransfer.files);
        }}
      >
        <input ref={input} type="file" multiple className="sr-only" accept={FILE_EXTS.map((x) => `.${x}`).join(",")} onChange={(e) => upload(e.target.files)} />
        <span>{busy ? "Uploading…" : "Drop a file here, or choose one"}</span>
      </label>
      <p className="mt-2 mb-4 text-xs text-mute">
        PDFs, spreadsheets, documents, images and text, up to 10 MB. These files belong to this task and are private to the board — they are not in the company document cabinet.
      </p>
      {files && !files.length && <p className="text-sm text-mute">Nothing attached yet.</p>}
      <ul className="divide-y divide-line rounded-xl border border-line bg-card empty:hidden">
        {(files ?? []).map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <span className="rounded bg-paper px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-body">{extOf(f.name) || "file"}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{f.name}</div>
              <div className="text-xs text-mute">
                {[formatBytes(f.file_size), f.uploaded_by ? nameOf(f.uploaded_by) : null, relativeTime(f.created_at)].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button className="ws-btn !px-2.5 !py-1 text-xs" onClick={() => open(f)}>View</button>
              <button className="ws-btn !px-2.5 !py-1 text-xs" onClick={() => open(f, true)}>Download</button>
              <TwoTap label="Remove" armedLabel="Remove?" className="ws-btn ws-btn--danger !px-2.5 !py-1 text-xs" onConfirm={() => remove(f)} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Activity ───────────────────────────────────────────────────────────────

function Activity({ taskId }: { taskId: string }) {
  const supabase = supabaseBrowser();
  const [events, setEvents] = useState<TaskEvent[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("task_events").select("*").eq("task_id", taskId).order("seq", { ascending: false }).limit(200);
    setEvents((data ?? []) as TaskEvent[]);
  }, [supabase, taskId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on open
    load();
  }, [load]);
  useLive(`events-${taskId}`, ["task_events"], (c) => changed(c, "task_id") === taskId, load);

  if (!events) return <p className="text-sm text-mute">Loading…</p>;
  if (!events.length)
    return <p className="text-sm text-mute">Nothing recorded yet. From here on every change — status, owner, dates, links — is logged with who made it.</p>;
  return (
    <ol className="space-y-2 border-l border-line pl-4 text-[13px]">
      {events.map((e) => (
        <li key={e.id}>
          <span className="font-medium">{e.actor_name}</span> <span className="text-body">{describeEvent(e)}</span>{" "}
          <time className="text-xs text-mute" title={fullTime(e.created_at)} dateTime={e.created_at}>
            · {relativeTime(e.created_at)}
          </time>
        </li>
      ))}
    </ol>
  );
}
