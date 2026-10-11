// The document cabinet's rules and arithmetic — no React, no network.
// Ported from the Conscious Cafe manager's documentService, with the
// workspace's wider list of file kinds.

import type { DocumentFolder } from "@/lib/workspace/types";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
/** Five levels: a folder may sit under at most four others (the DB enforces it too). */
export const MAX_DEPTH = 5;
/** How long a two-tap delete stays armed. */
export const CONFIRM_DELETE_MS = 4000;

type Kind = { label: string; sheet?: boolean; viewable?: boolean };

/** Decided by the extension; the browser's file.type is not trusted. */
const KINDS: Record<string, Kind> = {
  pdf: { label: "PDF", viewable: true },
  doc: { label: "DOC" },
  docx: { label: "DOCX" },
  odt: { label: "ODT" },
  xls: { label: "XLS", sheet: true },
  xlsx: { label: "XLSX", sheet: true },
  ods: { label: "ODS", sheet: true },
  csv: { label: "CSV", sheet: true },
  ppt: { label: "PPT" },
  pptx: { label: "PPTX" },
  odp: { label: "ODP" },
  txt: { label: "TXT", viewable: true },
  png: { label: "PNG", viewable: true },
  jpg: { label: "JPG", viewable: true },
  jpeg: { label: "JPEG", viewable: true },
  webp: { label: "WEBP", viewable: true },
  gif: { label: "GIF", viewable: true },
};

export const ACCEPT = Object.keys(KINDS).map((e) => `.${e}`).join(",");
export const KIND_WORDS = "PDF, Word, Excel, PowerPoint, OpenDocument, CSV, text or image";

export function extensionOf(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** A stored file's kind, from its storage key (which keeps the extension), falling back to PDF. */
export function kindOf(storagePath: string, mime?: string | null): Kind & { ext: string } {
  const ext = extensionOf(storagePath);
  if (KINDS[ext]) return { ...KINDS[ext], ext };
  if (mime?.includes("pdf")) return { ...KINDS.pdf, ext: "pdf" };
  if (mime?.includes("sheet") || mime?.includes("excel") || mime === "text/csv") return { ...KINDS.xlsx, ext: "xlsx" };
  return { label: (ext || "FILE").toUpperCase().slice(0, 4), ext };
}

export function formatBytes(n: number | null | undefined) {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Null when the file can be filed; otherwise the reason it can't. */
export function validateFile(file: File | null | undefined): string | null {
  if (!file) return "Choose a file.";
  if (!KINDS[extensionOf(file.name)]) return `Only ${KIND_WORDS} files can be uploaded.`;
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_FILE_BYTES) return `That file is ${formatBytes(file.size)} — the limit is 20 MB.`;
  return null;
}

/** The name a file is filed under: its filename without the extension. */
export function displayName(fileName: string) {
  const ext = extensionOf(fileName);
  const base = ext && KINDS[ext] ? fileName.slice(0, -(ext.length + 1)) : fileName;
  return base.trim() || "Document";
}

export function formatAdded(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
}

const byName = (a: DocumentFolder, b: DocumentFolder) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });

/** The folder tree, built once per load: children per parent, depth per folder. */
export function buildTree(folders: DocumentFolder[]) {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const children = new Map<string | null, DocumentFolder[]>();
  for (const f of folders) {
    const key = f.parent_id && byId.has(f.parent_id) ? f.parent_id : null;
    children.set(key, [...(children.get(key) ?? []), f]);
  }
  children.forEach((list) => list.sort(byName));

  /** Ancestors, root first. Capped so a bad row can never loop. */
  const ancestors = (id: string) => {
    const out: DocumentFolder[] = [];
    let cur = byId.get(id);
    for (let i = 0; cur?.parent_id && i < 32; i++) {
      const parent = byId.get(cur.parent_id);
      if (!parent) break;
      out.unshift(parent);
      cur = parent;
    }
    return out;
  };
  const depthOf = (id: string) => ancestors(id).length;

  /** Every folder below `id` (not including it). */
  const descendants = (id: string) => {
    const out: string[] = [];
    const stack = [...(children.get(id) ?? [])];
    while (stack.length && out.length < 10_000) {
      const f = stack.pop()!;
      out.push(f.id);
      stack.push(...(children.get(f.id) ?? []));
    }
    return out;
  };

  /** Depth-first, in rail order: what a flat picker should list. */
  const ordered: { folder: DocumentFolder; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const f of children.get(parent) ?? []) {
      ordered.push({ folder: f, depth });
      if (depth < 32) walk(f.id, depth + 1);
    }
  };
  walk(null, 0);

  return { byId, children, ancestors, depthOf, descendants, ordered };
}

export type Tree = ReturnType<typeof buildTree>;

/** Postgres errors, in words a person can act on. */
export function folderError(e: { code?: string; message: string }, name: string, moving = false) {
  if (e.code === "23505") return moving ? "A folder with this name already exists there." : `A folder called "${name}" already exists here.`;
  if (e.code === "42501") return "Only a partner can change company documents.";
  return e.message.replace(/\.?$/, ".");
}
