"use server";

import { PREFS_FOOTER, renderEmail, sendEmail, workspaceOrigin } from "@/lib/workspace/mailer";
import { currentProfile, supabaseServer } from "@/lib/workspace/supabase-server";
import { STATUS_LABEL, type TaskStatus } from "@/lib/workspace/types";

// Task emails. The client calls these after a change it just made, fire and
// forget. Each takes only an id and re-reads everything through the caller's
// own session (RLS applies), then sends only if the activity log shows the
// CALLER made that change in the last few minutes — so these can't be used to
// mail anyone anything, only to announce what the caller actually did.
// Resend's idempotency key (the event or comment id) stops double sends.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FRESH_MS = 5 * 60 * 1000;

type Recipient = { id: string; email: string; full_name: string | null; is_active: boolean; email_notifications?: boolean };

const fresh = (at: string) => Date.now() - new Date(at).getTime() < FRESH_MS;
const first = (name: string | null, email: string) => (name || email).split(" ")[0];

function formatDate(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

async function context(taskId: string) {
  if (!UUID.test(taskId)) return null;
  const me = await currentProfile();
  if (!me) return null;
  const supabase = await supabaseServer();
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, status, priority, due_date, assignee_id, created_by, board:task_boards(id, name, owner_id)")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return null;
  const board = (Array.isArray(task.board) ? task.board[0] : task.board) as { id: string; name: string; owner_id: string | null } | null;
  return { me, supabase, task, board, link: `${await workspaceOrigin()}/tasks?task=${task.id}` };
}

async function recipient(supabase: Awaited<ReturnType<typeof supabaseServer>>, id: string | null, meId: string) {
  if (!id || id === meId) return null;
  const { data } = await supabase.from("profiles").select("id, email, full_name, is_active, email_notifications").eq("id", id).maybeSingle();
  const r = data as Recipient | null;
  return r && r.is_active && r.email_notifications !== false ? r : null;
}

/** "Pat assigned you: Write proposal". */
export async function notifyAssigned(taskId: string) {
  const c = await context(taskId);
  if (!c) return;
  const { data: ev } = await c.supabase
    .from("task_events")
    .select("id, actor_id, created_at")
    .eq("task_id", taskId)
    .eq("field", "assignee")
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ev || ev.actor_id !== c.me.id || !fresh(ev.created_at)) return;
  const to = await recipient(c.supabase, c.task.assignee_id, c.me.id);
  if (!to) return;

  const actor = c.me.full_name || c.me.email;
  const due = formatDate(c.task.due_date);
  const { html, text } = renderEmail({
    heading: `${actor} assigned you a task`,
    blocks: [
      { kind: "text", text: `Hi ${first(to.full_name, to.email)}, this one is yours now:` },
      { kind: "quote", text: c.task.title },
      {
        kind: "facts",
        rows: [
          ["Board", c.board?.name ?? "—"],
          ["Status", STATUS_LABEL[c.task.status as TaskStatus] ?? c.task.status],
          ["Priority", c.task.priority[0].toUpperCase() + c.task.priority.slice(1)],
          ...(due ? ([["Due", due]] as [string, string][]) : []),
        ],
      },
    ],
    button: { label: "Open the task", href: c.link },
    footer: PREFS_FOOTER,
  });
  await sendEmail({ to: to.email, subject: `${actor} assigned you: ${c.task.title}`, html, text, replyTo: c.me.email, idempotencyKey: `assign-${ev.id}` });
}

/** "New comment on Write proposal" — to the assignee, or the creator when nobody is. */
export async function notifyComment(commentId: string) {
  if (!UUID.test(commentId)) return;
  const me = await currentProfile();
  if (!me) return;
  const supabase = await supabaseServer();
  const { data: comment } = await supabase.from("task_comments").select("id, task_id, author_id, body, created_at").eq("id", commentId).maybeSingle();
  if (!comment || comment.author_id !== me.id || !fresh(comment.created_at)) return;
  const c = await context(comment.task_id);
  if (!c) return;
  const to = await recipient(c.supabase, c.task.assignee_id ?? c.task.created_by, me.id);
  if (!to) return;

  const actor = me.full_name || me.email;
  const { html, text } = renderEmail({
    heading: `${actor} commented on “${c.task.title}”`,
    blocks: [
      { kind: "quote", text: comment.body.length > 1200 ? `${comment.body.slice(0, 1200)}…` : comment.body },
      { kind: "facts", rows: [["Board", c.board?.name ?? "—"]] },
      { kind: "text", text: `Reply to this email to answer ${first(me.full_name, me.email)} directly, or reply on the task.` },
    ],
    button: { label: "Reply on the task", href: c.link },
    footer: PREFS_FOOTER,
  });
  await sendEmail({ to: to.email, subject: `Re: ${c.task.title}`, html, text, replyTo: me.email, idempotencyKey: `comment-${comment.id}` });
}

/** "Ready for your sign-off" — to the board owner when a task reaches Quality check. */
export async function notifyReadyForSignOff(taskId: string) {
  const c = await context(taskId);
  if (!c || c.task.status !== "quality_check") return;
  const { data: ev } = await c.supabase
    .from("task_events")
    .select("id, actor_id, to_value, created_at")
    .eq("task_id", taskId)
    .eq("field", "status")
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ev || ev.actor_id !== c.me.id || ev.to_value !== "quality_check" || !fresh(ev.created_at)) return;
  const to = await recipient(c.supabase, c.board?.owner_id ?? null, c.me.id);
  if (!to) return;

  const actor = c.me.full_name || c.me.email;
  const { html, text } = renderEmail({
    heading: "Ready for your sign-off",
    blocks: [
      { kind: "text", text: `${actor} moved this to Quality check on ${c.board?.name ?? "a board"} you own. Only you (or a partner) can mark it Done.` },
      { kind: "quote", text: c.task.title },
    ],
    button: { label: "Review and sign off", href: c.link },
    footer: PREFS_FOOTER,
  });
  await sendEmail({ to: to.email, subject: `Ready for sign-off: ${c.task.title}`, html, text, replyTo: c.me.email, idempotencyKey: `signoff-${ev.id}` });
}
