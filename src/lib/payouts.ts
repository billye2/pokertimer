import type { PayoutSettings } from "./types";

/**
 * Standard payout percentages by field size (~top 10–15% paid).
 * Each row sums to exactly 100.
 */
export function standardPcts(entrants: number): number[] {
  if (entrants <= 4) return [100];
  if (entrants <= 8) return [65, 35];
  if (entrants <= 13) return [50, 30, 20];
  if (entrants <= 19) return [44, 27, 17, 12];
  if (entrants <= 29) return [40, 24, 16, 11, 9];
  if (entrants <= 39) return [37, 23, 15, 10, 8, 7];
  if (entrants <= 59) return [34, 21, 14, 10, 8, 7, 6];
  if (entrants <= 79) return [33, 20, 13, 9.5, 7.5, 6.5, 5.5, 5];
  return [31.5, 19.5, 12.5, 9, 7, 6, 5.5, 4.75, 4.25];
}

export interface PayoutLine {
  place: number; // 1-based
  amount: number;
}

/**
 * Compute concrete payouts. Amounts are rounded to `roundTo` multiples and
 * always sum exactly to the prize pool (drift lands on 1st place).
 */
export function computePayouts(
  pool: number,
  entrants: number,
  settings: PayoutSettings
): PayoutLine[] {
  if (pool <= 0 || entrants <= 0) return [];
  const pcts =
    settings.mode.kind === "pcts" ? settings.mode.pcts : standardPcts(entrants);
  // Never pay more places than entrants.
  const paid = pcts.slice(0, Math.max(1, Math.min(pcts.length, entrants)));
  const roundTo = settings.roundTo > 0 ? settings.roundTo : 1;

  const amounts = paid.map((pct) => {
    const raw = (pool * pct) / 100;
    return Math.round(raw / roundTo) * roundTo;
  });
  const drift = pool - amounts.reduce((a, b) => a + b, 0);
  amounts[0] += drift;

  return amounts.map((amount, i) => ({ place: i + 1, amount }));
}
