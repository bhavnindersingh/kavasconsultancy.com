"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Stub } from "@/lib/workspace/tasks";
import { STATUS_LABEL, type Task, type TaskDependency } from "@/lib/workspace/types";
import { PX_PER_DAY, barBox, buildWindow, headerRows, longestChain, reschedule, spanOf, toDay, type DragMode, type Zoom } from "@/lib/workspace/timeline";
import { useWorkspace } from "../WorkspaceContext";
import { LATE, LinkIcon, PriorityBar, STATUS_COLOR, isOverdue, personColor, shortDate, today } from "./bits";

// The timeline. Bars from start to due, coloured by status and filled by
// progress; a one-date task is a milestone. Drag a bar to move it, its ends to
// change one date; Alt+←/→ nudges a focused bar a day, Alt+Shift+←/→ only its
// due date. Arrows run finish-to-start; the heaviest are the longest chain —
// the run of dependent work that sets the finish date.

const NAME_W = 240;
const ROW_H = 36;
const HEAD_H = 52;

type Drag = { id: string; mode: DragMode; x0: number; delta: number; moved: boolean };

export default function GanttView({
  tasks,
  deps,
  waiting,
  zoom,
  onZoom,
  boardNames,
  onOpen,
  onReschedule,
}: {
  tasks: Task[];
  deps: TaskDependency[];
  waiting: Map<string, Stub[]>;
  zoom: Zoom;
  onZoom: (z: Zoom) => void;
  /** Person mode: show each task's board under its title. */
  boardNames?: Map<string, string>;
  onOpen: (id: string) => void;
  onReschedule: (id: string, dates: Pick<Task, "start_date" | "due_date">) => void;
}) {
  const { nameOf } = useWorkspace();
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const ppd = PX_PER_DAY[zoom];
  const todayDay = toDay(today());

  const { scheduled, unscheduled } = useMemo(() => {
    const withSpan = tasks.map((t) => ({ t, s: spanOf(t) }));
    return {
      scheduled: withSpan
        .filter((x): x is { t: Task; s: NonNullable<ReturnType<typeof spanOf>> } => x.s !== null)
        .sort((a, b) => a.s.start - b.s.start || a.t.title.localeCompare(b.t.title))
        .map((x) => x.t),
      unscheduled: withSpan.filter((x) => !x.s).map((x) => x.t),
    };
  }, [tasks]);

  const win = useMemo(() => buildWindow(scheduled, todayDay, zoom), [scheduled, todayDay, zoom]);
  const header = useMemo(() => headerRows(win, zoom), [win, zoom]);
  // From the committed rows, never the drag preview.
  const chain = useMemo(() => longestChain(scheduled, deps), [scheduled, deps]);
  const width = win.days * ppd;
  const rowOf = new Map(scheduled.map((t, i) => [t.id, i]));

  // Centre today whenever the window or zoom changes.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, NAME_W + (todayDay - win.start) * ppd - el.clientWidth / 2);
  }, [win.start, win.days, zoom, ppd, todayDay]);

  const shown = (t: Task) => (drag?.id === t.id && drag.delta ? { ...t, ...reschedule(t, drag.mode, drag.delta) } : t);

  function startDrag(e: React.PointerEvent, t: Task, mode: DragMode) {
    if (e.button !== 0) return;
    e.stopPropagation();
    capture(e);
    const d = { id: t.id, mode, x0: e.clientX, delta: 0, moved: false };
    dragRef.current = d;
    setDrag(d);
  }
  function moveDrag(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    // A click that slips a few pixels must still open the task: at month zoom
    // a day is 4px, so the threshold scales with the zoom.
    const next = { ...d, moved: d.moved || Math.abs(dx) >= Math.max(6, ppd / 2), delta: Math.round(dx / ppd) };
    if (next.delta !== d.delta || next.moved !== d.moved) {
      dragRef.current = next;
      setDrag(next);
    }
  }
  function endDrag(t: Task) {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d) return;
    if (!d.moved || !d.delta) return d.moved ? undefined : onOpen(t.id);
    if (d.delta) onReschedule(t.id, reschedule(t, d.mode, d.delta));
  }
  function nudge(e: React.KeyboardEvent, t: Task) {
    if (e.key === "Enter") return onOpen(t.id);
    if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    const delta = e.key === "ArrowLeft" ? -1 : 1;
    onReschedule(t.id, reschedule(t, e.shiftKey ? "end" : "move", delta));
  }

  const arrows = deps.flatMap((dep) => {
    const from = scheduled.find((t) => t.id === dep.depends_on_task_id);
    const to = scheduled.find((t) => t.id === dep.task_id);
    if (!from || !to) return [];
    const a = spanOf(shown(from))!;
    const b = spanOf(shown(to))!;
    const x1 = (a.end - win.start + 1) * ppd;
    const y1 = rowOf.get(from.id)! * ROW_H + ROW_H / 2;
    const x2 = (b.start - win.start) * ppd;
    const y2 = rowOf.get(to.id)! * ROW_H + ROW_H / 2;
    // Doubles back through the row gutter when the successor starts first.
    const d = x2 >= x1 + 12 ? `M${x1},${y1} H${x1 + 6} V${y2} H${x2}` : `M${x1},${y1} H${x1 + 6} V${(y1 + y2) / 2} H${x2 - 10} V${y2} H${x2}`;
    return [{ key: `${dep.task_id}>${dep.depends_on_task_id}`, d, heavy: chain.edges.has(`${dep.task_id}>${dep.depends_on_task_id}`) }];
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-line bg-card p-0.5" role="group" aria-label="Zoom">
          {(["day", "week", "month"] as Zoom[]).map((z) => (
            <button key={z} onClick={() => onZoom(z)} className={`rounded-full px-3 py-1 text-sm capitalize ${zoom === z ? "bg-ink text-paper" : ""}`}>
              {z}
            </button>
          ))}
        </div>
        <Legend chain={chain.tasks.size > 0} />
      </div>

      {scheduled.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ghost p-8 text-center text-mute">
          Nothing here is scheduled yet. Give a task a start and a due date and it appears on the timeline.
        </p>
      ) : (
        <div ref={scroller} className="w-fit max-w-full overflow-x-auto rounded-2xl border border-line bg-card">
          <div className="relative" style={{ width: NAME_W + width }}>
            <div className="sticky top-0 z-20 flex border-b border-line bg-card" style={{ height: HEAD_H }}>
              <div className="sticky left-0 z-10 flex items-end border-r border-line bg-card px-3 pb-1.5 text-xs text-mute" style={{ width: NAME_W, minWidth: NAME_W }}>
                Task
              </div>
              <div className="relative" style={{ width }}>
                {header.top.map((s) => (
                  <div key={`t${s.left}`} className="absolute top-0 h-1/2 truncate border-l border-line px-1.5 pt-1 text-xs font-medium" style={{ left: s.left, width: s.width }}>
                    {s.label}
                  </div>
                ))}
                {header.bottom.map((s) => (
                  <div
                    key={`b${s.left}`}
                    className={`absolute bottom-0 flex h-1/2 items-center border-l border-line text-[11px] text-mute ${zoom === "day" ? "justify-center" : "px-1.5"} ${s.weekend ? "bg-paper" : ""}`}
                    style={{ left: s.left, width: s.width }}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative" style={{ height: scheduled.length * ROW_H }}>
              <div className="absolute inset-y-0" style={{ left: NAME_W, width }} aria-hidden>
                {header.bottom.map((s) => (
                  <div key={s.left} className={`absolute inset-y-0 border-l border-line/70 ${s.weekend ? "bg-paper" : ""}`} style={{ left: s.left, width: s.width }} />
                ))}
                {todayDay >= win.start && todayDay <= win.end && (
                  <div className="absolute inset-y-0 w-0.5" style={{ left: (todayDay - win.start) * ppd + ppd / 2, background: "#14070066" }} title={`Today — ${shortDate(today())}`} />
                )}
              </div>

              {arrows.length > 0 && (
                <svg className="pointer-events-none absolute top-0" style={{ left: NAME_W, width, height: scheduled.length * ROW_H }} aria-hidden>
                  <defs>
                    <marker id="tk-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                      <path d="M0,0 L8,4 L0,8 z" fill="#85817d" />
                    </marker>
                    <marker id="tk-arrow-heavy" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                      <path d="M0,0 L8,4 L0,8 z" fill="#140700" />
                    </marker>
                  </defs>
                  {arrows.map((a) => (
                    <path key={a.key} d={a.d} fill="none" stroke={a.heavy ? "#140700" : "#85817d"} strokeWidth={a.heavy ? 2.25 : 1.25} markerEnd={`url(#tk-arrow${a.heavy ? "-heavy" : ""})`} />
                  ))}
                </svg>
              )}

              {scheduled.map((t, i) => {
                const view = shown(t);
                const s = spanOf(view)!;
                const box = barBox(s, win.start, zoom);
                const late = isOverdue(t);
                const color = late ? LATE : STATUS_COLOR[t.status];
                const onChain = chain.tasks.has(t.id);
                const blockers = waiting.get(t.id) ?? [];
                const owner = t.assignee_id ? nameOf(t.assignee_id) : null;
                const tip = [
                  t.title,
                  view.start_date ? `Start ${shortDate(view.start_date)}` : null,
                  view.due_date ? `Due ${shortDate(view.due_date)}` : null,
                  owner,
                  blockers.length ? `Waiting on ${blockers.map((b) => b.title).join(", ")}` : null,
                  "Drag to reschedule · Alt+← / Alt+→ to nudge",
                ]
                  .filter(Boolean)
                  .join(" · ");
                const handlers = {
                  onPointerDown: (e: React.PointerEvent) => startDrag(e, t, "move"),
                  onPointerMove: moveDrag,
                  onPointerUp: () => endDrag(t),
                  onKeyDown: (e: React.KeyboardEvent) => nudge(e, t),
                };
                return (
                  <div key={t.id} className="absolute inset-x-0 flex border-b border-line/70" style={{ top: i * ROW_H, height: ROW_H }}>
                    <button
                      onClick={() => onOpen(t.id)}
                      title={boardNames ? `${t.title} — ${boardNames.get(t.board_id) ?? ""}` : t.title}
                      className={`sticky left-0 z-10 flex items-stretch gap-2 border-r border-line px-3 py-1.5 text-left text-[13px] hover:bg-paper ${onChain ? "bg-cream" : "bg-card"}`}
                      style={{ width: NAME_W, minWidth: NAME_W }}
                    >
                      <PriorityBar priority={t.priority} />
                      <span className="flex min-w-0 flex-col justify-center leading-tight">
                        <span className={`truncate ${t.status === "done" ? "text-mute line-through" : ""}`}>{t.title}</span>
                        {boardNames && <span className="truncate text-[11px] text-mute">{boardNames.get(t.board_id)}</span>}
                      </span>
                    </button>
                    <div className="relative" style={{ width }}>
                      {s.milestone ? (
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={tip}
                          title={tip}
                          className="absolute top-1/2 size-3.5 -translate-y-1/2 rotate-45 cursor-grab touch-none rounded-[3px] outline-offset-2 active:cursor-grabbing"
                          style={{ left: box.left + ppd / 2 - 7, background: color, boxShadow: onChain ? "0 0 0 2px #140700" : undefined }}
                          {...handlers}
                        />
                      ) : (
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={tip}
                          title={tip}
                          className={`group absolute top-1.5 bottom-1.5 cursor-grab touch-none overflow-hidden rounded-md active:cursor-grabbing ${drag?.id === t.id ? "shadow-lg" : ""}`}
                          style={{ left: box.left + 1, width: Math.max(box.width - 2, 6), background: `${color}40`, boxShadow: onChain ? "inset 0 0 0 2px #140700" : undefined }}
                          {...handlers}
                        >
                          <div className="absolute inset-y-0 left-0" style={{ width: `${t.status === "done" ? 100 : t.progress}%`, background: color }} />
                          {box.width > 44 && (
                            <span className="relative flex h-full items-center gap-1 truncate px-2 text-[11px] text-ink">
                              {blockers.length > 0 && <LinkIcon size={11} />}
                              {owner && (
                                <>
                                  <span className="inline-block size-2 flex-none rounded-full ring-1 ring-white" style={{ background: personColor(t.assignee_id) }} />
                                  {box.width > 90 && <span className="truncate">{owner}</span>}
                                </>
                              )}
                            </span>
                          )}
                          {(["start", "end"] as const).map((edge) => (
                            <span
                              key={edge}
                              aria-hidden
                              className={`absolute inset-y-0 w-2 cursor-ew-resize bg-ink/20 opacity-0 group-hover:opacity-100 ${edge === "start" ? "left-0" : "right-0"}`}
                              onPointerDown={(e) => startDrag(e, t, edge)}
                              onPointerMove={moveDrag}
                              onPointerUp={() => endDrag(t)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {unscheduled.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-1 text-sm font-medium">
            Not scheduled <span className="font-normal text-mute">{unscheduled.length}</span>
          </h3>
          <p className="mb-2 text-xs text-mute">These have no dates, so they can’t be placed on the timeline.</p>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((t) => (
              <button key={t.id} onClick={() => onOpen(t.id)} className="ws-btn !items-stretch !rounded-lg text-left">
                <PriorityBar priority={t.priority} />
                <span className="flex flex-col leading-tight">
                  <span className={t.status === "done" ? "text-mute line-through" : ""}>{t.title}</span>
                  {boardNames && <span className="text-[11px] text-mute">{boardNames.get(t.board_id)}</span>}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Legend({ chain }: { chain: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mute">
      {(Object.keys(STATUS_COLOR) as Task["status"][]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: STATUS_COLOR[s] }} />
          {STATUS_LABEL[s]}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-0.5" style={{ background: "#14070066" }} />
        Today
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block size-2.5 rounded-sm" style={{ background: LATE }} />
        Overdue
      </span>
      {chain && (
        <span className="inline-flex items-center gap-1.5" title="The run of dependent work that sets the finish date">
          <span className="inline-block w-4 border-t-2 border-ink" />
          Longest chain
        </span>
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
