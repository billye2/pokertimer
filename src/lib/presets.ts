import { db } from "./db";
import type { BreakPeriod, LevelPeriod, Period, Structure } from "./types";

const lvl = (
  sb: number,
  bb: number,
  ante: number,
  durationMin: number
): LevelPeriod => ({ type: "level", sb, bb, ante, durationMin });

const brk = (durationMin: number, chipRaceBelow?: number): BreakPeriod => ({
  type: "break",
  durationMin,
  ...(chipRaceBelow ? { chipRaceBelow } : {}),
});

function standardPeriods(durationMin: number): Period[] {
  return [
    lvl(25, 50, 0, durationMin),
    lvl(50, 100, 0, durationMin),
    lvl(75, 150, 0, durationMin),
    lvl(100, 200, 0, durationMin),
    brk(10),
    lvl(150, 300, 300, durationMin),
    lvl(200, 400, 400, durationMin),
    lvl(300, 600, 600, durationMin),
    lvl(400, 800, 800, durationMin),
    brk(10, 100),
    lvl(500, 1000, 1000, durationMin),
    lvl(600, 1200, 1200, durationMin),
    lvl(800, 1600, 1600, durationMin),
    lvl(1000, 2000, 2000, durationMin),
    brk(10, 500),
    lvl(1500, 3000, 3000, durationMin),
    lvl(2000, 4000, 4000, durationMin),
    lvl(3000, 6000, 6000, durationMin),
    lvl(4000, 8000, 8000, durationMin),
    brk(10),
    lvl(5000, 10000, 10000, durationMin),
    lvl(6000, 12000, 12000, durationMin),
    lvl(8000, 16000, 16000, durationMin),
    lvl(10000, 20000, 20000, durationMin),
  ];
}

function turboPeriods(): Period[] {
  const d = 15;
  return [
    lvl(25, 50, 0, d),
    lvl(50, 100, 0, d),
    lvl(100, 200, 0, d),
    lvl(150, 300, 300, d),
    lvl(200, 400, 400, d),
    brk(10),
    lvl(300, 600, 600, d),
    lvl(400, 800, 800, d),
    lvl(600, 1200, 1200, d),
    lvl(800, 1600, 1600, d),
    lvl(1000, 2000, 2000, d),
    brk(10, 100),
    lvl(1500, 3000, 3000, d),
    lvl(2000, 4000, 4000, d),
    lvl(3000, 6000, 6000, d),
    lvl(4000, 8000, 8000, d),
    lvl(6000, 12000, 12000, d),
    lvl(8000, 16000, 16000, d),
    lvl(10000, 20000, 20000, d),
  ];
}

const PRESETS: Omit<Structure, "createdAt" | "updatedAt">[] = [
  {
    id: "preset-turbo-15",
    name: "Turbo · 15 min levels",
    preset: true,
    periods: turboPeriods(),
  },
  {
    id: "preset-standard-20",
    name: "Standard · 20 min levels",
    preset: true,
    periods: standardPeriods(20),
  },
  {
    id: "preset-deepstack-30",
    name: "Deepstack · 30 min levels",
    preset: true,
    periods: standardPeriods(30),
  },
];

/** Seed (or refresh) the read-only preset structures. Idempotent. */
export async function ensurePresets(): Promise<void> {
  const now = Date.now();
  await db.structures.bulkPut(
    PRESETS.map((p) => ({ ...p, createdAt: now, updatedAt: now }))
  );
}
