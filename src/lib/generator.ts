import type { Period, Structure } from "./types";
import { newId } from "./id";

/** Nice small-blind values to snap generated levels to. */
const LADDER = [
  25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1500,
  2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000, 25000,
  30000, 40000, 50000, 60000, 80000, 100000,
];

function snapToLadder(sb: number): number {
  for (const v of LADDER) {
    if (v >= sb) return v;
  }
  return LADDER[LADDER.length - 1];
}

export interface GeneratorInput {
  targetHours: number;
  players: number;
  startingStack: number;
  levelMinutes: number;
  breakEveryLevels: number; // 0 = no breaks
  breakMinutes: number;
  antes: boolean;
}

/**
 * Generate a blind structure. The tournament is effectively over when the big
 * blind reaches ~1/25th of total chips in play (avg stack ≈ 12 BB heads-up),
 * so levels rise geometrically from a starting BB of ~stack/100 to that point,
 * snapped to a standard ladder. A few overtime levels are appended.
 */
export function generateStructure(input: GeneratorInput): Structure {
  const {
    targetHours,
    players,
    startingStack,
    levelMinutes,
    breakEveryLevels,
    breakMinutes,
    antes,
  } = input;

  const totalChips = players * startingStack;
  const startSb = snapToLadder(Math.max(25, Math.round(startingStack / 200)));
  const finalBb = totalChips / 25;
  const finalSb = Math.max(startSb * 2, finalBb / 2);

  const playMinutes = targetHours * 60;
  const n = Math.max(4, Math.round(playMinutes / levelMinutes));
  const ratio = Math.pow(finalSb / startSb, 1 / Math.max(1, n - 1));

  // Build strictly-increasing snapped levels.
  const sbs: number[] = [];
  let raw = startSb;
  for (let i = 0; i < n; i++) {
    const snapped = snapToLadder(raw);
    if (sbs.length === 0 || snapped > sbs[sbs.length - 1]) {
      sbs.push(snapped);
    } else {
      // Ladder collision — force the next ladder step up.
      const idx = LADDER.indexOf(sbs[sbs.length - 1]);
      sbs.push(
        idx >= 0 && idx + 1 < LADDER.length
          ? LADDER[idx + 1]
          : sbs[sbs.length - 1] * 2
      );
    }
    raw *= ratio;
  }
  // Overtime levels so the clock never runs dry.
  for (let i = 0; i < 3; i++) {
    const last = sbs[sbs.length - 1];
    const idx = LADDER.indexOf(last);
    sbs.push(
      idx >= 0 && idx + 1 < LADDER.length ? LADDER[idx + 1] : last * 2
    );
  }

  const anteFromIdx = antes ? Math.floor(sbs.length / 3) : Infinity;
  const periods: Period[] = [];
  sbs.forEach((sb, i) => {
    const bb = sb * 2;
    periods.push({
      type: "level",
      sb,
      bb,
      ante: i >= anteFromIdx ? bb : 0,
      durationMin: levelMinutes,
    });
    const isLast = i === sbs.length - 1;
    if (
      breakEveryLevels > 0 &&
      !isLast &&
      (i + 1) % breakEveryLevels === 0
    ) {
      // Race off chips that the next level no longer needs.
      const nextSb = sbs[i + 1] * 1; // next level's small blind
      const race = LADDER.filter((v) => nextSb % v === 0 && v < nextSb);
      periods.push({
        type: "break",
        durationMin: breakMinutes,
        ...(race.length > 0 && race[0] < nextSb / 4
          ? { chipRaceBelow: race[race.length - 1] }
          : {}),
      });
    }
  });

  const now = Date.now();
  return {
    id: newId(),
    name: `Generated · ${targetHours}h · ${levelMinutes} min levels`,
    periods,
    createdAt: now,
    updatedAt: now,
  };
}
