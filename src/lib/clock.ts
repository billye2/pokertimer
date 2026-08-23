import type { ClockState } from "./events";
import type { LevelPeriod, Period } from "./types";

export interface ClockPosition {
  periodIdx: number;
  period: Period;
  /** 1-based level number among level periods; null while on a break. */
  levelNumber: number | null;
  remainingMs: number;
  paused: boolean;
  /** Past the end of the structure — clock pins to the last period at 0:00. */
  overtime: boolean;
  /** Next level period after the current position (for "next blinds"). */
  nextLevel: LevelPeriod | null;
  /** Next break ahead of the current position, with active ms until it starts. */
  nextBreak: { periodIdx: number; inMs: number; chipRaceBelow?: number } | null;
}

export function periodDurationMs(p: Period): number {
  return p.durationMin * 60_000;
}

export function levelNumberAt(periods: Period[], periodIdx: number): number | null {
  if (periods[periodIdx]?.type !== "level") return null;
  let n = 0;
  for (let i = 0; i <= periodIdx; i++) {
    if (periods[i].type === "level") n++;
  }
  return n;
}

/**
 * Derive the clock position from wall-clock time. Never accumulates ticks —
 * backgrounded tabs, device sleep, and reloads all resync from timestamps.
 */
export function deriveClock(
  clock: ClockState,
  periods: Period[],
  now: number
): ClockPosition | null {
  if (!clock.started || periods.length === 0) return null;

  const effectiveNow = clock.pausedAt ?? now;
  let remainingElapsed = Math.max(
    0,
    effectiveNow - clock.baseAt - clock.pauseAccum
  );

  let idx = Math.min(clock.basePeriodIdx, periods.length - 1);
  let overtime = false;
  let remainingMs = 0;

  for (;;) {
    const dur = periodDurationMs(periods[idx]);
    if (remainingElapsed < dur) {
      remainingMs = dur - remainingElapsed;
      break;
    }
    if (idx === periods.length - 1) {
      overtime = true;
      remainingMs = 0;
      break;
    }
    remainingElapsed -= dur;
    idx++;
  }

  let nextLevel: LevelPeriod | null = null;
  for (let i = idx + 1; i < periods.length; i++) {
    const p = periods[i];
    if (p.type === "level") {
      nextLevel = p;
      break;
    }
  }

  let nextBreak: ClockPosition["nextBreak"] = null;
  if (periods[idx].type === "level") {
    let inMs = remainingMs;
    for (let i = idx + 1; i < periods.length; i++) {
      const p = periods[i];
      if (p.type === "break") {
        nextBreak = { periodIdx: i, inMs, chipRaceBelow: p.chipRaceBelow };
        break;
      }
      inMs += periodDurationMs(p);
    }
  }

  return {
    periodIdx: idx,
    period: periods[idx],
    levelNumber: levelNumberAt(periods, idx),
    remainingMs,
    paused: clock.pausedAt !== null,
    overtime,
    nextLevel,
    nextBreak,
  };
}
