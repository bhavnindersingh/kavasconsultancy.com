"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import type { TaskBoard } from "@/lib/workspace/types";
import ConfirmButton from "../ConfirmButton";
import Modal from "../Modal";
import { useWorkspace } from "../WorkspaceContext";

export default function BoardDialog({
  board,
  onClose,
  onSaved,
}: {
  board: TaskBoard | null;
  onClose: () => void;
  onSaved: (id: string | null) => void;
}) {
  const { people } = useWorkspace();
  const supabase = supabaseBrowser();
  const [name, setName] = useState(board?.name ?? "");
  const [description, setDescription] = useState(board?.description ?? "");
  const [ownerId, setOwnerId] = useState(board?.owner_id ?? "");
  const [archived, setArchived] = useState(board?.is_archived ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const row = {
      name: name.trim(),
      description: description.trim() || null,
      owner_id: ownerId || null,
      is_archived: archived,
    };
    const { data, error } = board
      ? await supabase.from("task_boards").update(row).eq("id", board.id).select("id").single()
      : await supabase.from("task_boards").insert(row).select("id").single();
    setPending(false);
    if (error) return setError(error.message);
    onSaved(data.id);
  }

  async function remove() {
    if (!board) return;
    // Files live in storage, not the table — clear them before the cascade.
    const { data: files } = await supabase
      .from("task_files")
      .select("storage_path, tasks!inner(board_id)")
      .eq("tasks.board_id", board.id);
    const { error, count } = await supabase.from("task_boards").delete({ count: "exact" }).eq("id", board.id);
    if (error) return setError(error.message);
    if (!count) return setError("Only the board owner, its creator or a partner can delete it.");
    const keys = (files ?? []).map((f) => f.storage_path);
    if (keys.length) await supabase.storage.from("task-files").remove(keys);
    onSaved(null);
  }

  return (
    <Modal title={board ? "Board settings" : "New board"} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="ws-label" htmlFor="b-name">Name</label>
          <input id="b-name" className="ws-input" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="ws-label" htmlFor="b-desc">Description</label>
          <textarea id="b-desc" className="ws-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="ws-label" htmlFor="b-owner">Signed off by</label>
          <select id="b-owner" className="ws-input" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">No sign-off — anyone can mark tasks done</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
            ))}
          </select>
          <p className="text-xs text-mute mt-1">With an owner, others move finished work to Quality check and the owner marks it Done.</p>
        </div>
        {board && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> Archived
          </label>
        )}
        {error && <p className="text-sm text-[#b42318]">{error}</p>}
        <div className="flex items-center justify-between gap-2 pt-2">
          {board ? <ConfirmButton label="Delete board" confirmLabel="Delete board and all its tasks?" onConfirm={remove} /> : <span />}
          <button type="submit" className="ws-btn ws-btn--primary" disabled={pending}>{board ? "Save" : "Create board"}</button>
        </div>
      </form>
    </Modal>
  );
}
