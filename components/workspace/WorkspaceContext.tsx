"use client";

import { createContext, useContext } from "react";
import type { Profile } from "@/lib/workspace/types";

type Ctx = { me: Profile; people: Profile[]; nameOf: (id: string | null) => string };

const WorkspaceContext = createContext<Ctx | null>(null);

/**
 * `everyone` includes deactivated people, so names resolve on old work.
 * `people` — what pickers and filters offer — is the active ones only.
 */
export function WorkspaceProvider({ me, everyone, children }: { me: Profile; everyone: Profile[]; children: React.ReactNode }) {
  const byId = new Map(everyone.map((p) => [p.id, p]));
  const people = everyone.filter((p) => p.is_active);
  const nameOf = (id: string | null) => {
    if (!id) return "—";
    const p = byId.get(id);
    return p ? p.full_name || p.email : "Former member";
  };
  return <WorkspaceContext.Provider value={{ me, people, nameOf }}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace outside WorkspaceProvider");
  return ctx;
}
