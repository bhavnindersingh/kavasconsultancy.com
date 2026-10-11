import type { Task, TaskPriority } from "@/lib/workspace/types";

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: "#c9c5c0",
  medium: "#8a9bb0",
  high: "#d9822b",
  urgent: "#b42318",
};

export function PriorityDot({ priority }: { priority: TaskPriority }) {
  return (
    <span
      title={`${priority} priority`}
      className="mt-[5px] inline-block size-2 flex-none rounded-full"
      style={{ background: PRIORITY_COLOR[priority] }}
    />
  );
}

/** Today as YYYY-MM-DD in the viewer's zone — DATE columns have no zone. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function dueLabel(t: Pick<Task, "due_date" | "status">) {
  if (!t.due_date) return { text: "", late: false };
  const late = t.status !== "done" && t.due_date < today();
  return { text: `${late ? "Overdue · " : "Due "}${formatDate(t.due_date)}`, late };
}

/** One colour per status, shared by the timeline bars and the person view. */
export const STATUS_COLOR: Record<Task["status"], string> = {
  todo: "#a8a39d",
  in_progress: "#3b6ea8",
  blocked: "#b42318",
  quality_check: "#d9822b",
  done: "#4f8a5b",
};

/** Whole days from today to the due date (negative = past). Null when undated. */
export function daysUntilDue(t: Pick<Task, "due_date">) {
  if (!t.due_date) return null;
  const [y, m, d] = t.due_date.split("-").map(Number);
  const [ty, tm, td] = today().split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
}
