import { describe, expect, it } from "vitest";
import { computePayouts, standardPcts } from "./payouts";

describe("standardPcts", () => {
  it("every tier sums to exactly 100", () => {
    for (const n of [2, 5, 9, 14, 20, 30, 40, 60, 80, 100]) {
      const pcts = standardPcts(n);
      expect(pcts.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
    }
  });

  it("pays more places as the field grows", () => {
    expect(standardPcts(4)).toHaveLength(1);
    expect(standardPcts(8)).toHaveLength(2);
    expect(standardPcts(12)).toHaveLength(3);
    expect(standardPcts(25)).toHaveLength(5);
    expect(standardPcts(100)).toHaveLength(9);
  });
});

describe("computePayouts", () => {
  it("sums exactly to the pool after rounding", () => {
    for (const pool of [450, 1000, 1337, 2755]) {
      for (const n of [6, 9, 17, 33]) {
        const lines = computePayouts(pool, n, {
          mode: { kind: "auto" },
          roundTo: 5,
        });
        expect(lines.reduce((a, l) => a + l.amount, 0)).toBe(pool);
      }
    }
  });

  it("respects fixed percentages", () => {
    const lines = computePayouts(1000, 10, {
      mode: { kind: "pcts", pcts: [50, 30, 20] },
      roundTo: 1,
    });
    expect(lines).toEqual([
      { place: 1, amount: 500 },
      { place: 2, amount: 300 },
      { place: 3, amount: 200 },
    ]);
  });

  it("never pays more places than entrants", () => {
    const lines = computePayouts(100, 2, {
      mode: { kind: "pcts", pcts: [50, 30, 20] },
      roundTo: 1,
    });
    expect(lines).toHaveLength(2);
    expect(lines.reduce((a, l) => a + l.amount, 0)).toBe(100);
  });

  it("returns empty for an empty pool", () => {
    expect(computePayouts(0, 10, { mode: { kind: "auto" }, roundTo: 5 })).toEqual([]);
  });
});
