"use client";

import { useState } from "react";
import type { DocumentFolder } from "@/lib/workspace/types";
import { MAX_DEPTH, type Tree } from "./cabinet";
import { ChevronIcon, FolderIcon, MoveIcon, PencilIcon, PlusIcon, TrashIcon } from "./icons";

const FIGURE_SPACE = " ";

export type RailActions = {
  open: (id: string) => void;
  create: (name: string, parentId: string | null) => Promise<boolean>;
  rename: (folder: DocumentFolder, name: string) => void;
  move: (folder: DocumentFolder, parentId: string | null) => void;
  remove: (folder: DocumentFolder) => void;
};

/**
 * The folder tree. Every branch starts open; rows show their direct document
 * count; the actions (subfolder, rename, move, delete) appear on hover or
 * focus — and on phones, on the open folder only, since touch has no hover.
 */
export default function FolderRail({
  tree,
  loading,
  selectedId,
  counts,
  armedKey,
  arm,
  disarm,
  actions,
}: {
  tree: Tree;
  loading: boolean;
  selectedId: string | null;
  counts: Map<string, number>;
  armedKey: string | null;
  arm: (key: string) => void;
  disarm: () => void;
  actions: RailActions;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [rootName, setRootName] = useState("");
  const [creating, setCreating] = useState(false);

  const expand = (id: string) =>
    setCollapsed((c) => {
      if (!c.has(id)) return c;
      const next = new Set(c);
      next.delete(id);
      return next;
    });

  async function createRoot(e: React.FormEvent) {
    e.preventDefault();
    if (!rootName.trim() || creating) return;
    setCreating(true);
    if (await actions.create(rootName.trim(), null)) setRootName("");
    setCreating(false);
  }

  // A render function, not a component: a component defined in here would
  // remount the whole tree on every render and drop any input in progress.
  function renderRow(folder: DocumentFolder, depth: number): React.ReactNode {
    const kids = tree.children.get(folder.id) ?? [];
    const open = !collapsed.has(folder.id);
    const active = folder.id === selectedId;
    const armed = armedKey === `folder:${folder.id}`;
    const hasKids = kids.length > 0;

    return (
      <li key={folder.id}>
        <div
          className={`group relative flex items-center gap-1 rounded-lg pr-1 text-[14px] motion-safe:transition-colors ${
            active ? "bg-card shadow-[0_0_0_1px_var(--color-line)]" : "hover:bg-card/70"
          }`}
          style={{ paddingLeft: 4 + depth * 14 }}
        >
          {hasKids ? (
            <button
              type="button"
              className="grid size-6 flex-none place-items-center rounded text-mute hover:text-ink"
              aria-expanded={open}
              aria-label={`${open ? "Collapse" : "Expand"} folder ${folder.name}`}
              title={open ? "Hide subfolders" : "Show subfolders"}
              onClick={() =>
                setCollapsed((c) => {
                  const next = new Set(c);
                  if (next.has(folder.id)) next.delete(folder.id);
                  else next.add(folder.id);
                  return next;
                })
              }
            >
              <ChevronIcon open={open} />
            </button>
          ) : (
            <span className="size-6 flex-none" aria-hidden />
          )}

          {renaming === folder.id ? (
            <input
              autoFocus
              className="ws-input !py-1 my-0.5 flex-1"
              defaultValue={folder.name}
              maxLength={120}
              aria-label={`Rename folder ${folder.name}`}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={(e) => {
                setRenaming(null);
                actions.rename(folder, e.currentTarget.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  e.currentTarget.value = folder.name;
                  setRenaming(null);
                }
              }}
            />
          ) : moving === folder.id ? (
            <MovePicker
              folder={folder}
              tree={tree}
              onPick={(parent) => {
                setMoving(null);
                if (parent !== undefined && parent !== folder.parent_id) {
                  if (parent) expand(parent);
                  actions.move(folder, parent);
                }
              }}
            />
          ) : (
            <>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
                aria-current={active ? "true" : undefined}
                onClick={() => {
                  disarm();
                  actions.open(folder.id);
                }}
              >
                <FolderIcon />
                <span className="truncate">{folder.name}</span>
              </button>
              <span
                className={`flex-none items-center gap-0.5 ${active ? "flex" : "hidden md:flex"} md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${armed ? "md:!opacity-100" : ""}`}
              >
                {depth < MAX_DEPTH - 1 && (
                  <IconButton
                    title="New subfolder"
                    label={`New subfolder in ${folder.name}`}
                    onClick={() => {
                      disarm();
                      expand(folder.id);
                      setAddingIn(folder.id);
                    }}
                  >
                    <PlusIcon />
                  </IconButton>
                )}
                <IconButton
                  title="Rename folder"
                  label={`Rename folder ${folder.name}`}
                  onClick={() => {
                    disarm();
                    setRenaming(folder.id);
                  }}
                >
                  <PencilIcon />
                </IconButton>
                <IconButton
                  title="Move folder"
                  label={`Move folder ${folder.name}`}
                  onClick={() => {
                    disarm();
                    setMoving(folder.id);
                  }}
                >
                  <MoveIcon />
                </IconButton>
                <button
                  type="button"
                  className={`grid h-6 min-w-6 place-items-center rounded px-1 text-xs ${
                    armed ? "bg-[#fef3f2] font-medium text-[#b42318]" : "text-mute hover:text-[#b42318]"
                  }`}
                  title={
                    armed
                      ? `Click again to delete this folder, ${hasKids ? "its subfolders and everything in them" : "and everything in it"}`
                      : "Delete folder"
                  }
                  aria-label={
                    armed
                      ? `Click again to delete ${folder.name}, ${hasKids ? "its subfolders and everything in them" : "and everything in it"}`
                      : `Delete folder ${folder.name}`
                  }
                  onClick={() => (armed ? actions.remove(folder) : arm(`folder:${folder.id}`))}
                >
                  {armed ? "Sure?" : <TrashIcon />}
                </button>
              </span>
              <span
                className={`ml-1 min-w-5 flex-none rounded-full px-1.5 text-center text-[11px] ${active ? "bg-ink text-paper" : "bg-cream text-body"}`}
                title={`${counts.get(folder.id) ?? 0} document${(counts.get(folder.id) ?? 0) === 1 ? "" : "s"} directly in this folder`}
              >
                {counts.get(folder.id) ?? 0}
              </span>
            </>
          )}
        </div>

        {addingIn === folder.id && (
          <SubfolderForm
            parent={folder}
            depth={depth + 1}
            onDone={() => setAddingIn(null)}
            onCreate={(name) => actions.create(name, folder.id)}
          />
        )}

        {hasKids && open && (
          <ul>
            {kids.map((k) => renderRow(k, depth + 1))}
          </ul>
        )}
      </li>
    );
  }

  const roots = tree.children.get(null) ?? [];

  return (
    <aside className="rounded-2xl border border-line bg-[#efedea] p-2 md:sticky md:top-6 md:self-start">
      <h2 className="px-2 pt-1 pb-2 text-xs font-medium uppercase tracking-wide text-mute">Folders</h2>
      <div className="max-h-[232px] overflow-y-auto md:max-h-[62vh]">
        {loading ? (
          <p className="px-2 py-3 text-sm text-mute">Loading…</p>
        ) : roots.length === 0 ? (
          <p className="px-2 py-3 text-sm text-mute">No folders yet. Name one above — “Licences”, “Lease”, “Tax”.</p>
        ) : (
          <ul>
            {roots.map((f) => renderRow(f, 0))}
          </ul>
        )}
      </div>
      <form onSubmit={createRoot} className="mt-2 flex gap-1.5 border-t border-line/80 px-1 pt-2">
        <input
          className="ws-input !py-1.5"
          placeholder="New folder"
          aria-label="New folder name"
          maxLength={120}
          value={rootName}
          onChange={(e) => setRootName(e.target.value)}
        />
        <button
          type="submit"
          className="ws-btn !px-3"
          aria-label="Create folder"
          title="Create folder"
          disabled={!rootName.trim() || creating}
        >
          <PlusIcon />
        </button>
      </form>
    </aside>
  );
}

function IconButton({ title, label, onClick, children }: { title: string; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="grid size-6 place-items-center rounded text-mute hover:bg-cream hover:text-ink" title={title} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

/** Inline "move into" picker. Offers only places the folder may go. */
function MovePicker({ folder, tree, onPick }: { folder: DocumentFolder; tree: Tree; onPick: (parent: string | null | undefined) => void }) {
  const blocked = new Set([folder.id, ...tree.descendants(folder.id)]);
  // The moved folder lands one level below its target: targets at depth ≤ 3
  // keep it within five levels.
  const targets = tree.ordered.filter(({ folder: f, depth }) => !blocked.has(f.id) && depth <= MAX_DEPTH - 2);
  return (
    <select
      autoFocus
      className="ws-input !py-1 my-0.5 flex-1"
      aria-label={`Move folder ${folder.name} into`}
      defaultValue={folder.parent_id ?? ""}
      onChange={(e) => onPick(e.target.value || null)}
      onBlur={() => onPick(undefined)}
      onKeyDown={(e) => e.key === "Escape" && onPick(undefined)}
    >
      <option value="">Top level</option>
      {targets.map(({ folder: f, depth }) => (
        <option key={f.id} value={f.id}>
          {FIGURE_SPACE.repeat(depth * 2)}
          {f.name}
        </option>
      ))}
    </select>
  );
}

function SubfolderForm({
  parent,
  depth,
  onDone,
  onCreate,
}: {
  parent: DocumentFolder;
  depth: number;
  onDone: () => void;
  onCreate: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex gap-1.5 py-1 pr-1"
      style={{ paddingLeft: 4 + depth * 14 + 24 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim() || busy) return;
        setBusy(true);
        const ok = await onCreate(name.trim());
        setBusy(false);
        if (ok) onDone();
      }}
    >
      <input
        autoFocus
        className="ws-input !py-1"
        placeholder={`New folder in “${parent.name}”`}
        aria-label={`New folder in ${parent.name}`}
        maxLength={120}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => !name.trim() && onDone()}
        onKeyDown={(e) => e.key === "Escape" && onDone()}
      />
      <button type="submit" className="ws-btn !px-2.5 !py-1" title="Create subfolder" aria-label="Create subfolder" disabled={!name.trim() || busy}>
        <PlusIcon />
      </button>
    </form>
  );
}
