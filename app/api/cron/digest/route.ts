import { NextResponse, type NextRequest } from "next/server";
import { renderEmail, sendEmail, type Block } from "@/lib/workspace/mailer";
import { isAdminConfigured, supabaseAdmin } from "@/lib/workspace/supabase-admin";

/**
 * The workspace's morning digest, run by Vercel Cron at 02:30 UTC (08:00 IST;
 * see vercel.json — on the Hobby plan the exact minute drifts within the hour).
 *
 * Lives outside app/(workspace) because the cron calls the production domain,
 * not work.: the proxy passes /api/* through untouched.
 *
 * Each person who wants it gets one email with what's overdue, due today, due
 * in the next week, and — for board owners — what's waiting for sign-off.
 * Nothing to say, no email. Resend's idempotency key makes a retried run safe.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAdminConfigured) return NextResponse.json({ error: "SUPABASE_SECRET_KEY not set" }, { status: 500 });

  const origin = (process.env.WORKSPACE_URL || "https://work.kavasconsultancy.com").replace(/\/$/, "");
  const today = istDate(0);
  const weekOut = istDate(7);
  const db = supabaseAdmin();

  const [p, bd] = await Promise.all([
    db.from("profiles").select("id, email, full_name").eq("is_active", true).eq("email_digest", true),
    db.from("task_boards").select("id, name, owner_id").eq("is_archived", false),
  ]);
  // A failed read must fail the run (and show in Vercel's cron log), never
  // pass as "nobody had anything due".
  if (p.error || bd.error) return NextResponse.json({ error: (p.error ?? bd.error)!.message }, { status: 500 });
  const people = p.data;
  const boards = bd.data;
  if (!people.length || !boards.length) return NextResponse.json({ sent: 0, people: people.length });

  const boardName = new Map(boards.map((b) => [b.id, b.name]));
  const { data: tasks, error: taskError } = await db
    .from("tasks")
    .select("id, title, status, due_date, assignee_id, board_id")
    .in("board_id", boards.map((b) => b.id))
    .neq("status", "done");
  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });

  let sent = 0;
  for (const person of people) {
    const mine = (tasks ?? []).filter((t) => t.assignee_id === person.id);
    const item = (t: (typeof mine)[number], meta: string, late = false) => ({
      label: t.title,
      meta: `${boardName.get(t.board_id) ?? "Board"} · ${meta}`,
      href: `${origin}/tasks?task=${t.id}`,
      late,
    });
    const overdue = mine.filter((t) => t.due_date && t.due_date < today).sort(byDue);
    const dueToday = mine.filter((t) => t.due_date === today);
    const soon = mine.filter((t) => t.due_date && t.due_date > today && t.due_date <= weekOut).sort(byDue);
    const owned = new Set(boards.filter((b) => b.owner_id === person.id).map((b) => b.id));
    const signOff = (tasks ?? []).filter((t) => t.status === "quality_check" && owned.has(t.board_id) && t.assignee_id !== person.id);

    if (!overdue.length && !dueToday.length && !signOff.length) continue;

    const blocks: Block[] = [];
    if (overdue.length) blocks.push({ kind: "list", title: `Overdue (${overdue.length})`, items: overdue.map((t) => item(t, `was due ${pretty(t.due_date!)}`, true)) });
    if (dueToday.length) blocks.push({ kind: "list", title: `Due today (${dueToday.length})`, items: dueToday.map((t) => item(t, "due today")) });
    if (signOff.length) blocks.push({ kind: "list", title: `Waiting for your sign-off (${signOff.length})`, items: signOff.map((t) => item(t, "in Quality check")) });
    if (soon.length) blocks.push({ kind: "list", title: "Coming up this week", items: soon.slice(0, 6).map((t) => item(t, `due ${pretty(t.due_date!)}`)) });

    const name = (person.full_name || person.email).split(" ")[0];
    const counts = [overdue.length && `${overdue.length} overdue`, dueToday.length && `${dueToday.length} due today`, signOff.length && `${signOff.length} to sign off`].filter(Boolean).join(", ");
    const { html, text } = renderEmail({
      heading: `Good morning, ${name}`,
      blocks: [{ kind: "text", text: `Here’s what needs you today — ${counts}.` }, ...blocks],
      button: { label: "Open my tasks", href: `${origin}/tasks` },
      footer: "Your morning digest from Kavas Workspace. Turn it off under My account.",
    });
    if (await sendEmail({ to: person.email, subject: `Today: ${counts}`, html, text, idempotencyKey: `digest-${today}-${person.id}` })) sent++;
  }
  return NextResponse.json({ sent, people: people.length, date: today });
}

/** YYYY-MM-DD in India, `days` from now. */
function istDate(days: number) {
  return new Date(Date.now() + (5.5 * 60 + days * 24 * 60) * 60_000).toISOString().slice(0, 10);
}

function byDue(a: { due_date: string | null }, b: { due_date: string | null }) {
  return (a.due_date ?? "").localeCompare(b.due_date ?? "");
}

function pretty(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}
