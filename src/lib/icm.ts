/**
 * ICM equity via the Malmuth–Harville model. Practical for final-table deals
 * (n ≤ ~12); memoized over the subset mask of remaining players.
 */
export function icmEquity(stacks: number[], payouts: number[]): number[] {
  const n = stacks.length;
  const ev = new Array<number>(n).fill(0);
  if (n === 0) return ev;
  const memo = new Map<number, number[]>();

  const calc = (mask: number): number[] => {
    const cached = memo.get(mask);
    if (cached) return cached;
    const result = new Array<number>(n).fill(0);
    let count = 0;
    let total = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        count++;
        total += stacks[i];
      }
    }
    const place = n - count; // 0-based payout index for whoever finishes best here
    if (count === 0 || total === 0 || place >= payouts.length) {
      memo.set(mask, result);
      return result;
    }
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue;
      const p = stacks[i] / total;
      result[i] += p * payouts[place];
      if (count > 1 && place + 1 < payouts.length) {
        const sub = calc(mask & ~(1 << i));
        for (let j = 0; j < n; j++) result[j] += p * sub[j];
      }
    }
    memo.set(mask, result);
    return result;
  };

  const full = calc((1 << n) - 1);
  for (let i = 0; i < n; i++) ev[i] = full[i];
  return ev;
}

export interface ChopLine {
  playerId: string;
  amount: number;
}

interface ChopPlayer {
  playerId: string;
  stack: number;
}

/** Even chop: remaining pool split equally. */
export function evenChop(players: ChopPlayer[], pool: number): ChopLine[] {
  const each = pool / players.length;
  return players.map((p) => ({ playerId: p.playerId, amount: each }));
}

/**
 * Chip-chip: everyone locks up the lowest remaining payout; the rest of the
 * pool is split proportionally to stacks.
 */
export function chipChop(
  players: ChopPlayer[],
  remainingPayouts: number[], // payouts still to be won, best-first
  pool: number
): ChopLine[] {
  const guaranteed =
    remainingPayouts.length >= players.length
      ? remainingPayouts[players.length - 1]
      : 0;
  const totalStacks = players.reduce((a, p) => a + p.stack, 0);
  const rest = pool - guaranteed * players.length;
  return players.map((p) => ({
    playerId: p.playerId,
    amount: guaranteed + (totalStacks > 0 ? (rest * p.stack) / totalStacks : 0),
  }));
}

/** ICM chop over the remaining payouts. */
export function icmChop(
  players: ChopPlayer[],
  remainingPayouts: number[] // payouts still to be won, best-first
): ChopLine[] {
  const ev = icmEquity(
    players.map((p) => p.stack),
    remainingPayouts
  );
  return players.map((p, i) => ({ playerId: p.playerId, amount: ev[i] }));
}

/** Round chop amounts to whole currency units while preserving the total. */
export function roundChop(lines: ChopLine[], total: number): ChopLine[] {
  const rounded = lines.map((l) => ({ ...l, amount: Math.floor(l.amount) }));
  let drift = total - rounded.reduce((a, l) => a + l.amount, 0);
  // Give leftover units to the largest fractional parts first.
  const order = lines
    .map((l, i) => ({ i, frac: l.amount - Math.floor(l.amount) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (drift <= 0) break;
    rounded[i].amount += 1;
    drift -= 1;
  }
  return rounded;
}
