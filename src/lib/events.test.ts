import { describe, expect, it } from "vitest";
import {
  activeEntrants,
  avgStack,
  chipsInPlay,
  entrantCost,
  foldEvents,
  prizePool,
  type EventBody,
  type TournamentEvent,
} from "./events";
import type { TournamentConfig } from "./types";

const config: TournamentConfig = {
  id: "t1",
  name: "Test",
  createdAt: 0,
  currency: "$",
  buyIn: 50,
  startingStack: 10000,
  tableSize: 9,
  rebuy: { amount: 50, stack: 10000, maxPerPlayer: null, lastPeriodIdx: 3, reentry: true },
  addon: { amount: 25, stack: 15000 },
  bounty: { amount: 10 },
  payouts: { mode: { kind: "auto" }, roundTo: 5 },
  structure: {
    id: "s1",
    name: "S",
    periods: [{ type: "level", sb: 25, bb: 50, ante: 0, durationMin: 20 }],
    createdAt: 0,
    updatedAt: 0,
  },
};

let seq = 0;
const ev = (body: EventBody, at = 1000): TournamentEvent => ({
  ...body,
  seq: ++seq,
  at,
});

const buyIn = (id: string): EventBody => ({
  type: "entrant/buy-in",
  playerId: id,
  name: id.toUpperCase(),
});

describe("event fold", () => {
  it("tracks entries, rebuys, addons and money", () => {
    const state = foldEvents([
      ev(buyIn("a")),
      ev(buyIn("b")),
      ev(buyIn("c")),
      ev({ type: "entrant/rebuy", playerId: "a" }),
      ev({ type: "entrant/addon", playerId: "b" }),
    ]);
    expect(activeEntrants(state)).toHaveLength(3);
    // pool: 3×50 + 1×50 + 1×25 = 225 (bounties excluded)
    expect(prizePool(config, state)).toBe(225);
    expect(chipsInPlay(config, state)).toBe(3 * 10000 + 10000 + 15000);
    expect(avgStack(config, state)).toBe(Math.round(55000 / 3));
    // a paid buy-in + bounty + rebuy = 50+10+50 = 110
    expect(entrantCost(config, state.entrants["a"])).toBe(110);
  });

  it("assigns finish places counting down and credits bounties", () => {
    const state = foldEvents([
      ev(buyIn("a")),
      ev(buyIn("b")),
      ev(buyIn("c")),
      ev({ type: "entrant/eliminate", playerId: "c", byPlayerId: "a" }),
      ev({ type: "entrant/eliminate", playerId: "b", byPlayerId: "a" }),
      ev({ type: "tournament/finish" }),
    ]);
    expect(state.entrants["c"].finishPlace).toBe(3);
    expect(state.entrants["b"].finishPlace).toBe(2);
    expect(state.entrants["a"].finishPlace).toBe(1);
    expect(state.entrants["a"].bounties).toBe(2);
    expect(state.finishedAt).not.toBeNull();
  });

  it("re-entry resurrects an eliminated player and adds an entry", () => {
    const state = foldEvents([
      ev(buyIn("a")),
      ev(buyIn("b")),
      ev({ type: "entrant/eliminate", playerId: "a", byPlayerId: "b" }),
      ev({ type: "entrant/re-entry", playerId: "a" }),
    ]);
    expect(state.entrants["a"].status).toBe("active");
    expect(state.entrants["a"].entries).toBe(2);
    expect(state.entrants["a"].finishPlace).toBeNull();
    // Bounty stays with b even after a re-enters.
    expect(state.entrants["b"].bounties).toBe(1);
    // pool: 3 entries × 50
    expect(prizePool(config, state)).toBe(150);
  });

  it("clock pause/resume accumulates paused time", () => {
    const state = foldEvents([
      ev({ type: "clock/start" }, 1000),
      ev({ type: "clock/pause" }, 5000),
      ev({ type: "clock/resume" }, 9000),
    ]);
    expect(state.clock.started).toBe(true);
    expect(state.clock.pauseAccum).toBe(4000);
    expect(state.clock.pausedAt).toBeNull();
  });

  it("set-period rebases the clock", () => {
    const state = foldEvents([
      ev({ type: "clock/start" }, 1000),
      ev({ type: "clock/pause" }, 2000),
      ev({ type: "clock/set-period", periodIdx: 4 }, 3000),
    ]);
    expect(state.clock.basePeriodIdx).toBe(4);
    expect(state.clock.baseAt).toBe(3000);
    expect(state.clock.pauseAccum).toBe(0);
    expect(state.clock.pausedAt).toBe(3000); // stays paused across a jump
  });

  it("table break moves seated players and clears the table", () => {
    const state = foldEvents([
      ev(buyIn("a")),
      ev(buyIn("b")),
      ev(buyIn("c")),
      ev({
        type: "seat/draw",
        assignments: [
          { playerId: "a", table: 2, seat: 1 },
          { playerId: "b", table: 2, seat: 5 },
          { playerId: "c", table: 1, seat: 3 },
        ],
      }),
      ev({
        type: "table/break",
        table: 2,
        moves: [
          { playerId: "a", table: 1, seat: 1 },
          { playerId: "b", table: 1, seat: 6 },
        ],
      }),
    ]);
    expect(state.entrants["a"].seat).toEqual({ table: 1, seat: 1 });
    expect(state.entrants["b"].seat).toEqual({ table: 1, seat: 6 });
    expect(state.entrants["c"].seat).toEqual({ table: 1, seat: 3 });
  });

  it("remove reverses a mistaken entry entirely", () => {
    const state = foldEvents([
      ev(buyIn("a")),
      ev(buyIn("b")),
      ev({ type: "entrant/remove", playerId: "b" }),
    ]);
    expect(state.entrants["b"]).toBeUndefined();
    expect(state.entrantOrder).toEqual(["a"]);
    expect(prizePool(config, state)).toBe(50);
  });
});
