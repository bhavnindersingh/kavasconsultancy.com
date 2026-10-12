"use client";

import { useEffect, useRef, useState } from "react";
import { waitingLabel, type Stub } from "@/lib/workspace/tasks";
import { PRIORITY_LABEL, STATUS_LABEL, TASK_STATUSES, type Task, type TaskStatus } from "@/lib/workspace/types";
import { useWorkspace } from "../WorkspaceContext";
import { Disc, LATE, LinkIcon, PRIORITY_COLOR, StatusDot, dueChip } from "./bits";

// The kanban. Pointer events, not HTML5 drag-and-drop, so it works the same
// with a mouse, a pen and a finger: a mouse drags from anywhere on the card, a
// finger only from the priority edge (so a finger on the card still scrolls).
// Done is a log, not a queue: newest first, folded after eight.

export type Checklist = { done: number; total: number; open: string[] };

const SLOP = 4;
const EDGE = 72;
const STEP = 12;
const DONE_VISIBLE = 8;

type Drag = { id: string; from: TaskStatus; x0: number; y0: number; started: boolean; col: TaskStatus | null; index: number };

export default function BoardView({
  tasks,
  waiting,
  checklists,
  onOpen,
  onNew,
  onMove,
  filtered,
  canSignOff = true,
  signOffName = null,
  flashId = null,
  boardKey = "",
}: {
  /** The filtered tasks on screen. */
  tasks: Task[];
  waiting: Map<string, Stub[]>;
  checklists: Map<string, Checklist>;
  onOpen: (id: string) => void;
  onNew: (status: TaskStatus, title: string) => void;
  /** Move to `status`, landing before `beforeId` (or at the end). */
  onMove: (id: string, status: TaskStatus, beforeId: string | null) => void;
  /** True when filters are hiding something (the first-run copy is then wrong). */
  filtered: boolean;
  /** False on a board someone else signs off: Done is theirs to move into. */
  canSignOff?: boolean;
  signOffName?: string | null;
  /** A card to scroll to and briefly highlight (the one just created). */
  flashId?: string | null;
  /** Remembers per board whether Done is unfolded. */
  boardKey?: string;
}) {
  const { nameOf } = useWorkspace();
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [adding, setAdding] = useState<TaskStatus | null>(null);
  const [showAllDone, setShowAllDone] = useState(false);
  // Done is a log, so it folds to a strip by default — the width goes to the
  // columns with work still in them. Remembered per board, per browser.
  const doneKey = `ws_done_open:${boardKey}`;
  const [doneOpen, setDoneOpen] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore a per-viewer preference
      setDoneOpen(localStorage.getItem(doneKey) === "1");
    } catch {}
  }, [doneKey]);
  const toggleDone = () =>
    setDoneOpen((o) => {
      try {
        localStorage.setItem(doneKey, o ? "0" : "1");
      } catch {}
      return !o;
    });
  const scroller = useRef<HTMLDivElement>(null);

  const column = (s: TaskStatus) => {
    const col = tasks.filter((t) => t.status === s);
    if (s === "done") return col.sort((a, b) => (b.completed_at ?? "9999").localeCompare(a.completed_at ?? "9999"));
    return col.sort((a, b) => a.sort_order - b.sort_order);
  };

  // ── Drag ─────────────────────────────────────────────────────────────────

  function locate(x: number, y: number, d: Drag): { col: TaskStatus | null; index: number } {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const colEl = el?.closest<HTMLElement>("[data-tk-column]");
    if (!colEl) return { col: null, index: 0 };
    const col = colEl.dataset.tkColumn as TaskStatus;
    if (col === "done") {
      if (d.from === "done") return { col: null, index: 0 };
      // Not yours to sign off: the drop goes where it will reach the owner.
      if (!canSignOff) return { col: d.from === "quality_check" ? null : "quality_check", index: column("quality_check").filter((t) => t.id !== d.id).length };
      return { col: "done", index: 0 };
    }
    const cardEl = el?.closest<HTMLElement>("[data-tk-index]");
    const cards = column(col).filter((t) => t.id !== d.id);
    if (!cardEl || cardEl.dataset.tkId === d.id) {
      if (cardEl?.dataset.tkId === d.id) return { col, index: Math.max(0, column(col).findIndex((t) => t.id === d.id)) };
      return { col, index: cards.length };
    }
    const idx = cards.findIndex((t) => t.id === cardEl.dataset.tkId);
    const r = cardEl.getBoundingClientRect();
    return { col, index: idx < 0 ? cards.length : idx + (y > r.top + r.height / 2 ? 1 : 0) };
  }

  function autoScroll(x: number, y: number) {
    const dx = x < EDGE ? -STEP : x > window.innerWidth - EDGE ? STEP : 0;
    const dy = y < EDGE ? -STEP : y > window.innerHeight - EDGE ? STEP : 0;
    if (dx && scroller.current) scroller.current.scrollLeft += dx;
    if (dy) window.scrollBy(0, dy);
  }

  function down(e: React.PointerEvent, t: Task, fromGrip: boolean) {
    if (e.button !== 0) return;
    if (e.pointerType === "touch" && !fromGrip) return;
    capture(e);
    const d: Drag = { id: t.id, from: t.status, x0: e.clientX, y0: e.clientY, started: false, col: null, index: 0 };
    dragRef.current = d;
  }

  function move(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    if (!d.started && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < SLOP) return;
    const next = { ...d, started: true, ...locate(e.clientX, e.clientY, d) };
    dragRef.current = next;
    setDrag(next);
    autoScroll(e.clientX, e.clientY);
  }

  function up() {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d?.started) return;
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 0);
    if (!d.col) return;
    if (d.col === "done") return onMove(d.id, "done", null);
    const cards = column(d.col).filter((t) => t.id !== d.id);
    const before = cards[d.index]?.id ?? null;
    // Dropped back where it was: nothing to write.
    const own = column(d.col);
    const at = own.findIndex((t) => t.id === d.id);
    if (d.col === d.from && (own[at + 1]?.id ?? null) === before) return;
    onMove(d.id, d.col, before);
  }

  // Keyboard: Ctrl/⌘ + ←/→ moves a card a column, + ↑/↓ within its column.
  function keyMove(e: React.KeyboardEvent, t: Task) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      return onOpen(t.id);
    }
    if (!(e.ctrlKey || e.metaKey)) return;
    const cols = TASK_STATUSES;
    const ci = cols.indexOf(t.status);
    const own = column(t.status);
    const i = own.findIndex((x) => x.id === t.id);
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const to = cols[ci + (e.key === "ArrowLeft" ? -1 : 1)];
      if (!to) return;
      e.preventDefault();
      if (to === "done") return canSignOff ? onMove(t.id, "done", null) : undefined;
      const target = column(to);
      onMove(t.id, to, target[Math.min(i, target.length)]?.id ?? null);
    }
    if ((e.key === "ArrowUp" || e.key === "ArrowDown") && t.status !== "done") {
      e.preventDefault();
      if (e.key === "ArrowUp" && i > 0) onMove(t.id, t.status, own[i - 1].id);
      if (e.key === "ArrowDown" && i < own.length - 1) onMove(t.id, t.status, own[i + 2]?.id ?? null);
    }
  }

  useEffect(() => {
    if (!flashId) return;
    document.querySelector<HTMLElement>(`[data-tk-id="${flashId}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [flashId, tasks]);

  // Keep keyboard focus on a card after it moves.
  const focusAfter = useRef<string | null>(null);
  useEffect(() => {
    if (!focusAfter.current) return;
    document.querySelector<HTMLElement>(`[data-tk-id="${focusAfter.current}"]`)?.focus();
    focusAfter.current = null;
  });

  // ── First run ────────────────────────────────────────────────────────────

  if (!tasks.length && !filtered) return <FirstRun onAdd={(title) => onNew("todo", title)} />;

  return (
    <div ref={scroller} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0" onPointerMove={move} onPointerUp={up} onPointerCancel={() => {
      dragRef.current = null;
      setDrag(null);
    }}>
      {TASK_STATUSES.map((status) => {
        const all = column(status);
        if (status === "done" && !doneOpen) {
          const over = drag?.started && drag.col === "done";
          return (
            <section
              key={status}
              data-tk-column="done"
              aria-label={`Done, ${all.length} — folded`}
              className={`flex w-12 flex-none flex-col items-center gap-2 rounded-2xl py-3 transition-colors ${over ? "bg-cream ring-2 ring-ink" : "bg-[#efedea]"}`}
            >
              <button
                className="flex flex-1 flex-col items-center gap-2 text-sm text-mute hover:text-ink"
                onClick={toggleDone}
                title={!canSignOff ? `Done — ${signOffName ?? "the board owner"} signs off; drops go to Quality Check` : "Show the Done column"}
                aria-expanded={false}
              >
                <StatusDot status="done" />
                <span className="font-medium text-ink [writing-mode:vertical-rl]">Done</span>
                <span>{all.length}</span>
              </button>
            </section>
          );
        }
        const folded = status === "done" && !showAllDone && all.length > DONE_VISIBLE;
        const shown = folded ? all.slice(0, DONE_VISIBLE) : all;
        const target = drag?.started && drag.col === status;
        const lineAt = target ? (status === "done" ? 0 : drag!.index) : -1;
        // The dragged card stays mounted (it holds the pointer capture); the
        // drop line is placed among the OTHER cards, so it's counted out.
        let slot = 0;
        const others = shown.filter((t) => !(drag?.started && t.id === drag.id)).length;
        return (
          <section
            key={status}
            data-tk-column={status}
            className={`flex min-w-[196px] max-w-[300px] flex-1 basis-[260px] flex-col rounded-2xl p-2 transition-colors ${target ? "bg-cream" : "bg-[#efedea]"}`}
            aria-label={STATUS_LABEL[status]}
          >
            <h2 className={`sticky top-0 z-10 flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium ${target ? "bg-cream" : "bg-[#efedea]"}`}>
              <StatusDot status={status} />
              {STATUS_LABEL[status]}
              <span className="font-normal text-mute">{all.length}</span>
              {status === "done" && (
                <button className="ml-auto grid size-6 place-items-center rounded-md text-mute hover:bg-card hover:text-ink" aria-label="Fold the Done column" title="Fold the Done column" onClick={toggleDone}>
                  ‹
                </button>
              )}
              {status !== "done" && (
                <button
                  className="ml-auto grid size-6 place-items-center rounded-md text-mute hover:bg-card hover:text-ink"
                  aria-label={`Add a task to ${STATUS_LABEL[status]}`}
                  title={`Add a task to ${STATUS_LABEL[status]}`}
                  onClick={() => setAdding(status)}
                >
                  +
                </button>
              )}
            </h2>
            {status === "done" && !canSignOff && (
              <p className={`px-2 pb-1 text-xs ${drag?.started ? "text-ink" : "text-mute"}`}>
                {signOffName ?? "The board owner"} signs off — drops go to Quality Check.
              </p>
            )}

            {adding === status && <QuickAdd onDone={() => setAdding(null)} onAdd={(title) => onNew(status, title)} />}

            <div className="flex min-h-10 flex-col gap-2">
              {shown.map((t, i) => {
                const isDragged = drag?.started === true && drag.id === t.id;
                const lineHere = !isDragged && lineAt === slot;
                if (!isDragged) slot++;
                return (
                <div key={t.id}>
                  {lineHere && <DropLine />}
                  <Card
                    task={t}
                    index={i}
                    dragging={drag?.started === true && drag.id === t.id}
                    flash={flashId === t.id}
                    blockers={waiting.get(t.id) ?? []}
                    checklist={checklists.get(t.id)}
                    ownerName={t.assignee_id ? nameOf(t.assignee_id) : null}
                    onPointerDown={(e, grip) => down(e, t, grip)}
                    onClick={() => !suppressClick.current && onOpen(t.id)}
                    onKeyDown={(e) => {
                      if (e.ctrlKey || e.metaKey) focusAfter.current = t.id;
                      keyMove(e, t);
                    }}
                  />
                </div>
                );
              })}
              {lineAt >= 0 && lineAt >= others && <DropLine />}
              {!all.length && adding !== status && status !== "done" && (
                <button className="rounded-lg px-2 py-1.5 text-left text-sm text-mute hover:bg-card" onClick={() => setAdding(status)}>
                  + Add a task
                </button>
              )}
            </div>

            {status === "done" && all.length > DONE_VISIBLE && (
              <button className="mt-2 rounded-lg px-2 py-1.5 text-left text-sm text-mute hover:bg-card" onClick={() => setShowAllDone((s) => !s)}>
                {folded ? `…and ${all.length - DONE_VISIBLE} finished earlier` : "Show recent only"}
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}

function DropLine() {
  return <div className="my-0.5 h-0.5 rounded-full bg-ink" aria-hidden />;
}

function Card({
  task: t,
  index,
  dragging,
  flash = false,
  blockers,
  checklist,
  ownerName,
  onPointerDown,
  onClick,
  onKeyDown,
}: {
  task: Task;
  index: number;
  dragging: boolean;
  flash?: boolean;
  blockers: Stub[];
  checklist?: Checklist;
  ownerName: string | null;
  onPointerDown: (e: React.PointerEvent, fromGrip: boolean) => void;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const due = dueChip(t);
  const late = due?.tone === "late";
  const done = t.status === "done";
  const showProgress = t.progress > 0 && !done;

  const chips: React.ReactNode[] = [];
  const dueEl = due && (
    <span
      key="due"
      className="ws-chip"
      style={late ? { background: "#fef3f2", color: LATE } : due.tone === "soon" ? { background: "#fff6e5", color: "#9a5b00" } : undefined}
    >
      {due.text}
    </span>
  );
  if (late) chips.push(dueEl);
  if (!done && (t.priority === "urgent" || t.priority === "high"))
    chips.push(
      <span key="pri" className="ws-chip" style={{ color: PRIORITY_COLOR[t.priority] }}>
        {PRIORITY_LABEL[t.priority]}
      </span>,
    );
  if (blockers.length && !done)
    chips.push(
      <span key="wait" className="ws-chip gap-1 !bg-[#eef2f7] !text-[#475569]" title={blockers.map((b) => b.title).join(" · ")}>
        <LinkIcon />
        {waitingLabel(blockers)}
      </span>,
    );
  if (due && !late) chips.push(dueEl);
  if (checklist?.total)
    chips.push(
      <span key="check" className="ws-chip" title={checklist.open.length ? checklist.open.join(" · ") : "All steps done"}>
        ✓ {checklist.done}/{checklist.total}
      </span>,
    );
  if (showProgress)
    chips.push(
      <span key="pct" className="ws-chip">
        {t.progress}%
      </span>,
    );

  return (
    <article
      data-tk-index={index}
      data-tk-id={t.id}
      role="button"
      tabIndex={0}
      aria-label={`${t.title}${due ? `, due ${due.text}` : ""}`}
      onPointerDown={(e) => onPointerDown(e, false)}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`relative flex cursor-pointer select-none overflow-hidden rounded-xl border bg-card outline-none hover:border-ghost focus-visible:ring-2 focus-visible:ring-ink ${late ? "border-[#f4b8b2]" : "border-line"} ${dragging ? "opacity-40" : ""} ${flash ? "ws-flash" : ""}`}
    >
      <span
        aria-hidden
        className="w-[5px] flex-none cursor-grab touch-none [@media(pointer:coarse)]:w-5"
        style={{ background: PRIORITY_COLOR[t.priority] }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown(e, true);
        }}
      />
      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-start gap-2">
          <p className={`flex-1 text-[14px] leading-snug ${done ? "text-mute" : ""}`}>{t.title}</p>
          <Disc id={t.assignee_id} name={ownerName} size={22} />
        </div>
        {chips.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">{chips}</div>}
        {showProgress && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-[#3b6ea8]" style={{ width: `${t.progress}%` }} />
          </div>
        )}
      </div>
    </article>
  );
}

function QuickAdd({ onAdd, onDone }: { onAdd: (title: string) => void; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const submit = () => {
    if (title.trim()) onAdd(title.trim());
    onDone();
  };
  return (
    <form
      className="mb-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        autoFocus
        className="ws-input"
        placeholder="What needs doing?"
        maxLength={200}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => !title.trim() && onDone()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onDone();
          }
        }}
      />
    </form>
  );
}

function FirstRun({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  return (
    <div className="rounded-2xl border border-dashed border-ghost p-10 text-center">
      <p className="text-xs uppercase tracking-wide text-mute">Empty board</p>
      <p className="mb-2 font-serif text-2xl">What has to happen?</p>
      <p className="mx-auto mb-5 max-w-md text-body">
        Type the first task and it opens for a due date — every task needs one, or it can never be late and nobody is told to chase it. Mark what it waits on to chain work together.
      </p>
      {open ? (
        <form
          className="mx-auto max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) onAdd(title.trim());
          }}
        >
          <input
            autoFocus
            className="ws-input"
            placeholder="e.g. Send the engagement letter"
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          />
        </form>
      ) : (
        <button className="ws-btn ws-btn--primary" onClick={() => setOpen(true)}>Add the first task</button>
      )}
    </div>
  );
}

/** Pointer capture keeps a drag alive off the element; some pointers refuse it. */
function capture(e: React.PointerEvent) {
  try {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  } catch {}
}
