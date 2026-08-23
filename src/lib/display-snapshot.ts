import type { ClockState, LiveState } from "./events";
import {
  activeEntrants,
  avgStack,
  prizePool,
  totalEntries,
} from "./events";
import { computePayouts, type PayoutLine } from "./payouts";
import type { Period, TournamentConfig } from "./types";

/**
 * Everything a remote display needs. The clock is sent as timestamps, not a
 * countdown, so the remote page ticks locally between polls.
 */
export interface DisplaySnapshot {
  v: 1;
  name: string;
  currency: string;
  clock: ClockState;
  periods: Period[];
  playersLeft: number;
  entries: number;
  pool: number;
  avg: number;
  payouts: PayoutLine[];
  finished: boolean;
  updatedAt: number;
}

export function buildSnapshot(
  config: TournamentConfig,
  state: LiveState
): DisplaySnapshot {
  const entries = totalEntries(state);
  const pool = prizePool(config, state);
  return {
    v: 1,
    name: config.name,
    currency: config.currency,
    clock: state.clock,
    periods: config.structure.periods,
    playersLeft: activeEntrants(state).length,
    entries,
    pool,
    avg: avgStack(config, state),
    payouts: state.payoutOverride ?? computePayouts(pool, entries, config.payouts),
    finished: state.finishedAt !== null,
    updatedAt: Date.now(),
  };
}
