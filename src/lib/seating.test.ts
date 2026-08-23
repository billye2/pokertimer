import { describe, expect, it } from "vitest";
import type { Entrant } from "./events";
import {
  balanceMoves,
  breakTableMoves,
  isUnbalanced,
  neededTables,
  randomSeatDraw,
  shouldBreakTable,
  tableCounts,
  tableToBreak,
} from "./seating";

const entrant = (
  playerId: string,
  table: number | null,
  seat: number | null
): Entrant => ({
  playerId,
  name: playerId,
  entries: 1,
  rebuys: 0,
  addons: 0,
  bounties: 0,
  status: "active",
  finishPlace: null,
  seat: table && seat ? { table, seat } : null,
  eliminatedAt: null,
});

describe("randomSeatDraw", () => {
  it("uses the minimum number of tables, spread evenly, no seat collisions", () => {
    const ids = Array.from({ length: 21 }, (_, i) => `p${i}`);
    const draw = randomSeatDraw(ids, 9);
    expect(neededTables(21, 9)).toBe(3);
    const perTable = new Map<number, Set<number>>();
    for (const a of draw) {
      expect(a.table).toBeGreaterThanOrEqual(1);
      expect(a.table).toBeLessThanOrEqual(3);
      expect(a.seat).toBeGreaterThanOrEqual(1);
      expect(a.seat).toBeLessThanOrEqual(9);
      const seats = perTable.get(a.table) ?? new Set();
      expect(seats.has(a.seat)).toBe(false);
      seats.add(a.seat);
      perTable.set(a.table, seats);
    }
    expect(draw).toHaveLength(21);
    const sizes = [...perTable.values()].map((s) => s.size);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });
});

describe("balancing", () => {
  it("flags imbalance only when spread > 1", () => {
    expect(
      isUnbalanced([
        { table: 1, count: 5 },
        { table: 2, count: 4 },
      ])
    ).toBe(false);
    expect(
      isUnbalanced([
        { table: 1, count: 6 },
        { table: 2, count: 4 },
      ])
    ).toBe(true);
  });

  it("suggests moves that end balanced without seat collisions", () => {
    const entrants = [
      ...Array.from({ length: 8 }, (_, i) => entrant(`a${i}`, 1, i + 1)),
      ...Array.from({ length: 4 }, (_, i) => entrant(`b${i}`, 2, i + 1)),
    ];
    const moves = balanceMoves(entrants, 9);
    expect(moves.length).toBe(2);
    for (const m of moves) expect(m.table).toBe(2);
    const seats = new Set([1, 2, 3, 4]);
    for (const m of moves) {
      expect(seats.has(m.seat)).toBe(false);
      seats.add(m.seat);
    }
  });
});

describe("breaking tables", () => {
  it("knows when the field fits on fewer tables", () => {
    expect(shouldBreakTable(18, 3, 9)).toBe(true);
    expect(shouldBreakTable(19, 3, 9)).toBe(false);
    expect(shouldBreakTable(9, 1, 9)).toBe(false);
  });

  it("breaks the highest table into open seats elsewhere", () => {
    const entrants = [
      ...Array.from({ length: 7 }, (_, i) => entrant(`a${i}`, 1, i + 1)),
      ...Array.from({ length: 7 }, (_, i) => entrant(`b${i}`, 2, i + 1)),
      ...Array.from({ length: 4 }, (_, i) => entrant(`c${i}`, 3, i + 1)),
    ];
    const counts = tableCounts(entrants);
    expect(tableToBreak(counts)).toBe(3);
    const moves = breakTableMoves(entrants, 3, 9);
    expect(moves).toHaveLength(4);
    // All movers land on tables 1-2 in previously open seats.
    for (const m of moves) {
      expect([1, 2]).toContain(m.table);
    }
    // Result: 9/9 across two tables.
    const after = new Map<number, number>([
      [1, 7],
      [2, 7],
    ]);
    for (const m of moves) after.set(m.table, (after.get(m.table) ?? 0) + 1);
    expect([...after.values()].sort().join(",")).toBe("9,9");
  });
});
