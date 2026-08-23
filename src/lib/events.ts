import type { TournamentConfig } from "./types";

export interface Seat {
  table: number; // 1-based table number
  seat: number; // 1-based seat number
}

export interface SeatAssignment extends Seat {
  playerId: string;
}

export type EventBody =
  | { type: "clock/start" }
  | { type: "clock/pause" }
  | { type: "clock/resume" }
  | { type: "clock/set-period"; periodIdx: number }
  | { type: "clock/adjust"; deltaMs: number } // + skips forward, - rewinds
  | { type: "entrant/buy-in"; playerId: string; name: string }
  | { type: "entrant/re-entry"; playerId: string }
  | { type: "entrant/rebuy"; playerId: string }
  | { type: "entrant/addon"; playerId: string }
  | { type: "entrant/eliminate"; playerId: string; byPlayerId: string | null }
  | { type: "entrant/remove"; playerId: string }
  | { type: "entrant/rename"; playerId: string; name: string }
  | { type: "seat/assign"; playerId: string; seat: Seat | null }
  | { type: "seat/draw"; assignments: SeatAssignment[] }
  | { type: "table/break"; table: number; moves: SeatAssignment[] }
  | { type: "payouts/override"; payouts: { place: number; amount: number }[] }
  | { type: "payouts/clear-override" }
  | {
      type: "deal/set";
      method: "even" | "chip-chip" | "icm" | "custom";
      payouts: { playerId: string; amount: number }[];
    }
  | { type: "deal/clear" }
  | { type: "tournament/finish" };

export type TournamentEvent = EventBody & { seq: number; at: number };

export type EntrantStatus = "active" | "eliminated";

export interface Entrant {
  playerId: string;
  name: string;
  entries: number; // initial buy-in + re-entries
  rebuys: number;
  addons: number;
  bounties: number; // knockouts collected
  status: EntrantStatus;
  finishPlace: number | null;
  seat: Seat | null;
  eliminatedAt: number | null;
}

export interface ClockState {
  started: boolean;
  basePeriodIdx: number;
  baseAt: number; // wall time when the base period started
  pauseAccum: number; // paused ms accumulated since base
  pausedAt: number | null;
}

export interface LiveState {
  clock: ClockState;
  entrants: Record<string, Entrant>;
  entrantOrder: string[]; // registration order
  payoutOverride: { place: number; amount: number }[] | null;
  deal: {
    method: "even" | "chip-chip" | "icm" | "custom";
    payouts: { playerId: string; amount: number }[];
  } | null;
  finishedAt: number | null;
}

export function initialState(): LiveState {
  return {
    clock: {
      started: false,
      basePeriodIdx: 0,
      baseAt: 0,
      pauseAccum: 0,
      pausedAt: null,
    },
    entrants: {},
    entrantOrder: [],
    payoutOverride: null,
    deal: null,
    finishedAt: null,
  };
}

export function applyEvent(state: LiveState, evt: TournamentEvent): LiveState {
  const s: LiveState = {
    ...state,
    clock: { ...state.clock },
    entrants: { ...state.entrants },
    entrantOrder: [...state.entrantOrder],
  };
  const entrant = (id: string): Entrant | undefined =>
    s.entrants[id] ? (s.entrants[id] = { ...s.entrants[id] }) : undefined;

  switch (evt.type) {
    case "clock/start": {
      s.clock = {
        started: true,
        basePeriodIdx: 0,
        baseAt: evt.at,
        pauseAccum: 0,
        pausedAt: null,
      };
      break;
    }
    case "clock/pause": {
      if (s.clock.started && s.clock.pausedAt === null) s.clock.pausedAt = evt.at;
      break;
    }
    case "clock/resume": {
      if (s.clock.pausedAt !== null) {
        s.clock.pauseAccum += evt.at - s.clock.pausedAt;
        s.clock.pausedAt = null;
      }
      break;
    }
    case "clock/set-period": {
      if (!s.clock.started) break;
      s.clock.basePeriodIdx = evt.periodIdx;
      s.clock.baseAt = evt.at;
      s.clock.pauseAccum = 0;
      if (s.clock.pausedAt !== null) s.clock.pausedAt = evt.at;
      break;
    }
    case "clock/adjust": {
      if (!s.clock.started) break;
      s.clock.baseAt -= evt.deltaMs;
      break;
    }
    case "entrant/buy-in": {
      if (s.entrants[evt.playerId]) break;
      s.entrants[evt.playerId] = {
        playerId: evt.playerId,
        name: evt.name,
        entries: 1,
        rebuys: 0,
        addons: 0,
        bounties: 0,
        status: "active",
        finishPlace: null,
        seat: null,
        eliminatedAt: null,
      };
      s.entrantOrder.push(evt.playerId);
      break;
    }
    case "entrant/re-entry": {
      const e = entrant(evt.playerId);
      if (!e || e.status !== "eliminated") break;
      e.entries += 1;
      e.status = "active";
      e.finishPlace = null;
      e.eliminatedAt = null;
      break;
    }
    case "entrant/rebuy": {
      const e = entrant(evt.playerId);
      if (!e || e.status !== "active") break;
      e.rebuys += 1;
      break;
    }
    case "entrant/addon": {
      const e = entrant(evt.playerId);
      if (!e || e.status !== "active") break;
      e.addons += 1;
      break;
    }
    case "entrant/eliminate": {
      const e = entrant(evt.playerId);
      if (!e || e.status !== "active") break;
      const activeBefore = Object.values(s.entrants).filter(
        (x) => x.status === "active"
      ).length;
      e.status = "eliminated";
      e.finishPlace = activeBefore;
      e.eliminatedAt = evt.at;
      e.seat = null;
      if (evt.byPlayerId) {
        const by = entrant(evt.byPlayerId);
        if (by) by.bounties += 1;
      }
      break;
    }
    case "entrant/remove": {
      if (!s.entrants[evt.playerId]) break;
      delete s.entrants[evt.playerId];
      s.entrantOrder = s.entrantOrder.filter((id) => id !== evt.playerId);
      break;
    }
    case "entrant/rename": {
      const e = entrant(evt.playerId);
      if (e) e.name = evt.name;
      break;
    }
    case "seat/assign": {
      const e = entrant(evt.playerId);
      if (e) e.seat = evt.seat;
      break;
    }
    case "seat/draw": {
      for (const a of evt.assignments) {
        const e = entrant(a.playerId);
        if (e) e.seat = { table: a.table, seat: a.seat };
      }
      break;
    }
    case "table/break": {
      for (const id of Object.keys(s.entrants)) {
        const e = s.entrants[id];
        if (e.seat?.table === evt.table) {
          s.entrants[id] = { ...e, seat: null };
        }
      }
      for (const m of evt.moves) {
        const e = entrant(m.playerId);
        if (e) e.seat = { table: m.table, seat: m.seat };
      }
      break;
    }
    case "payouts/override": {
      s.payoutOverride = evt.payouts;
      break;
    }
    case "payouts/clear-override": {
      s.payoutOverride = null;
      break;
    }
    case "deal/set": {
      s.deal = { method: evt.method, payouts: evt.payouts };
      break;
    }
    case "deal/clear": {
      s.deal = null;
      break;
    }
    case "tournament/finish": {
      s.finishedAt = evt.at;
      // The last active entrant takes 1st place.
      for (const id of Object.keys(s.entrants)) {
        const e = s.entrants[id];
        if (e.status === "active" && e.finishPlace === null) {
          s.entrants[id] = { ...e, finishPlace: 1 };
        }
      }
      break;
    }
  }
  return s;
}

export function foldEvents(events: TournamentEvent[]): LiveState {
  let s = initialState();
  for (const e of events) s = applyEvent(s, e);
  return s;
}

// ---------- Derived selectors ----------

export function activeEntrants(state: LiveState): Entrant[] {
  return Object.values(state.entrants).filter((e) => e.status === "active");
}

export function totalEntries(state: LiveState): number {
  return Object.values(state.entrants).reduce((n, e) => n + e.entries, 0);
}

export function totalRebuys(state: LiveState): number {
  return Object.values(state.entrants).reduce((n, e) => n + e.rebuys, 0);
}

export function totalAddons(state: LiveState): number {
  return Object.values(state.entrants).reduce((n, e) => n + e.addons, 0);
}

/** Main prize pool — excludes bounty money, which pays out per knockout. */
export function prizePool(config: TournamentConfig, state: LiveState): number {
  return (
    config.buyIn * totalEntries(state) +
    (config.rebuy?.amount ?? 0) * totalRebuys(state) +
    (config.addon?.amount ?? 0) * totalAddons(state)
  );
}

/** Total bounty money collected (amount × entries). */
export function bountyPool(config: TournamentConfig, state: LiveState): number {
  return (config.bounty?.amount ?? 0) * totalEntries(state);
}

/** Total tournament chips in play. */
export function chipsInPlay(config: TournamentConfig, state: LiveState): number {
  return (
    config.startingStack * totalEntries(state) +
    (config.rebuy?.stack ?? 0) * totalRebuys(state) +
    (config.addon?.stack ?? 0) * totalAddons(state)
  );
}

export function avgStack(config: TournamentConfig, state: LiveState): number {
  const active = activeEntrants(state).length;
  if (active === 0) return 0;
  return Math.round(chipsInPlay(config, state) / active);
}

/** What a player has paid in total (buy-ins, rebuys, add-ons, bounties). */
export function entrantCost(config: TournamentConfig, e: Entrant): number {
  const perEntry = config.buyIn + (config.bounty?.amount ?? 0);
  return (
    perEntry * e.entries +
    (config.rebuy?.amount ?? 0) * e.rebuys +
    (config.addon?.amount ?? 0) * e.addons
  );
}
