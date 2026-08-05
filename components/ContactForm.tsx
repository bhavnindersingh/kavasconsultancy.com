"use client";

import { useState } from "react";
import { CONTACT } from "@/lib/content";

/**
 * TEMPLATE FORM — not wired to a backend yet.
 * Submitting opens a pre-filled mailto. To wire it up later, add an
 * app/api/contact route (the live repo uses Resend) and swap onSubmit.
 */
export default function ContactForm() {
  const [type, setType] = useState(CONTACT.projectTypes[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nProject: ${type}\n\n${message}`
    );
    window.location.href = `mailto:hello@kavasconsultancy.com?subject=${encodeURIComponent(
      `Project enquiry — ${type}`
    )}&body=${body}`;
  };

  const field =
    "w-full border-b bg-transparent py-3 text-[16px] outline-none placeholder:text-(--color-mute)";

  return (
    <form onSubmit={submit} className="max-w-[560px]">
      <div className="mb-8 flex flex-wrap gap-2">
        {CONTACT.projectTypes.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className="rounded-full px-4 py-2 text-[14px] transition-colors"
            style={
              t === type
                ? { background: "var(--color-ink)", color: "var(--color-paper)" }
                : {
                    boxShadow: "inset 0 0 0 1px var(--color-ghost)",
                    color: "var(--color-body)",
                  }
            }
          >
            {t}
          </button>
        ))}
      </div>

      <input
        className={field}
        style={{ borderColor: "var(--color-line)" }}
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className={`${field} mt-4`}
        style={{ borderColor: "var(--color-line)" }}
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <textarea
        className={`${field} mt-4 min-h-28 resize-y`}
        style={{ borderColor: "var(--color-line)" }}
        placeholder="What do you want to build — and own?"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
      />

      <button type="submit" className="pill mt-10">
        Send
      </button>
      <p className="meta mt-4">
        Template form — opens your mail client. Wire to an API route later.
      </p>
    </form>
  );
}
