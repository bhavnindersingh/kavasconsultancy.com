"use client";

import { useMemo, useRef, useState } from "react";
import { STATUS_LABEL, type Task, type TaskDependency } from "@/lib/workspace/types";
import {
  PX_PER_DAY,
  barBox,
  buildWindow,
  headerRows,
  reschedule,
  spanOf,
  toDay,
  type DragMode,
  type Zoom,
} from "@/lib/workspace/timeline";
import { useWorkspace } from "../WorkspaceContext";
import { PriorityDot, STATUS_COLOR, dueLabel, formatDate, today } from "./bits";

const NAME_W = 240;
const ROW_H = 36;
const HEAD_H = 52;

type Drag = { id: string; mode: DragMode; x0: number; delta: number; moved: boolean };

export default function GanttView({
  tasks,
  deps,
  onOpen,
  onReschedule,
}: {
  tasks: Task[];
  deps: TaskDependency[];
  onOpen: (id: string) => void;
  onReschedule: (id: string, dates: Pick<Task, "start_date" | "due_date">) => void;
}) {
  const { nameOf } = useWorkspace();
  const [zoom, setZoom] = useState<Zoom>("day");
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);

  const ppd = PX_PER_DAY[zoom];
  const todayDay = toDay(today());

  const { scheduled, unscheduled } = useMemo(() => {
    const withSpan = tasks.map((t) => ({ t, s: spanOf(t) }));
    return {
      scheduled: withSpan
        .filter((x): x is { t: Task; s: NonNullable<ReturnType<typeof spanOf>> } => x.s !== null)
        .sort((a, b) => a.s.start - b.s.start || a.s.end - b.s.end || a.t.sort_order - b.t.sort_order)
        .map((x) => x.t),
      unscheduled: withSpan.filter((x) => !x.s).map((x) => x.t),
    };
  }, [tasks]);

  const win = useMemo(() => buildWindow(scheduled, todayDay, zoom), [scheduled, todayDay, zoom]);
  const header = useMemo(() => headerRows(win, zoom), [win, zoom]);
  const width = win.days * ppd;
  const rowOf = new Map(scheduled.map((t, i) => [t.id, i]));

  /** The dates a bar shows right now — its own, or where a drag is taking it. */
  const shown = (t: Task) => (drag?.id === t.id && drag.delta ? { ...t, ...reschedule(t, drag.mode, drag.delta) } : t);

  function startDrag(e: React.PointerEvent, t: Task, mode: DragMode) {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const d = { id: t.id, mode, x0: e.clientX, delta: 0, moved: false };
    dragRef.current = d;
    setDrag(d);
  }
  function moveDrag(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    const next = { ...d, moved: d.moved || Math.abs(dx) > 3, delta: Math.round(dx / ppd) };
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
    if (!d.moved) return onOpen(t.id);
    if (d.delta) onReschedule(t.id, reschedule(t, d.mode, d.delta));
  }

  // Dependency arrows: from the end of the prerequisite to the start of the
  // task that waits on it. Red when the waiting task starts before the
  // prerequisite is due — the schedule says it can't, yet.
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
    const clash = b.start <= a.end && from.status !== "done";
    return [{ key: `${dep.task_id}-${dep.depends_on_task_id}`, d: `M${x1},${y1} H${x1 + 8} V${y2} H${x2}`, clash }];
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="inline-flex rounded-full border border-line bg-card p-0.5" role="group" aria-label="Zoom">
          {(["day", "week", "month"] as Zoom[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`rounded-full px-3 py-1 text-sm capitalize ${zoom === z ? "bg-ink text-paper" : ""}`}
            >
              {z}
            </button>
          ))}
        </div>
        <p className="text-xs text-mute">Drag a bar to move it, or its ends to change the dates. Click to open.</p>
      </div>

      {scheduled.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ghost p-8 text-center text-mute">
          Nothing on the timeline yet. Give a task a start or due date and it appears here.
        </p>
      ) : (
        <div className="w-fit max-w-full overflow-x-auto rounded-2xl border border-line bg-card">
          <div className="relative" style={{ width: NAME_W + width }}>
            {/* Header */}
            <div className="sticky top-0 z-20 flex border-b border-line bg-card" style={{ height: HEAD_H }}>
              <div className="sticky left-0 z-10 flex items-end bg-card border-r border-line px-3 pb-1.5 text-xs text-mute" style={{ width: NAME_W, minWidth: NAME_W }}>
                Task
              </div>
              <div className="relative" style={{ width }}>
                {header.top.map((s) => (
                  <div key={`t${s.left}`} className="absolute top-0 h-1/2 border-l border-line px-1.5 pt-1 text-xs font-medium truncate" style={{ left: s.left, width: s.width }}>
                    {s.label}
                  </div>
                ))}
                {header.bottom.map((s) => (
                  <div
                    key={`b${s.left}`}
                    className={`absolute bottom-0 h-1/2 border-l border-line text-[11px] text-mute flex items-center ${zoom === "day" ? "justify-center" : "px-1.5"} ${s.weekend ? "bg-paper" : ""}`}
                    style={{ left: s.left, width: s.width }}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="relative" style={{ height: scheduled.length * ROW_H }}>
              {/* Gridlines, weekends and today, behind everything */}
              <div className="absolute inset-y-0" style={{ left: NAME_W, width }} aria-hidden>
                {header.bottom.map((s) => (
                  <div key={s.left} className={`absolute inset-y-0 border-l border-line/70 ${s.weekend ? "bg-paper" : ""}`} style={{ left: s.left, width: s.width }} />
                ))}
                {todayDay >= win.start && todayDay <= win.end && (
                  <div className="absolute inset-y-0 w-0.5 bg-[#b42318]/60" style={{ left: (todayDay - win.start) * ppd + ppd / 2 }} title="Today" />
                )}
              </div>

              {scheduled.map((t, i) => {
                const view = shown(t);
                const s = spanOf(view)!;
                const box = barBox(s, win.start, zoom);
                const color = STATUS_COLOR[t.status];
                const late = dueLabel(t).late;
                return (
                  <div key={t.id} className="absolute inset-x-0 flex border-b border-line/70" style={{ top: i * ROW_H, height: ROW_H }}>
                    <button
                      onClick={() => onOpen(t.id)}
                      className="sticky left-0 z-10 flex items-center gap-2 bg-card border-r border-line px-3 text-left text-[13px] hover:bg-paper"
                      style={{ width: NAME_W, minWidth: NAME_W }}
                    >
                      <PriorityDot priority={t.priority} />
                      <span className={`truncate ${t.status === "done" ? "line-through text-mute" : ""}`}>{t.title}</span>
                    </button>
                    <div className="relative" style={{ width }}>
                      {s.milestone ? (
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`${t.title}, ${formatDate(view.due_date ?? view.start_date!)}`}
                          title={`${t.title} — ${STATUS_LABEL[t.status]} · ${formatDate(view.due_date ?? view.start_date!)}`}
                          className="absolute top-1/2 size-3.5 -translate-y-1/2 rotate-45 cursor-grab touch-none rounded-[3px] active:cursor-grabbing"
                          style={{ left: box.left + ppd / 2 - 7, background: color, outline: late ? "2px solid #b42318" : undefined, outlineOffset: 2 }}
                          onPointerDown={(e) => startDrag(e, t, "move")}
                          onPointerMove={moveDrag}
                          onPointerUp={() => endDrag(t)}
                          onKeyDown={(e) => e.key === "Enter" && onOpen(t.id)}
                        />
                      ) : (
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`${t.title}, ${formatDate(view.start_date!)} to ${formatDate(view.due_date!)}`}
                          title={`${t.title} — ${STATUS_LABEL[t.status]} · ${formatDate(view.start_date!)} → ${formatDate(view.due_date!)}${t.assignee_id ? ` · ${nameOf(t.assignee_id)}` : ""}`}
                          className={`group absolute top-1.5 bottom-1.5 cursor-grab touch-none overflow-hidden rounded-md active:cursor-grabbing ${drag?.id === t.id ? "shadow-lg" : ""}`}
                          style={{ left: box.left + 1, width: Math.max(box.width - 2, 6), background: `${color}40`, boxShadow: late ? "inset 0 0 0 2px #b42318" : undefined }}
                          onPointerDown={(e) => startDrag(e, t, "move")}
                          onPointerMove={moveDrag}
                          onPointerUp={() => endDrag(t)}
                          onKeyDown={(e) => e.key === "Enter" && onOpen(t.id)}
                        >
                          <div className="absolute inset-y-0 left-0" style={{ width: `${t.status === "done" ? 100 : t.progress}%`, background: color }} />
                          <span className="relative block truncate px-2 text-[11px] leading-[24px] text-ink">
                            {box.width > 60 ? (t.assignee_id ? nameOf(t.assignee_id) : "") : ""}
                          </span>
                          {(["start", "end"] as const).map((edge) => (
                            <span
                              key={edge}
                              aria-hidden
                              className={`absolute inset-y-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-ink/20 ${edge === "start" ? "left-0" : "right-0"}`}
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

              {arrows.length > 0 && (
                <svg className="pointer-events-none absolute top-0" style={{ left: NAME_W, width, height: scheduled.length * ROW_H }} aria-hidden>
                  <defs>
                    {(["ok", "clash"] as const).map((k) => (
                      <marker key={k} id={`arrow-${k}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                        <path d="M0,0 L8,4 L0,8 z" fill={k === "clash" ? "#b42318" : "#85817d"} />
                      </marker>
                    ))}
                  </defs>
                  {arrows.map((a) => (
                    <path
                      key={a.key}
                      d={a.d}
                      fill="none"
                      stroke={a.clash ? "#b42318" : "#85817d"}
                      strokeWidth={1.5}
                      strokeDasharray={a.clash ? "4 3" : undefined}
                      markerEnd={`url(#arrow-${a.clash ? "clash" : "ok"})`}
                    />
                  ))}
                </svg>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm" style={{ background: c }} />
            {STATUS_LABEL[s as Task["status"]]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-[#b42318]" />Starts before what it waits on is due</span>
      </div>

      {unscheduled.length > 0 && (
        <section className="mt-6">
          <h3 className="text-sm font-medium mb-2">
            Not scheduled <span className="text-mute font-normal">{unscheduled.length}</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((t) => (
              <button key={t.id} onClick={() => onOpen(t.id)} className="ws-btn !rounded-lg text-left">
                <PriorityDot priority={t.priority} />
                <span className={t.status === "done" ? "line-through text-mute" : ""}>{t.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
