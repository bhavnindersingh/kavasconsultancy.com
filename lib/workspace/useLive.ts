"use client";

import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import { supabaseBrowser } from "./supabase-browser";

type Row = Record<string, unknown>;
export type LiveChange = RealtimePostgresChangesPayload<Row> & { table: string };

/**
 * Calls `onChange` (debounced) when another session changes one of `tables`
 * and `relevant` says the change touches what's on screen.
 *
 * Subscriptions are unfiltered on purpose. Realtime can't filter DELETE
 * events, and under RLS a deleted row arrives with only its primary key — so
 * "is this ours?" is answered here, against the ids the screen already holds,
 * rather than by the server. The screen then refetches instead of patching
 * from the payload, which keeps ordering and joins in one place.
 *
 * Both callbacks are read through refs, so passing fresh closures each render
 * never resubscribes.
 */
export function useLive(
  key: string | null,
  tables: string[],
  relevant: (change: LiveChange) => boolean,
  onChange: () => void,
  delay = 250,
) {
  const relevantRef = useRef(relevant);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    relevantRef.current = relevant;
    onChangeRef.current = onChange;
  });

  const tableKey = tables.join(",");
  useEffect(() => {
    if (!key) return;
    const supabase = supabaseBrowser();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase.channel(`ws-${key}-${crypto.randomUUID()}`);
    for (const table of tableKey.split(",")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        if (!relevantRef.current({ ...(payload as RealtimePostgresChangesPayload<Row>), table })) return;
        clearTimeout(timer);
        timer = setTimeout(() => onChangeRef.current(), delay);
      });
    }
    channel.subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [key, tableKey, delay]);
}

/** The changed row's value for `field`, from whichever side the event carries. */
export function changed(change: LiveChange, field: string): unknown {
  const fresh = change.new as Row | undefined;
  const old = change.old as Row | undefined;
  return fresh && field in fresh ? fresh[field] : old?.[field];
}
