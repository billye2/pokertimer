import type { Chipset } from "./types";

export interface StackLine {
  value: number;
  color: string;
  label: string;
  perPlayer: number;
}

export interface StackBreakdown {
  lines: StackLine[];
  stackValue: number; // actual per-player value achieved
  exact: boolean;
  feasible: boolean; // enough physical chips for this player count
}

/**
 * Suggest a per-player starting-stack breakdown from a physical chip set.
 * Heuristic: plenty of the two smallest useful denominations for early play,
 * bulk value in big chips, capped by physical availability.
 */
export function stackBreakdown(
  chipset: Chipset,
  startingStack: number,
  players: number
): StackBreakdown {
  const denoms = [...chipset.chips]
    .filter((c) => c.count > 0 && c.value > 0)
    .sort((a, b) => a.value - b.value);
  if (denoms.length === 0 || players <= 0) {
    return { lines: [], stackValue: 0, exact: false, feasible: false };
  }

  const avail = denoms.map((d) => Math.floor(d.count / players));
  const counts = denoms.map(() => 0);

  // Seed small-chip depth: ~8 of the smallest, ~6 of the second smallest,
  // without exceeding what fits in the stack or the rack.
  const seedTargets = [8, 6];
  for (let i = 0; i < Math.min(2, denoms.length); i++) {
    const maxByValue = Math.floor(
      (startingStack * 0.3) / Math.max(1, denoms[i].value * (2 - i))
    );
    counts[i] = Math.min(seedTargets[i], avail[i], maxByValue);
  }

  // Fill the remainder from the largest denomination down.
  let remaining =
    startingStack - counts.reduce((a, c, i) => a + c * denoms[i].value, 0);
  for (let i = denoms.length - 1; i >= 0 && remaining > 0; i--) {
    const take = Math.min(Math.floor(remaining / denoms[i].value), avail[i] - counts[i]);
    if (take > 0) {
      counts[i] += take;
      remaining -= take * denoms[i].value;
    }
  }
  // Top up with small chips if a gap remains.
  for (let i = 0; i < denoms.length && remaining > 0; i++) {
    const take = Math.min(
      Math.ceil(remaining / denoms[i].value),
      avail[i] - counts[i]
    );
    if (take > 0) {
      counts[i] += take;
      remaining -= take * denoms[i].value;
    }
  }

  const stackValue = counts.reduce((a, c, i) => a + c * denoms[i].value, 0);
  return {
    lines: denoms
      .map((d, i) => ({
        value: d.value,
        color: d.color,
        label: d.label,
        perPlayer: counts[i],
      }))
      .filter((l) => l.perPlayer > 0),
    stackValue,
    exact: stackValue === startingStack,
    feasible: stackValue >= startingStack * 0.99 && stackValue > 0,
  };
}

/** Max players this chipset can seat at a given starting stack. */
export function maxPlayers(chipset: Chipset, startingStack: number): number {
  let best = 0;
  for (let n = 1; n <= 200; n++) {
    if (stackBreakdown(chipset, startingStack, n).exact) best = n;
    else if (n > best + 3) break; // allow small gaps, then give up
  }
  return best;
}
