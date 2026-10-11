"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errorText, formatBytes, objectKey, openObject, removeObjects, uploadObject } from "@/lib/workspace/files";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import type { CompanyDocument, DocumentFolder } from "@/lib/workspace/types";
import ConfirmButton from "../ConfirmButton";
import Modal from "../Modal";
import { useWorkspace } from "../WorkspaceContext";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.csv,.txt,.png,.jpg,.jpeg,.webp,.gif";
const ACCEPT_EXT = ACCEPT.split(",").map((e) => e.slice(1));

export default function DocumentsApp() {
  const { nameOf } = useWorkspace();
  const supabase = supabaseBrowser();
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [docs, setDocs] = useState<CompanyDocument[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [folderDialog, setFolderDialog] = useState<DocumentFolder | "new" | null>(null);
  const [editing, setEditing] = useState<CompanyDocument | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [f, d] = await Promise.all([
      supabase.from("document_folders").select("id, parent_id, name").order("name"),
      supabase.from("documents").select("*").order("name"),
    ]);
    if (f.error || d.error) setError((f.error ?? d.error)!.message);
    setFolders((f.data ?? []) as DocumentFolder[]);
    setDocs((d.data ?? []) as CompanyDocument[]);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
  }, [load]);

  const byId = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);
  const trail = useMemo(() => {
    const out: DocumentFolder[] = [];
    let cur = folderId ? byId.get(folderId) : undefined;
    while (cur) {
      out.unshift(cur);
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
    return out;
  }, [folderId, byId]);
  const pathOf = (id: string) => {
    const names: string[] = [];
    let cur = byId.get(id);
    while (cur) {
      names.unshift(cur.name);
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
    return names.join(" / ");
  };

  const q = search.trim().toLowerCase();
  const subfolders = q ? [] : folders.filter((f) => f.parent_id === folderId);
  const shownDocs = q
    ? docs.filter((d) => d.name.toLowerCase().includes(q) || (d.description ?? "").toLowerCase().includes(q))
    : docs.filter((d) => d.folder_id === folderId);
  const countIn = (id: string) =>
    folders.filter((f) => f.parent_id === id).length + docs.filter((d) => d.folder_id === id).length;

  async function upload(list: FileList | null) {
    if (!list?.length || !folderId) return;
    setUploading(true);
    setError(null);
    try {
      // Check the whole batch first, so a bad file doesn't leave half of it uploaded.
      for (const file of Array.from(list)) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!ACCEPT_EXT.includes(ext)) throw new Error(`${file.name}: that file type isn't accepted`);
        if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is over 20 MB`);
      }
      for (const file of Array.from(list)) {
        const key = objectKey(folderId, file);
        await uploadObject("company-documents", key, file);
        const { error } = await supabase.from("documents").insert({
          folder_id: folderId,
          name: file.name,
          storage_path: key,
          mime_type: file.type || null,
          file_size: file.size,
        });
        if (error) {
          await removeObjects("company-documents", [key]);
          throw error;
        }
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      await load();
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removeDoc(d: CompanyDocument) {
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) return setError(error.message);
    await removeObjects("company-documents", [d.storage_path]);
    setEditing(null);
    load();
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <h1 className="font-serif text-3xl">Documents</h1>
        <div className="flex flex-wrap gap-2">
          <input className="ws-input !w-56" placeholder="Search all documents" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="ws-btn" onClick={() => setFolderDialog("new")}>New folder</button>
          {folderId && (
            <>
              <input ref={fileInput} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => upload(e.target.files)} />
              <button className="ws-btn ws-btn--primary" disabled={uploading} onClick={() => fileInput.current?.click()}>
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </>
          )}
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-[#fef3f2] text-[#b42318] px-3 py-2 text-sm" role="alert">
          {error} <button className="underline ml-2" onClick={() => setError(null)}>Dismiss</button>
        </p>
      )}

      {!q && (
        <nav className="flex flex-wrap items-center gap-1 text-sm mb-4" aria-label="Folder path">
          <button className={`hover:underline ${folderId ? "text-mute" : ""}`} onClick={() => setFolderId(null)}>All folders</button>
          {trail.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1">
              <span className="text-ghost">/</span>
              <button className={`hover:underline ${i < trail.length - 1 ? "text-mute" : ""}`} onClick={() => setFolderId(f.id)}>{f.name}</button>
            </span>
          ))}
          {folderId && (
            <button className="ml-3 text-mute underline underline-offset-2" onClick={() => setFolderDialog(byId.get(folderId)!)}>
              Rename or move
            </button>
          )}
        </nav>
      )}

      <div className="rounded-2xl border border-line bg-card divide-y divide-line">
        {subfolders.map((f) => (
          <button key={f.id} onClick={() => setFolderId(f.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper">
            <FolderIcon />
            <span className="flex-1">{f.name}</span>
            <span className="text-xs text-mute">{countIn(f.id) || "Empty"}</span>
          </button>
        ))}
        {shownDocs.map((d) => (
          <div key={d.id} className="flex items-center gap-3 px-4 py-3">
            <FileIcon name={d.name} />
            <button className="flex-1 min-w-0 text-left" onClick={() => openObject("company-documents", d.storage_path).catch((e) => setError(errorText(e)))}>
              <span className="block truncate hover:underline">{d.name}</span>
              <span className="block text-xs text-mute truncate">
                {q && `${pathOf(d.folder_id)} · `}
                {formatBytes(d.file_size)} · {nameOf(d.uploaded_by)} · {new Date(d.created_at).toLocaleDateString("en-IN")}
                {d.description && ` · ${d.description}`}
              </span>
            </button>
            <button className="ws-btn !px-3 !py-1 text-xs" onClick={() => openObject("company-documents", d.storage_path, d.name).catch((e) => setError(errorText(e)))}>Download</button>
            <button className="ws-btn !px-3 !py-1 text-xs" onClick={() => setEditing(d)}>Edit</button>
          </div>
        ))}
        {!subfolders.length && !shownDocs.length && (
          <p className="px-4 py-10 text-center text-mute">
            {q ? "No documents match." : folderId ? "This folder is empty. Upload files or add a subfolder." : "Create a folder to start filing documents."}
          </p>
        )}
      </div>

      {folderDialog && (
        <FolderDialog
          folder={folderDialog === "new" ? null : folderDialog}
          parentId={folderId}
          folders={folders}
          isEmpty={folderDialog !== "new" && countIn(folderDialog.id) === 0}
          pathOf={pathOf}
          onClose={() => setFolderDialog(null)}
          onDone={(goTo) => {
            setFolderDialog(null);
            if (goTo !== undefined) setFolderId(goTo);
            load();
          }}
        />
      )}

      {editing && (
        <DocDialog
          doc={editing}
          folders={folders}
          pathOf={pathOf}
          onClose={() => setEditing(null)}
          onDelete={() => removeDoc(editing)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function FolderDialog({
  folder,
  parentId,
  folders,
  isEmpty,
  pathOf,
  onClose,
  onDone,
}: {
  folder: DocumentFolder | null;
  parentId: string | null;
  folders: DocumentFolder[];
  isEmpty: boolean;
  pathOf: (id: string) => string;
  onClose: () => void;
  onDone: (goTo?: string | null) => void;
}) {
  const supabase = supabaseBrowser();
  const [name, setName] = useState(folder?.name ?? "");
  const [parent, setParent] = useState(folder ? (folder.parent_id ?? "") : (parentId ?? ""));
  const [error, setError] = useState<string | null>(null);

  // A folder can't move inside itself or any descendant.
  const blocked = new Set<string>();
  if (folder) {
    const stack = [folder.id];
    while (stack.length) {
      const id = stack.pop()!;
      blocked.add(id);
      folders.filter((f) => f.parent_id === id).forEach((f) => stack.push(f.id));
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const row = { name: name.trim(), parent_id: parent || null };
    const { data, error } = folder
      ? await supabase.from("document_folders").update(row).eq("id", folder.id).select("id").single()
      : await supabase.from("document_folders").insert(row).select("id").single();
    if (error) return setError(error.code === "23505" ? "A folder with that name is already there." : error.message);
    onDone(folder ? undefined : data.id);
  }

  async function remove() {
    if (!folder) return;
    const { error } = await supabase.from("document_folders").delete().eq("id", folder.id);
    if (error) return setError(error.code === "23503" ? "Empty the folder first." : error.message);
    onDone(folder.parent_id);
  }

  return (
    <Modal title={folder ? "Folder" : "New folder"} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="ws-label" htmlFor="f-name">Name</label>
          <input id="f-name" className="ws-input" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="ws-label" htmlFor="f-parent">Inside</label>
          <select id="f-parent" className="ws-input" value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">Top level</option>
            {folders
              .filter((f) => !blocked.has(f.id))
              .map((f) => ({ id: f.id, path: pathOf(f.id) }))
              .sort((a, b) => a.path.localeCompare(b.path))
              .map((f) => (
                <option key={f.id} value={f.id}>{f.path}</option>
              ))}
          </select>
        </div>
        {error && <p className="text-sm text-[#b42318]">{error}</p>}
        <div className="flex items-center justify-between pt-2">
          {folder && isEmpty ? <ConfirmButton label="Delete folder" onConfirm={remove} /> : <span className="text-xs text-mute">{folder ? "Only empty folders can be deleted." : ""}</span>}
          <button className="ws-btn ws-btn--primary" type="submit">{folder ? "Save" : "Create"}</button>
        </div>
      </form>
    </Modal>
  );
}

function DocDialog({
  doc,
  folders,
  pathOf,
  onClose,
  onSaved,
  onDelete,
}: {
  doc: CompanyDocument;
  folders: DocumentFolder[];
  pathOf: (id: string) => string;
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const supabase = supabaseBrowser();
  const [name, setName] = useState(doc.name);
  const [description, setDescription] = useState(doc.description ?? "");
  const [folderId, setFolderId] = useState(doc.folder_id);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from("documents")
      .update({ name: name.trim(), description: description.trim() || null, folder_id: folderId })
      .eq("id", doc.id);
    if (error) return setError(error.message);
    onSaved();
  }

  return (
    <Modal title="Document" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="ws-label" htmlFor="d-name">Name</label>
          <input id="d-name" className="ws-input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="ws-label" htmlFor="d-desc">Description</label>
          <textarea id="d-desc" className="ws-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="ws-label" htmlFor="d-folder">Folder</label>
          <select id="d-folder" className="ws-input" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
            {folders
              .map((f) => ({ id: f.id, path: pathOf(f.id) }))
              .sort((a, b) => a.path.localeCompare(b.path))
              .map((f) => (
                <option key={f.id} value={f.id}>{f.path}</option>
              ))}
          </select>
        </div>
        {error && <p className="text-sm text-[#b42318]">{error}</p>}
        <div className="flex items-center justify-between pt-2">
          <ConfirmButton label="Delete" confirmLabel="Delete this file?" onConfirm={onDelete} />
          <button className="ws-btn ws-btn--primary" type="submit">Save</button>
        </div>
      </form>
    </Modal>
  );
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-mute flex-none" aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toUpperCase().slice(0, 4) ?? "";
  return (
    <span className="flex-none grid place-items-center w-9 h-7 rounded-md bg-cream text-[10px] font-medium text-body" aria-hidden>
      {ext}
    </span>
  );
}
