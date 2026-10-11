"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import type { Profile } from "@/lib/workspace/types";
import { WorkspaceProvider } from "./WorkspaceContext";

// Subdomain-relative: the proxy maps work.<host>/tasks → /workspace/tasks.
const NAV = [
  { href: "/tasks", label: "Tasks", partnerOnly: false },
  { href: "/documents", label: "Documents", partnerOnly: true },
  { href: "/accounts", label: "Accounts", partnerOnly: true },
  { href: "/team", label: "Team", partnerOnly: true },
];

export default function Shell({ me, people, children }: { me: Profile; people: Profile[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => !n.partnerOnly || me.role === "partner");

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    // A full load, not a client navigation, so no signed-in data stays in the
    // router cache for the back button.
    window.location.replace("/login");
  }

  return (
    <WorkspaceProvider me={me} everyone={people}>
      <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
        <aside className="border-b md:border-b-0 md:border-r border-line bg-card md:min-h-screen md:sticky md:top-0 md:h-screen flex md:flex-col">
          <div className="flex items-center justify-between w-full md:block px-4 py-4 md:py-6">
            <Link href="/tasks" className="block">
              <span className="text-mute text-xs block">Kavas</span>
              <span className="font-serif text-2xl leading-none">Workspace</span>
            </Link>
            <button className="md:hidden ws-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              Menu
            </button>
          </div>
          <nav
            className={`${open ? "flex" : "hidden"} md:flex flex-col gap-1 px-3 md:flex-1 absolute md:static top-[64px] inset-x-0 bg-card border-b md:border-0 border-line pb-3 z-40`}
          >
            {items.map((n) => {
              const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 text-[15px] ${active ? "bg-ink text-paper" : "hover:bg-cream"}`}
                >
                  {n.label}
                </Link>
              );
            })}
            <div className="mt-auto pt-4 md:pb-4 px-3 text-sm">
              <div className="truncate">{me.full_name || me.email}</div>
              <div className="text-mute text-xs mb-2 capitalize">{me.role}</div>
              <div className="flex gap-3">
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className={`underline underline-offset-2 ${pathname === "/account" ? "text-ink" : "text-mute hover:text-ink"}`}
                >
                  My account
                </Link>
                <button onClick={signOut} className="text-mute hover:text-ink underline underline-offset-2">
                  Sign out
                </button>
              </div>
            </div>
          </nav>
        </aside>
        <main className="min-w-0 px-4 md:px-8 py-6">{children}</main>
      </div>
    </WorkspaceProvider>
  );
}
