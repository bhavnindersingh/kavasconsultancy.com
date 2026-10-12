import "server-only";

import { headers } from "next/headers";

// Workspace emails that are about the WORK (assignments, comments, sign-off,
// the morning digest) go out through Resend's REST API from here. Sign-in
// emails (invites, resets) are sent by Supabase Auth through Resend's SMTP
// and are templated in supabase/templates/.
//
// Sending never throws into the caller: a task edit must not fail because an
// email did. Without RESEND_API_KEY (local dev, tests) one line notes the email instead.

const API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.EMAIL_FROM || "Kavas Workspace <no-reply@kavasconsultancy.com>";

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Resend drops a second send with the same key for 24 hours. */
  idempotencyKey?: string;
};

export async function sendEmail(email: Email): Promise<boolean> {
  if (!API_KEY) {
    console.info(`[mail:dev] to=${email.to} subject="${email.subject}"`);
    return true;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        ...(email.idempotencyKey ? { "Idempotency-Key": email.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: FROM,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
    });
    if (!res.ok) console.error(`[mail] ${res.status} sending "${email.subject}" to ${email.to}: ${await res.text()}`);
    return res.ok;
  } catch (e) {
    console.error(`[mail] failed sending "${email.subject}" to ${email.to}`, e);
    return false;
  }
}

/**
 * The workspace's own origin, for links in emails. From the request when there
 * is one (so local dev links to local dev), else WORKSPACE_URL (the cron job).
 */
export async function workspaceOrigin() {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host?.startsWith("work.")) return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  } catch {}
  return (process.env.WORKSPACE_URL || "https://work.kavasconsultancy.com").replace(/\/$/, "");
}

// ── Layout ─────────────────────────────────────────────────────────────────
// Table-based and inline-styled: email clients ignore stylesheets. The same
// look as supabase/templates/.

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type Block =
  | { kind: "text"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "facts"; rows: [string, string][] }
  | { kind: "list"; title: string; items: { label: string; meta?: string; href: string; late?: boolean }[] };

export function renderEmail(opts: {
  heading: string;
  blocks: Block[];
  button?: { label: string; href: string };
  footer: string;
}) {
  const body = opts.blocks
    .map((b) => {
      if (b.kind === "text") return `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#4d4a47;">${esc(b.text)}</p>`;
      if (b.kind === "quote")
        return `<div style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #d8d5d1;background:#f8f8f7;border-radius:6px;font-size:15px;line-height:1.55;color:#140700;white-space:pre-wrap;">${esc(b.text)}</div>`;
      if (b.kind === "facts")
        return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-size:14px;">${b.rows
          .map(([k, v]) => `<tr><td style="padding:3px 16px 3px 0;color:#85817d;">${esc(k)}</td><td style="padding:3px 0;color:#140700;">${esc(v)}</td></tr>`)
          .join("")}</table>`;
      return `<p style="margin:16px 0 8px;font-size:13px;font-weight:600;color:#140700;">${esc(b.title)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;border:1px solid #e4e2df;border-radius:10px;">${b.items
          .map(
            (i, n) =>
              `<tr><td style="padding:10px 14px;${n ? "border-top:1px solid #e4e2df;" : ""}font-size:14px;"><a href="${esc(i.href)}" style="color:#140700;text-decoration:none;">${esc(i.label)}</a>${
                i.meta ? `<br><span style="font-size:12px;color:${i.late ? "#b42318" : "#85817d"};">${esc(i.meta)}</span>` : ""
              }</td></tr>`,
          )
          .join("")}</table>`;
    })
    .join("\n");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:#f8f8f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#140700;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f7;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e2df;border-radius:16px;">
<tr><td style="padding:28px 32px 4px;"><div style="font-size:12px;color:#85817d;">Kavas</div><div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.1;">Workspace</div></td></tr>
<tr><td style="padding:16px 32px 8px;">
<h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:23px;line-height:1.3;">${esc(opts.heading)}</h1>
${body}
${opts.button ? `<a href="${esc(opts.button.href)}" style="display:inline-block;margin-top:8px;background:#140700;color:#f8f8f7;text-decoration:none;border-radius:999px;padding:11px 20px;font-size:14px;">${esc(opts.button.label)}</a>` : ""}
</td></tr>
<tr><td style="padding:24px 32px 28px;"><p style="margin:0;font-size:12px;line-height:1.5;color:#85817d;border-top:1px solid #e4e2df;padding-top:14px;">${esc(opts.footer)}</p></td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:#85817d;">Kavas Consultancy · work.kavasconsultancy.com</p>
</td></tr></table></body></html>`;

  const text = [
    opts.heading,
    "",
    ...opts.blocks.flatMap((b) => {
      if (b.kind === "text") return [b.text, ""];
      if (b.kind === "quote") return [b.text.split("\n").map((l) => `> ${l}`).join("\n"), ""];
      if (b.kind === "facts") return [...b.rows.map(([k, v]) => `${k}: ${v}`), ""];
      return [b.title, ...b.items.map((i) => `- ${i.label}${i.meta ? ` (${i.meta})` : ""}: ${i.href}`), ""];
    }),
    ...(opts.button ? [`${opts.button.label}: ${opts.button.href}`, ""] : []),
    "—",
    opts.footer,
  ].join("\n");

  return { html, text };
}

export const PREFS_FOOTER = "You get these because you’re on Kavas Workspace. Turn them off under My account.";
