"use client";

import { useEffect, useRef } from "react";
import { buildSnapshot } from "@/lib/display-snapshot";
import { useTournamentStore } from "@/stores/tournament-store";

const HEARTBEAT_MS = 60_000;
const DEBOUNCE_MS = 1_500;

/**
 * Pushes display snapshots to the share-code endpoint whenever tournament
 * state changes (debounced), plus a heartbeat. Failures are silent — the
 * local display and console never depend on connectivity.
 */
export function useDisplayPush(): void {
  const shareCode = useTournamentStore((s) => s.shareCode);
  const config = useTournamentStore((s) => s.config);
  const state = useTournamentStore((s) => s.state);
  const eventCount = useTournamentStore((s) => s.events.length);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!shareCode || !config || !state) return;

    const push = () => {
      const snapshot = buildSnapshot(config, state);
      void fetch(`/api/display/${shareCode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(snapshot),
        keepalive: true,
      }).catch(() => {});
    };

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(push, DEBOUNCE_MS);
    const heartbeat = setInterval(push, HEARTBEAT_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      clearInterval(heartbeat);
    };
  }, [shareCode, config, state, eventCount]);
}
