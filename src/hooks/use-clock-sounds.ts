"use client";

import { useEffect, useRef } from "react";
import type { ClockPosition } from "@/lib/clock";
import { playBreak, playLevelUp, playOneMinute } from "@/lib/sounds";

/** Fires level/break/one-minute sounds on derived clock transitions. */
export function useClockSounds(pos: ClockPosition | null, enabled = true): void {
  const prev = useRef<{ periodIdx: number; remainingMs: number } | null>(null);
  useEffect(() => {
    if (!pos) {
      prev.current = null;
      return;
    }
    const p = prev.current;
    if (p && enabled && !pos.paused) {
      if (pos.periodIdx !== p.periodIdx) {
        if (pos.period.type === "break") playBreak();
        else playLevelUp();
      } else if (p.remainingMs > 60_000 && pos.remainingMs <= 60_000) {
        playOneMinute();
      }
    }
    prev.current = { periodIdx: pos.periodIdx, remainingMs: pos.remainingMs };
  }, [pos, enabled]);
}
