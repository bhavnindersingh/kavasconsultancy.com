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
 * Each person who wants it gets one email: what's overdue, due today, has no
 * deadline, is due in the next week; for board owners, what's waiting for
 * their sign-off (oldest first, with how long); for assignees, their finished
 * work still waiting on someone else's; and any of their deadlines moved
 * yesterday. Partners also get every move, and the overdue or undated work
 * nobody is assigned to — otherwise no one is ever told about it.
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
    db.from("profiles").select("id, email, full_name, role").eq("is_active", true).eq("email_digest", true),
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
    .select("id, title, status, due_date, assignee_id, board_id, updated_at")
    .in("board_id", boards.map((b) => b.id))
    .neq("status", "done");
  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });

  // Deadlines moved yesterday (IST), for partners — as in the manager's digest.
  // A date set for the first time isn't a move; a removed one is.
  const yStart = new Date(`${istDate(-1)}T00:00:00+05:30`).toISOString();
  const yEnd = new Date(`${today}T00:00:00+05:30`).toISOString();
  const { data: moves } = await db
    .from("task_events")
    .select("task_id, actor_name, from_value, to_value, created_at, task:tasks!inner(title, board_id)")
    .eq("field", "due_date")
    .not("from_value", "is", null)
    .gte("created_at", yStart)
    .lt("created_at", yEnd)
    .order("seq");
  const moved = ((moves ?? []) as unknown as { task_id: string; actor_name: string; from_value: string; to_value: string | null; task: { title: string; board_id: string } | { title: string; board_id: string }[] }[])
    .map((m) => ({ ...m, task: Array.isArray(m.task) ? m.task[0] : m.task }))
    .filter((m) => m.task && boardName.has(m.task.board_id));

  // When each Quality Check task got there, from the activity trail, so
  // sign-off rows can say how long they've waited. Falls back to updated_at.
  const inQc = (tasks ?? []).filter((t) => t.status === "quality_check");
  const qcSince = new Map<string, string>();
  if (inQc.length) {
    const { data: qcEvents } = await db
      .from("task_events")
      .select("task_id, created_at")
      .eq("field", "status")
      .eq("to_value", "quality_check")
      .in("task_id", inQc.map((t) => t.id))
      .order("created_at");
    (qcEvents ?? []).forEach((e) => qcSince.set(e.task_id, e.created_at)); // latest wins
  }
  const ownerOf = new Map(boards.map((b) => [b.id, b.owner_id as string | null]));
  const nameOf = new Map(people.map((x) => [x.id, x.full_name || x.email]));
  const waitedDays = (t: { id: string; updated_at: string }) =>
    Math.max(0, Math.floor((Date.now() - Date.parse(qcSince.get(t.id) ?? t.updated_at)) / 86_400_000));
  const waited = (t: { id: string; updated_at: string }) => {
    const d = waitedDays(t);
    return d === 0 ? "since today" : `waiting ${d} day${d === 1 ? "" : "s"}`;
  };
  const oldestFirst = (a: { id: string; updated_at: string }, b: { id: string; updated_at: string }) => waitedDays(b) - waitedDays(a);
  const unassigned = (tasks ?? []).filter((t) => !t.assignee_id && (!t.due_date || t.due_date < today)).sort(byDue);

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
    const signOff = inQc.filter((t) => owned.has(t.board_id) && t.assignee_id !== person.id).sort(oldestFirst);
    // Your finished work that's still waiting on the board owner.
    const awaitingOthers = mine.filter((t) => t.status === "quality_check" && ownerOf.get(t.board_id) !== person.id).sort(oldestFirst);
    const undated = mine.filter((t) => !t.due_date && t.status !== "quality_check");
    const mineIds = new Set(mine.map((t) => t.id));
    const slips = person.role === "partner" ? moved : moved.filter((m) => mineIds.has(m.task_id));
    const orphans = person.role === "partner" ? unassigned : [];

    if (!overdue.length && !dueToday.length && !signOff.length && !awaitingOthers.length && !undated.length && !slips.length && !orphans.length) continue;

    const blocks: Block[] = [];
    if (overdue.length) blocks.push({ kind: "list", title: `Overdue (${overdue.length})`, items: overdue.map((t) => item(t, `was due ${pretty(t.due_date!)}`, true)) });
    if (dueToday.length) blocks.push({ kind: "list", title: `Due today (${dueToday.length})`, items: dueToday.map((t) => item(t, "due today")) });
    if (signOff.length)
      blocks.push({ kind: "list", title: `Waiting for your sign-off (${signOff.length})`, items: signOff.map((t) => item(t, `in Quality check · ${waited(t)}`, waitedDays(t) >= 3)) });
    if (awaitingOthers.length)
      blocks.push({
        kind: "list",
        title: `Your finished work, waiting for sign-off (${awaitingOthers.length})`,
        items: awaitingOthers.map((t) => {
          const owner = ownerOf.get(t.board_id);
          const who = owner ? `${nameOf.get(owner) ?? "a former member"} signs off` : "board has no owner — ask a partner";
          return item(t, `${who} · ${waited(t)}`, !owner || waitedDays(t) >= 3);
        }),
      });
    if (undated.length)
      blocks.push({ kind: "list", title: `No deadline (${undated.length}) — it can never be late, so nobody is told to chase it`, items: undated.map((t) => item(t, "no due date")) });
    if (soon.length) blocks.push({ kind: "list", title: "Coming up this week", items: soon.slice(0, 6).map((t) => item(t, `due ${pretty(t.due_date!)}`)) });
    if (orphans.length)
      blocks.push({
        kind: "list",
        title: `Nobody's on these (${orphans.length}) — overdue or undated, and unassigned`,
        items: orphans.map((t) => item(t, t.due_date ? `was due ${pretty(t.due_date)}` : "no due date", !!t.due_date)),
      });
    if (slips.length)
      blocks.push({
        kind: "list",
        title: person.role === "partner" ? `Deadlines moved yesterday (${slips.length})` : `Your deadlines moved yesterday (${slips.length})`,
        items: slips.map((m) => {
          const slip = m.to_value ? Math.round((Date.parse(m.to_value) - Date.parse(m.from_value)) / 86_400_000) : null;
          const to = m.to_value ? `${pretty(m.to_value)} (${slip! > 0 ? "+" : ""}${slip}d)` : "removed";
          return {
            label: m.task.title,
            meta: `${boardName.get(m.task.board_id)} · ${pretty(m.from_value)} → ${to} · by ${m.actor_name}`,
            href: `${origin}/tasks?task=${m.task_id}`,
            late: !m.to_value || (slip ?? 0) > 0,
          };
        }),
      });

    const name = (person.full_name || person.email).split(" ")[0];
    const counts =
      [
        overdue.length && `${overdue.length} overdue`,
        dueToday.length && `${dueToday.length} due today`,
        signOff.length && `${signOff.length} to sign off`,
        awaitingOthers.length && `${awaitingOthers.length} awaiting sign-off`,
        undated.length && `${undated.length} with no deadline`,
        slips.length && `${slips.length} deadline${slips.length === 1 ? "" : "s"} moved`,
        orphans.length && `${orphans.length} unassigned`,
      ]
        .filter(Boolean)
        .join(", ") || "nothing urgent";
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
