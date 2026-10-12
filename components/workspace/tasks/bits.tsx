import type { Task, TaskPriority, TaskStatus } from "@/lib/workspace/types";

// Small shared pieces of the task board: the vocabulary every view uses, so a
// task reads the same on a card, in the list, on the timeline and in My work.

// Red is late and nothing else, so Urgent is ink, not red; amber is "due
// soon", so High is a deep orange-brown rather than the soon/QC amber.
export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  urgent: "#140700",
  high: "#b45309",
  medium: "#8a9bb0",
  low: "#c9c5c0",
};

/** One colour per status, shared by dots, pills and timeline bars. */
export const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "#a8a39d",
  in_progress: "#3b6ea8",
  blocked: "#7c3aed",
  quality_check: "#0f766e",
  done: "#4f8a5b",
};

/** Red is late, and red is nothing else. */
export const LATE = "#b42318";

// ── Dates ──────────────────────────────────────────────────────────────────
// DATE columns are 'YYYY-MM-DD' with no zone. "Today" is the viewer's day.

/** Today as YYYY-MM-DD in the viewer's zone. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const utc = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export function formatDate(iso: string) {
  return new Date(utc(iso)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** "Mon 3 Aug" — the short form the board uses everywhere. */
export function shortDate(iso: string) {
  const d = new Date(utc(iso));
  return `${d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })} ${d.getUTCDate()} ${d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}`;
}

/** Whole days from today to the due date (negative = past). Null when undated. */
export function daysUntilDue(t: Pick<Task, "due_date">) {
  if (!t.due_date) return null;
  return Math.round((utc(t.due_date) - utc(today())) / 86_400_000);
}

/**
 * Late = past its due date and not done. Defined on status alone: finished
 * work stops being late because it's Done, never because of its progress.
 * Every rendering of lateness — colour and wording — routes through here.
 */
export function isOverdue(t: Pick<Task, "due_date" | "status">) {
  const d = daysUntilDue(t);
  return t.status !== "done" && d !== null && d < 0;
}

export type DueTone = "late" | "soon" | "ok";

/**
 * The card's due chip. A deadline is a claim about work still to be done, so
 * a finished task states no date at all.
 */
export function dueChip(t: Pick<Task, "due_date" | "status">): { text: string; tone: DueTone } | null {
  const d = daysUntilDue(t);
  if (t.status === "done" || d === null) return null;
  if (d < -1) return { text: `${-d}d overdue`, tone: "late" };
  if (d === -1) return { text: "Yesterday", tone: "late" };
  if (d === 0) return { text: "Today", tone: "soon" };
  if (d === 1) return { text: "Tomorrow", tone: "soon" };
  if (d <= 7) return { text: `In ${d}d`, tone: "ok" };
  return { text: shortDate(t.due_date!), tone: "ok" };
}

/** The person view's wording: like the chip, but dated beyond tomorrow. */
export function dueWords(t: Pick<Task, "due_date" | "status">) {
  const d = daysUntilDue(t);
  if (t.status === "done" || d === null) return null;
  if (d < -1) return { text: `${-d}d overdue`, late: true };
  if (d === -1) return { text: "Yesterday", late: true };
  if (d === 0) return { text: "Today", late: false };
  if (d === 1) return { text: "Tomorrow", late: false };
  return { text: shortDate(t.due_date!), late: false };
}

/** Kept for older call sites: "Overdue · 3 Oct 2026" / "Due 3 Oct 2026". */
export function dueLabel(t: Pick<Task, "due_date" | "status">) {
  if (!t.due_date) return { text: "", late: false };
  const late = isOverdue(t);
  return { text: `${late ? "Overdue · " : "Due "}${formatDate(t.due_date)}`, late };
}

/** "now", "12m", "3h", "4d", then "3 Aug". */
export function relativeTime(at: string) {
  const ms = Date.now() - new Date(at).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export const fullTime = (at: string) => new Date(at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

// ── People ─────────────────────────────────────────────────────────────────
// One colour each, the same everywhere: a djb2 hash of the profile id.

const PERSON_HUES = ["#3b6ea8", "#0f766e", "#b45309", "#7c3aed", "#be185d", "#4d7c0f", "#0369a1", "#9a3412"];
export const UNASSIGNED_COLOR = "#a0aec0";

export function personColor(id: string | null) {
  if (!id) return UNASSIGNED_COLOR;
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  return PERSON_HUES[Math.abs(h) % PERSON_HUES.length];
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// ── Atoms ──────────────────────────────────────────────────────────────────

export function Disc({ id, name, size = 22 }: { id: string | null; name: string | null; size?: number }) {
  if (!id || !name)
    return (
      <span
        title="Unassigned"
        className="inline-grid flex-none place-items-center rounded-full border border-dashed border-ghost text-mute"
        style={{ width: size, height: size }}
        aria-label="Unassigned"
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="8" cy="5.5" r="2.6" />
          <path d="M3 14c.6-2.6 2.6-4 5-4s4.4 1.4 5 4" />
        </svg>
      </span>
    );
  return (
    <span
      title={name}
      className="inline-grid flex-none place-items-center rounded-full font-medium text-white"
      style={{ width: size, height: size, background: personColor(id), fontSize: size * 0.42 }}
    >
      {initials(name)}
    </span>
  );
}

export function StatusDot({ status, size = 8 }: { status: TaskStatus; size?: number }) {
  return <span className="inline-block flex-none rounded-full" style={{ width: size, height: size, background: STATUS_COLOR[status] }} />;
}

/** The small dot used in compact rows. */
export function PriorityDot({ priority }: { priority: TaskPriority }) {
  return (
    <span
      title={`${priority[0].toUpperCase() + priority.slice(1)} priority`}
      className="mt-[5px] inline-block size-2 flex-none rounded-full"
      style={{ background: PRIORITY_COLOR[priority] }}
    />
  );
}

/** The vertical priority bar — the left edge of cards and rows. */
export function PriorityBar({ priority, className = "" }: { priority: TaskPriority; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block w-[3px] flex-none self-stretch rounded-full ${className}`}
      style={{ background: PRIORITY_COLOR[priority] }}
    />
  );
}

export function StatusPill({ status, label }: { status: TaskStatus; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-paper px-2 py-0.5 text-xs text-body">
      <StatusDot status={status} size={7} />
      {label}
    </span>
  );
}

export function LinkIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 014 4l-1 1M9 11.5l-1 1a2.8 2.8 0 01-4-4l1-1" strokeLinecap="round" />
    </svg>
  );
}
