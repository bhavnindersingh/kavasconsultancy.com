"use client";

import { useState } from "react";
import { STATUS_LABEL, TASK_PRIORITIES, PRIORITY_LABEL, TASK_STATUSES, type TaskBoard } from "@/lib/workspace/types";
import { useWorkspace } from "../WorkspaceContext";
import { LATE, PRIORITY_COLOR, StatusDot, personColor } from "./bits";
import TwoTap from "./TwoTap";

// The boards rail. Its order is the priority order — the arrows (or Ctrl/⌘ +
// ↑/↓ on a focused row) reorder it. The open board's row carries its tools.
// Archived boards wait at the foot, restorable.

export default function BoardRail({
  boards,
  activeId,
  personMode,
  personLabel,
  onPerson,
  onSelect,
  onCreate,
  onRename,
  onArchive,
  onRestore,
  onDelete,
  onMove,
}: {
  boards: TaskBoard[];
  activeId: string | null;
  personMode: boolean;
  personLabel: string;
  onPerson: () => void;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<boolean>;
  onRename: (b: TaskBoard, name: string) => void;
  onArchive: (b: TaskBoard) => void;
  onRestore: (b: TaskBoard) => void;
  onDelete: (b: TaskBoard) => void;
  onMove: (b: TaskBoard, dir: -1 | 1) => void;
}) {
  const { me } = useWorkspace();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const live = boards.filter((b) => !b.is_archived);
  const archived = boards.filter((b) => b.is_archived);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    if (await onCreate(name.trim())) setName("");
    setCreating(false);
  }

  return (
    <nav aria-label="Boards" className="flex flex-col gap-1 rounded-2xl border border-line bg-card p-2 md:sticky md:top-6 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto">
      <button
        onClick={onPerson}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[15px] ${personMode ? "bg-ink text-paper" : "hover:bg-cream"}`}
        aria-current={personMode ? "page" : undefined}
      >
        <span className="size-2.5 rounded-full" style={{ background: personColor(me.id) }} />
        {personLabel}
      </button>

      <p className="mt-3 px-3 text-xs text-mute">Boards</p>
      {!live.length && <p className="px-3 py-2 text-sm text-mute">No boards yet. Make one below.</p>}
      <ul className="flex flex-col gap-0.5">
        {live.map((b, i) => {
          const active = !personMode && b.id === activeId;
          return (
            <li
              key={b.id}
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                  e.preventDefault();
                  onMove(b, e.key === "ArrowUp" ? -1 : 1);
                }
                if (e.key === "Enter" && e.target === e.currentTarget) onSelect(b.id);
              }}
              className={`group relative flex items-center gap-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ink ${active ? "bg-cream" : "hover:bg-paper"}`}
            >
              {renaming === b.id ? (
                <input
                  autoFocus
                  className="ws-input m-1 !py-1"
                  defaultValue={b.name}
                  maxLength={120}
                  aria-label={`Rename ${b.name}`}
                  onBlur={(e) => {
                    setRenaming(null);
                    const v = e.target.value.trim();
                    if (v && v !== b.name) onRename(b, v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setRenaming(null);
                    }
                  }}
                />
              ) : (
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm"
                  onClick={() => onSelect(b.id)}
                  onDoubleClick={() => setRenaming(b.id)}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="size-2.5 flex-none rounded-full" style={{ background: b.color }} />
                  <span className="truncate">{b.name}</span>
                  {!active && typeof b.open_count === "number" && b.open_count > 0 && <span className="ml-auto text-xs text-mute">{b.open_count}</span>}
                </button>
              )}

              {live.length >= 2 && renaming !== b.id && (
                <span className="flex flex-col opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                  {([-1, 1] as const).map((dir) => {
                    const end = (dir === -1 && i === 0) || (dir === 1 && i === live.length - 1);
                    return (
                      <button
                        key={dir}
                        className={`px-1 text-[10px] leading-none text-mute hover:text-ink ${end ? "opacity-30" : ""}`}
                        aria-disabled={end}
                        title={end ? (dir === -1 ? "Already first" : "Already last") : `Move ${b.name} ${dir === -1 ? "up" : "down"} the rail — the order is the priority`}
                        onClick={() => !end && onMove(b, dir)}
                      >
                        {dir === -1 ? "▲" : "▼"}
                      </button>
                    );
                  })}
                </span>
              )}

              {active && renaming !== b.id && (
                <span className="relative">
                  <button
                    className="grid size-7 place-items-center rounded-md text-mute hover:bg-card hover:text-ink"
                    aria-haspopup="menu"
                    aria-expanded={menu === b.id}
                    title={`Manage ${b.name}`}
                    onClick={() => setMenu((m) => (m === b.id ? null : b.id))}
                  >
                    ⋯
                  </button>
                  {menu === b.id && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setMenu(null)} />
                      <div role="menu" className="absolute right-0 top-8 z-40 w-64 rounded-xl border border-line bg-card p-1 shadow-xl">
                        <button role="menuitem" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-paper" onClick={() => { setMenu(null); setRenaming(b.id); }}>
                          Rename
                        </button>
                        {(b.open_count ?? 0) > 0 ? (
                          <TwoTap
                            label="Archive"
                            armedLabel={`Tap again — ${b.open_count} open task${b.open_count === 1 ? "" : "s"} leaves My work`}
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-paper"
                            armedClassName="!text-[#b42318]"
                            onConfirm={() => { setMenu(null); onArchive(b); }}
                          />
                        ) : (
                          <button role="menuitem" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-paper" onClick={() => { setMenu(null); onArchive(b); }}>
                            Archive
                          </button>
                        )}
                        <DeleteItem board={b} onDelete={() => { setMenu(null); onDelete(b); }} />
                      </div>
                    </>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <form onSubmit={create} className="mt-2 flex gap-1 px-1">
        <input className="ws-input !py-1.5" placeholder="New board…" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} aria-label="New board name" />
        <button className="ws-btn !px-3" type="submit" aria-label="Create board" disabled={!name.trim() || creating}>+</button>
      </form>

      {archived.length > 0 && (
        <div className="mt-3">
          <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-mute hover:text-ink" aria-expanded={showArchived} onClick={() => setShowArchived((s) => !s)}>
            {showArchived ? "▾" : "▸"} Archived <span>{archived.length}</span>
          </button>
          {showArchived && (
            <ul className="flex flex-col gap-0.5">
              {archived.map((b) => (
                <li key={b.id} className={`flex items-center gap-1 rounded-lg ${!personMode && b.id === activeId ? "bg-cream" : "hover:bg-paper"}`}>
                  <button className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-sm italic text-mute" onClick={() => onSelect(b.id)}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <rect x="2" y="3" width="12" height="3" rx="1" />
                      <path d="M3 6v6.5A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V6M6.5 9h3" />
                    </svg>
                    <span className="truncate">{b.name}</span>
                  </button>
                  <button className="px-1.5 text-xs text-mute hover:text-ink" title="Restore this board" onClick={() => onRestore(b)}>↺</button>
                  <TwoTap
                    label="✕"
                    armedLabel="Sure?"
                    title="Delete this board"
                    armedTitle="Tap again — this deletes the board and its finished tasks for good"
                    className="px-1.5 text-xs text-mute hover:text-[#b42318]"
                    armedClassName="!text-[#b42318]"
                    onConfirm={() => onDelete(b)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <details className="mt-4 px-3 pb-2 text-xs text-mute">
        <summary className="cursor-pointer select-none">Reading the board</summary>
        <p className="mt-2" style={{ color: LATE }}>Red is late, and red is nothing else.</p>
        <ul className="mt-2 space-y-1">
          {TASK_PRIORITIES.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <span className="h-3 w-[3px] rounded-full" style={{ background: PRIORITY_COLOR[p] }} />
              {PRIORITY_LABEL[p]}
            </li>
          ))}
        </ul>
        <ul className="mt-2 space-y-1">
          {TASK_STATUSES.map((s) => (
            <li key={s} className="flex items-center gap-2">
              <StatusDot status={s} />
              {STATUS_LABEL[s]}
            </li>
          ))}
        </ul>
        <p className="mt-2 flex items-center gap-2">
          <span className="size-3 rounded-full" style={{ background: personColor(me.id) }} />
          A coloured disc is the owner — one colour each, the same everywhere.
        </p>
      </details>
    </nav>
  );
}

function DeleteItem({ board, onDelete }: { board: TaskBoard; onDelete: () => void }) {
  const open = board.open_count ?? 0;
  if (open > 0)
    return (
      <button role="menuitem" className="block w-full rounded-lg px-3 py-2 text-left text-sm text-mute opacity-60 hover:bg-paper" onClick={onDelete}>
        Delete — {open} still open
      </button>
    );
  return (
    <TwoTap
      label="Delete"
      armedLabel="Tap again to delete for good"
      className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-paper"
      armedClassName="!text-[#b42318]"
      onConfirm={onDelete}
    />
  );
}
