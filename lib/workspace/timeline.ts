// Timeline geometry for the Tasks Gantt — pure functions, no React, no clock.
// Ported in spirit from the Conscious Cafe manager's ganttLayout.
//
// Dates are 'YYYY-MM-DD' strings, matching the DATE columns. They are turned
// into whole day numbers via Date.UTC and never into local Date objects:
// `new Date('2026-10-01')` is UTC midnight, which renders as 30 September
// anywhere west of Greenwich. Day numbers have no zone to get wrong.
//
// `today` is always a parameter, so the caller decides what "today" means.

const MS_PER_DAY = 86_400_000;

export type Zoom = "day" | "week" | "month";

/** Horizontal scale. Bars, the today line and the header all use the same one. */
export const PX_PER_DAY: Record<Zoom, number> = { day: 36, week: 14, month: 4 };

export function toDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function fromDay(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

const utc = (day: number) => new Date(day * MS_PER_DAY);

/** Monday on or before `day`. */
function mondayOf(day: number) {
  return day - ((utc(day).getUTCDay() + 6) % 7);
}

function firstOfMonth(day: number) {
  const d = utc(day);
  return Math.round(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / MS_PER_DAY);
}

type Dated = { start_date: string | null; due_date: string | null };

/**
 * A task's span in days, inclusive at both ends. A task with only one date is
 * a milestone on that day. No dates at all: null — it belongs in the
 * unscheduled tray, not on the timeline.
 */
export function spanOf(t: Dated): { start: number; end: number; milestone: boolean } | null {
  const s = t.start_date ?? t.due_date;
  const e = t.due_date ?? t.start_date;
  if (!s || !e) return null;
  return { start: toDay(s), end: toDay(e), milestone: !t.start_date || !t.due_date };
}

const PAD: Record<Zoom, number> = { day: 3, week: 10, month: 31 };
const MIN_DAYS: Record<Zoom, number> = { day: 28, week: 84, month: 365 };

/**
 * The window every bar is measured against. It always contains today, so the
 * today line is never off-screen and an empty board still shows where now is.
 * It starts on a Monday (day, week) or the 1st (month) so columns line up.
 */
export function buildWindow(tasks: Dated[], today: number, zoom: Zoom) {
  let lo = today;
  let hi = today;
  for (const t of tasks) {
    const s = spanOf(t);
    if (!s) continue;
    lo = Math.min(lo, s.start);
    hi = Math.max(hi, s.end);
  }
  lo -= PAD[zoom];
  hi += PAD[zoom];
  const start = zoom === "month" ? firstOfMonth(lo) : mondayOf(lo);
  const end = Math.max(hi, start + MIN_DAYS[zoom] - 1);
  return { start, end, days: end - start + 1 };
}

export type Segment = { label: string; left: number; width: number; weekend?: boolean };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The two header rows, as pixel segments. Top: months (or years when zoomed
 * out to months). Bottom: days, weeks (labelled by their Monday) or months.
 */
export function headerRows(win: { start: number; end: number }, zoom: Zoom) {
  const ppd = PX_PER_DAY[zoom];
  const group = (keyOf: (day: number) => string, labelOf: (day: number) => string, weekendOf?: (day: number) => boolean) => {
    const out: Segment[] = [];
    let key = "";
    for (let day = win.start; day <= win.end; day++) {
      const k = keyOf(day);
      if (k !== key) {
        out.push({ label: labelOf(day), left: (day - win.start) * ppd, width: 0, weekend: weekendOf?.(day) });
        key = k;
      }
      out[out.length - 1].width += ppd;
    }
    return out;
  };
  const ym = (day: number) => `${utc(day).getUTCFullYear()}-${utc(day).getUTCMonth()}`;
  const monthYear = (day: number) => `${MONTHS[utc(day).getUTCMonth()]} ${utc(day).getUTCFullYear()}`;

  if (zoom === "day") {
    return {
      top: group(ym, monthYear),
      bottom: group(String, (day) => String(utc(day).getUTCDate()), (day) => [0, 6].includes(utc(day).getUTCDay())),
    };
  }
  if (zoom === "week") {
    return {
      top: group(ym, monthYear),
      bottom: group((day) => String(mondayOf(day)), (day) => String(utc(mondayOf(day)).getUTCDate())),
    };
  }
  return {
    top: group((day) => String(utc(day).getUTCFullYear()), (day) => String(utc(day).getUTCFullYear())),
    bottom: group(ym, (day) => MONTHS[utc(day).getUTCMonth()]),
  };
}

/** Pixel left/width of a span inside the window. Inclusive: one day is one column wide. */
export function barBox(span: { start: number; end: number }, winStart: number, zoom: Zoom) {
  const ppd = PX_PER_DAY[zoom];
  return { left: (span.start - winStart) * ppd, width: (span.end - span.start + 1) * ppd };
}

export type DragMode = "move" | "start" | "end";

/**
 * Dates after dragging a bar by `delta` days. A resize never lets the start
 * pass the end. A milestone only moves, and keeps whichever single date it had.
 */
export function reschedule(t: Dated, mode: DragMode, delta: number): Dated {
  const s = spanOf(t);
  if (!s || delta === 0) return t;
  if (s.milestone) {
    return {
      start_date: t.start_date ? fromDay(s.start + delta) : null,
      due_date: t.due_date ? fromDay(s.end + delta) : null,
    };
  }
  if (mode === "move") return { start_date: fromDay(s.start + delta), due_date: fromDay(s.end + delta) };
  if (mode === "start") return { start_date: fromDay(Math.min(s.start + delta, s.end)), due_date: t.due_date };
  return { start_date: t.start_date, due_date: fromDay(Math.max(s.end + delta, s.start)) };
}
