"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errorText, objectKey, openObject, removeObjects, uploadObject } from "@/lib/workspace/files";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import type { CompanyDocument, DocumentFolder } from "@/lib/workspace/types";
import { useWorkspace } from "../WorkspaceContext";
import {
  ACCEPT,
  CONFIRM_DELETE_MS,
  KIND_WORDS,
  buildTree,
  displayName,
  folderError,
  formatAdded,
  formatBytes,
  kindOf,
  validateFile,
} from "./cabinet";
import FolderRail from "./FolderRail";
import { DownloadIcon, EyeIcon, FolderIcon, KindBadge, MoveIcon, PencilIcon, TrashIcon, UploadIcon } from "./icons";

const BUCKET = "company-documents";
type Banner = { kind: "success" | "error"; text: string } | null;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The company document cabinet — ported from the Conscious Cafe manager:
 * a folder rail on the left, the open folder's subfolders and files on the
 * right, drag-and-drop filing, inline rename / move / two-tap delete. Plus,
 * from the workspace: search across every folder, and a wider set of kinds.
 */
export default function DocumentsApp() {
  const { nameOf } = useWorkspace();
  const supabase = supabaseBrowser();

  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [docs, setDocs] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [banner, setBanner] = useState<Banner>(null);
  const [uploading, setUploading] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);
  const [armedKey, setArmedKey] = useState<string | null>(null);
  const [renamingDoc, setRenamingDoc] = useState<string | null>(null);
  const [movingDoc, setMovingDoc] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const say = useCallback((kind: "success" | "error", text: string) => {
    clearTimeout(bannerTimer.current);
    setBanner({ kind, text });
    if (kind === "success") bannerTimer.current = setTimeout(() => setBanner(null), 3500);
  }, []);

  // One armed delete at a time; it disarms by itself after four seconds.
  const arm = (key: string) => {
    clearTimeout(armTimer.current);
    setArmedKey(key);
    armTimer.current = setTimeout(() => setArmedKey(null), CONFIRM_DELETE_MS);
  };
  const disarm = () => {
    clearTimeout(armTimer.current);
    setArmedKey(null);
  };
  useEffect(() => () => {
    clearTimeout(armTimer.current);
    clearTimeout(bannerTimer.current);
  }, []);

  const load = useCallback(async () => {
    const [f, d] = await Promise.all([
      supabase.from("document_folders").select("id, parent_id, name").order("name"),
      supabase.from("documents").select("*").order("created_at", { ascending: false }),
    ]);
    if (f.error || d.error) say("error", (f.error ?? d.error)!.message);
    const list = (f.data ?? []) as DocumentFolder[];
    setFolders(list);
    setDocs((d.data ?? []) as CompanyDocument[]);
    // Keep the open folder if it survived; otherwise the first, alphabetically.
    setFolderId((cur) => (cur && list.some((x) => x.id === cur) ? cur : (list[0]?.id ?? null)));
    setLoading(false);
  }, [supabase, say]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
  }, [load]);

  // A file dropped anywhere else on the page must not make the browser
  // navigate away to it.
  useEffect(() => {
    const swallow = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", swallow);
    window.addEventListener("drop", swallow);
    return () => {
      window.removeEventListener("dragover", swallow);
      window.removeEventListener("drop", swallow);
    };
  }, []);

  const tree = useMemo(() => buildTree(folders), [folders]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    docs.forEach((d) => m.set(d.folder_id, (m.get(d.folder_id) ?? 0) + 1));
    return m;
  }, [docs]);

  const folder = folderId ? tree.byId.get(folderId) ?? null : null;
  const trail = folder ? tree.ancestors(folder.id) : [];
  const q = search.trim().toLowerCase();
  const subfolders = folder && !q ? tree.children.get(folder.id) ?? [] : [];
  const shown = q
    ? docs.filter((d) => d.name.toLowerCase().includes(q) || (d.description ?? "").toLowerCase().includes(q))
    : docs.filter((d) => d.folder_id === folderId);
  const pathOf = (id: string) => [...tree.ancestors(id), tree.byId.get(id)].filter(Boolean).map((f) => f!.name).join(" / ");

  // ── Folders ──────────────────────────────────────────────────────────────

  async function createFolder(name: string, parentId: string | null): Promise<boolean> {
    if (!name.trim()) {
      say("error", "Give the folder a name.");
      return false;
    }
    // Root folders omit parent_id rather than sending null, as the manager does.
    const row: { name: string; parent_id?: string } = { name: name.trim() };
    if (parentId) row.parent_id = parentId;
    const { data, error } = await supabase.from("document_folders").insert(row).select("id, parent_id, name").single();
    if (error) {
      say("error", folderError(error, name.trim()));
      return false;
    }
    setFolders((fs) => [...fs, data as DocumentFolder]);
    setFolderId(data.id);
    say("success", `Folder "${data.name}" created.`);
    return true;
  }

  async function renameFolder(f: DocumentFolder, raw: string) {
    const name = raw.trim();
    if (!name || name === f.name) return;
    setFolders((fs) => fs.map((x) => (x.id === f.id ? { ...x, name } : x)));
    const { error } = await supabase.from("document_folders").update({ name }).eq("id", f.id);
    if (error) {
      setFolders((fs) => fs.map((x) => (x.id === f.id ? { ...x, name: f.name } : x)));
      say("error", folderError(error, name));
    }
  }

  async function moveFolder(f: DocumentFolder, parentId: string | null) {
    const { error } = await supabase.from("document_folders").update({ parent_id: parentId }).eq("id", f.id);
    if (error) return say("error", folderError(error, f.name, true));
    setFolders((fs) => fs.map((x) => (x.id === f.id ? { ...x, parent_id: parentId } : x)));
    setFolderId(f.id);
    say("success", `"${f.name}" moved.`);
  }

  async function deleteFolder(f: DocumentFolder) {
    disarm();
    const { data, error } = await supabase.rpc("delete_document_folder_tree", { p_folder: f.id });
    if (error) return say("error", folderError(error, f.name));
    // The rows are gone; sweep the files. A leftover blob is invisible, never wrong.
    await removeObjects(BUCKET, ((data ?? []) as string[]).filter(Boolean));
    const gone = new Set([f.id, ...tree.descendants(f.id)]);
    const left = folders.filter((x) => !gone.has(x.id));
    setFolders(left);
    setDocs((ds) => ds.filter((d) => !gone.has(d.folder_id)));
    if (folderId && gone.has(folderId)) setFolderId(buildTree(left).ordered[0]?.folder.id ?? null);
    say("success", `"${f.name}" deleted.`);
  }

  // ── Files ────────────────────────────────────────────────────────────────

  async function upload(list: FileList | File[] | null) {
    const files = Array.from(list ?? []);
    if (fileInput.current) fileInput.current.value = "";
    if (!files.length) return;
    if (!folder) return say("error", "Choose a folder first, then add the file.");
    // The whole batch is checked before anything is sent.
    for (const file of files) {
      const problem = validateFile(file);
      if (problem) return say("error", `${file.name}: ${problem}`);
    }
    setUploading(true);
    setBanner(null);
    let added = 0;
    try {
      for (const file of files) {
        const key = objectKey(folder.id, file);
        await uploadObject(BUCKET, key, file);
        const { data, error } = await supabase
          .from("documents")
          .insert({ folder_id: folder.id, name: displayName(file.name), storage_path: key, mime_type: file.type || null, file_size: file.size })
          .select()
          .single();
        if (error) {
          await removeObjects(BUCKET, [key]);
          throw new Error("The file uploaded but could not be filed. Nothing was saved.");
        }
        setDocs((ds) => [data as CompanyDocument, ...ds]);
        added++;
      }
      say("success", added === 1 ? "Document added." : `${added} documents added.`);
    } catch (e) {
      say("error", added ? `${added} added, then: ${errorText(e)}` : errorText(e));
    } finally {
      setUploading(false);
    }
  }

  async function view(d: CompanyDocument) {
    try {
      await openObject(BUCKET, d.storage_path);
    } catch (e) {
      say("error", errorText(e));
    }
  }

  /** Saves with the document's name, without leaving the page. */
  async function download(d: CompanyDocument) {
    const { ext } = kindOf(d.storage_path, d.mime_type);
    const filename = ext && !d.name.toLowerCase().endsWith(`.${ext}`) ? `${d.name}.${ext}` : d.name;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(d.storage_path, 300, { download: filename });
    if (error) return say("error", error.message);
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function renameDoc(d: CompanyDocument, raw: string) {
    const name = raw.trim();
    if (!name || name === d.name) return;
    setDocs((ds) => ds.map((x) => (x.id === d.id ? { ...x, name } : x)));
    const { error } = await supabase.from("documents").update({ name }).eq("id", d.id);
    if (error) {
      setDocs((ds) => ds.map((x) => (x.id === d.id ? { ...x, name: d.name } : x)));
      say("error", error.message);
    }
  }

  async function moveDoc(d: CompanyDocument, to: string) {
    if (to === d.folder_id) return;
    const { error } = await supabase.from("documents").update({ folder_id: to }).eq("id", d.id);
    if (error) return say("error", error.message);
    setDocs((ds) => ds.map((x) => (x.id === d.id ? { ...x, folder_id: to } : x)));
    say("success", `"${d.name}" moved to ${tree.byId.get(to)?.name ?? "another folder"}.`);
  }

  async function deleteDoc(d: CompanyDocument) {
    disarm();
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) return say("error", error.message);
    await removeObjects(BUCKET, [d.storage_path]);
    setDocs((ds) => ds.filter((x) => x.id !== d.id));
    say("success", "Document deleted.");
  }

  // ── Drag and drop onto the file pane ─────────────────────────────────────

  const isFileDrag = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");
  const dropHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      setDragDepth((n) => n + 1);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      setDragDepth((n) => Math.max(0, n - 1));
    },
    onDrop: (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      setDragDepth(0);
      upload(e.dataTransfer.files);
    },
  };

  const totalDocs = docs.length;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Documents</h1>
          <p className="mt-1 text-sm text-mute">Company paperwork — licences, registrations, leases, agreements.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-body">
            <strong className="font-medium text-ink">{folders.length}</strong> {folders.length === 1 ? "folder" : "folders"}
            <span className="mx-2 text-ghost">|</span>
            <strong className="font-medium text-ink">{totalDocs}</strong> {totalDocs === 1 ? "document" : "documents"}
          </p>
          <input
            className="ws-input !w-56"
            type="search"
            placeholder="Search all documents"
            aria-label="Search all documents"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setSearch("")}
          />
        </div>
      </header>

      {banner && (
        <div
          role="status"
          className={`mb-4 flex items-start justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
            banner.kind === "error" ? "bg-[#fef3f2] text-[#b42318]" : "bg-[#ecfdf3] text-[#067647]"
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" aria-label="Dismiss" className="leading-none opacity-70 hover:opacity-100" onClick={() => setBanner(null)}>
            ×
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[272px_minmax(0,1fr)]">
        <FolderRail
          tree={tree}
          loading={loading}
          selectedId={folderId}
          counts={counts}
          armedKey={armedKey}
          arm={arm}
          disarm={disarm}
          actions={{
            open: (id) => {
              setSearch("");
              setFolderId(id);
            },
            create: createFolder,
            rename: renameFolder,
            move: moveFolder,
            remove: deleteFolder,
          }}
        />

        <section className="relative min-h-[320px] rounded-2xl border border-line bg-card p-4 md:p-5" {...dropHandlers}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {q ? (
              <h2 className="font-serif text-2xl">
                Search <span className="text-mute">· {plural(shown.length, "match", "matches")}</span>
              </h2>
            ) : folder && trail.length ? (
              <nav aria-label="Folder path" className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-sm">
                {trail.map((a) => (
                  <span key={a.id} className="flex items-baseline gap-1.5">
                    <button type="button" className="text-mute hover:text-ink hover:underline" onClick={() => setFolderId(a.id)}>
                      {a.name}
                    </button>
                    <span className="text-ghost">/</span>
                  </span>
                ))}
                <h2 className="font-serif text-2xl text-ink">{folder.name}</h2>
              </nav>
            ) : (
              <h2 className="font-serif text-2xl">{folder?.name ?? "Documents"}</h2>
            )}
            <div>
              <input ref={fileInput} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => upload(e.target.files)} />
              <button
                type="button"
                className="ws-btn ws-btn--primary"
                disabled={!folder || uploading}
                title={folder ? `Add a file to ${folder.name}` : "Open a folder first"}
                onClick={() => fileInput.current?.click()}
              >
                <UploadIcon />
                {uploading ? "Adding…" : "Add file"}
              </button>
            </div>
          </div>

          {!folder && !q && !loading ? (
            <div className="grid place-items-center rounded-xl border border-dashed border-ghost bg-paper px-6 py-16 text-center">
              <FolderIcon size={28} />
              <p className="mt-3 font-serif text-2xl">No folder open</p>
              <p className="mt-1 max-w-sm text-sm text-body">
                Name a folder in the rail on the left, then file the paperwork that belongs in it.
              </p>
            </div>
          ) : (
            <>
              {subfolders.length > 0 && (
                <div className="mb-5 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(176px,1fr))]">
                  {subfolders.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      title={`Open ${s.name}`}
                      className="flex items-center gap-2.5 rounded-xl border border-line bg-paper px-3 py-2.5 text-left text-sm hover:border-ghost motion-safe:transition-colors"
                      onClick={() => {
                        disarm();
                        setFolderId(s.id);
                      }}
                    >
                      <FolderIcon size={18} />
                      <span className="line-clamp-2 min-w-0 flex-1 break-words leading-snug" title={s.name}>{s.name}</span>
                      <span className="text-xs text-mute">{counts.get(s.id) ?? 0}</span>
                    </button>
                  ))}
                </div>
              )}

              {shown.length > 0 ? (
                <>
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {shown.map((d) => {
                      const kind = kindOf(d.storage_path, d.mime_type);
                      const armed = armedKey === `doc:${d.id}`;
                      const uploader = d.uploaded_by ? nameOf(d.uploaded_by) : null;
                      return (
                        <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                          <KindBadge label={kind.label} sheet={kind.sheet} />
                          <div className="min-w-0 flex-1 basis-48">
                            {renamingDoc === d.id ? (
                              <input
                                autoFocus
                                className="ws-input !py-1"
                                defaultValue={d.name}
                                maxLength={255}
                                aria-label={`Rename ${d.name}`}
                                onFocus={(e) => e.currentTarget.select()}
                                onBlur={(e) => {
                                  setRenamingDoc(null);
                                  renameDoc(d, e.currentTarget.value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                  if (e.key === "Escape") {
                                    e.currentTarget.value = d.name;
                                    setRenamingDoc(null);
                                  }
                                }}
                              />
                            ) : (
                              <button
                                type="button"
                                className="block max-w-full break-words text-left text-[15px] hover:underline"
                                title={kind.viewable ? "Open in a new tab" : `Download as ${kind.label}`}
                                onClick={() => (kind.viewable ? view(d) : download(d))}
                              >
                                {d.name}
                              </button>
                            )}
                            <p className="break-words text-xs text-mute">
                              {q && <span className="text-body">{pathOf(d.folder_id)} · </span>}
                              {formatBytes(d.file_size)} ·{" "}
                              {uploader && uploader !== "—" ? `added by ${uploader} on ${formatAdded(d.created_at)}` : `added ${formatAdded(d.created_at)}`}
                              {d.description && ` · ${d.description}`}
                            </p>
                          </div>

                          {movingDoc === d.id ? (
                            <select
                              autoFocus
                              className="ws-input !w-auto !py-1"
                              aria-label={`Move ${d.name} to`}
                              defaultValue={d.folder_id}
                              onChange={(e) => {
                                setMovingDoc(null);
                                moveDoc(d, e.target.value);
                              }}
                              onBlur={() => setMovingDoc(null)}
                              onKeyDown={(e) => e.key === "Escape" && setMovingDoc(null)}
                            >
                              {tree.ordered.map(({ folder: f, depth }) => (
                                <option key={f.id} value={f.id}>
                                  {" ".repeat(depth * 2)}
                                  {f.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="ml-auto flex items-center gap-1">
                              <button
                                type="button"
                                className="ws-btn !border-transparent !bg-transparent !px-2.5 !py-1 text-xs hover:!border-line"
                                onClick={() => (kind.viewable ? view(d) : download(d))}
                              >
                                {kind.viewable ? <EyeIcon /> : <DownloadIcon />}
                                {kind.viewable ? "View" : "Download"}
                              </button>
                              {kind.viewable && (
                                <RowIcon title="Download" label={`Download ${d.name}`} onClick={() => download(d)}>
                                  <DownloadIcon />
                                </RowIcon>
                              )}
                              <RowIcon title="Rename" label={`Rename ${d.name}`} onClick={() => { disarm(); setRenamingDoc(d.id); }}>
                                <PencilIcon />
                              </RowIcon>
                              <RowIcon title="Move to another folder" label={`Move ${d.name}`} onClick={() => { disarm(); setMovingDoc(d.id); }}>
                                <MoveIcon />
                              </RowIcon>
                              <button
                                type="button"
                                className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs ${
                                  armed ? "bg-[#fef3f2] font-medium text-[#b42318]" : "text-mute hover:text-[#b42318]"
                                }`}
                                title={armed ? "Click again to delete this document for good" : "Delete"}
                                aria-label={armed ? `Click again to delete ${d.name}` : `Delete ${d.name}`}
                                onClick={() => (armed ? deleteDoc(d) : arm(`doc:${d.id}`))}
                              >
                                {armed ? "Sure?" : <TrashIcon />}
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {!q && <p className="mt-3 text-xs text-mute">Drop files anywhere in this panel to file them here.</p>}
                </>
              ) : q ? (
                <p className="rounded-xl border border-dashed border-ghost px-6 py-10 text-center text-mute">No documents match “{search.trim()}”.</p>
              ) : folder && subfolders.length > 0 ? (
                <p className="text-sm text-mute">No files directly in “{folder.name}” — open a folder above, or drop files here.</p>
              ) : folder ? (
                <div className="grid place-items-center rounded-xl border border-dashed border-ghost bg-paper px-6 py-14 text-center">
                  <p className="font-serif text-2xl">“{folder.name}” is empty</p>
                  <p className="mt-1 max-w-sm text-sm text-body">
                    Drop files here, or use Add file. {KIND_WORDS} files, up to 20 MB each.
                  </p>
                </div>
              ) : null}
            </>
          )}

          {dragDepth > 0 && (
            <div className="pointer-events-none absolute inset-2 grid place-items-center rounded-xl border-2 border-dashed border-ink/50 bg-paper/90 text-center">
              <p className="font-serif text-2xl">{folder ? `Release to file in “${folder.name}”` : "Choose a folder first"}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function RowIcon({ title, label, onClick, children }: { title: string; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="grid size-7 place-items-center rounded-full text-mute hover:bg-cream hover:text-ink" title={title} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}
