import { describe, expect, it } from "vitest";
import { maxPlayers, stackBreakdown } from "./chips";
import type { Chipset } from "./types";

const standard500: Chipset = {
  id: "c1",
  name: "500pc standard",
  chips: [
    { value: 25, color: "#2e7d32", label: "25", count: 150 },
    { value: 100, color: "#111", label: "100", count: 150 },
    { value: 500, color: "#7b1fa2", label: "500", count: 100 },
    { value: 1000, color: "#f9a825", label: "1K", count: 100 },
  ],
  createdAt: 0,
  updatedAt: 0,
};

describe("stackBreakdown", () => {
  it("hits the exact stack with sensible small-chip depth", () => {
    const b = stackBreakdown(standard500, 10000, 9);
    expect(b.exact).toBe(true);
    expect(b.stackValue).toBe(10000);
    const smallest = b.lines.find((l) => l.value === 25);
    expect(smallest && smallest.perPlayer).toBeGreaterThanOrEqual(4);
    // Never allocates more chips than physically exist per player.
    for (const l of b.lines) {
      const denom = standard500.chips.find((c) => c.value === l.value)!;
      expect(l.perPlayer * 9).toBeLessThanOrEqual(denom.count);
    }
  });

  it("flags infeasible player counts", () => {
    const b = stackBreakdown(standard500, 10000, 60);
    expect(b.exact).toBe(false);
  });

  it("handles an empty chipset", () => {
    const empty: Chipset = { ...standard500, chips: [] };
    expect(stackBreakdown(empty, 10000, 9).feasible).toBe(false);
  });
});

describe("maxPlayers", () => {
  it("finds a plausible ceiling", () => {
    const n = maxPlayers(standard500, 10000);
    expect(n).toBeGreaterThanOrEqual(9);
    expect(n).toBeLessThan(60);
  });
});
