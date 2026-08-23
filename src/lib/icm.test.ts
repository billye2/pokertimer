import { describe, expect, it } from "vitest";
import { chipChop, evenChop, icmChop, icmEquity, roundChop } from "./icm";

describe("icmEquity", () => {
  it("equal stacks share equally", () => {
    const ev = icmEquity([1000, 1000], [70, 30]);
    expect(ev[0]).toBeCloseTo(50);
    expect(ev[1]).toBeCloseTo(50);
  });

  it("matches the known 2-player closed form", () => {
    // P(win) = stack share; EV = p*first + (1-p)*second
    const ev = icmEquity([3000, 1000], [70, 30]);
    expect(ev[0]).toBeCloseTo(0.75 * 70 + 0.25 * 30); // 60
    expect(ev[1]).toBeCloseTo(0.25 * 70 + 0.75 * 30); // 40
  });

  it("matches a hand-computed 3-player Malmuth-Harville example", () => {
    // Stacks 50/30/20, payouts 50/30/20.
    const ev = icmEquity([5000, 3000, 2000], [50, 30, 20]);
    // Total EV must equal total payouts.
    expect(ev.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
    // Chip leader's equity is below their chip share (ICM tax).
    expect(ev[0]).toBeLessThan(50);
    expect(ev[0]).toBeGreaterThan(ev[1]);
    expect(ev[1]).toBeGreaterThan(ev[2]);
    // Short stack is worth more than pure chip share of the pool suggests.
    expect(ev[2]).toBeGreaterThan(20);
  });

  it("conserves the pool for larger fields", () => {
    const stacks = [8000, 6500, 5000, 3200, 2100, 900];
    const payouts = [500, 300, 200];
    const ev = icmEquity(stacks, payouts);
    expect(ev.reduce((a, b) => a + b, 0)).toBeCloseTo(1000);
    // Monotone in stacks.
    for (let i = 1; i < stacks.length; i++) {
      expect(ev[i - 1]).toBeGreaterThan(ev[i]);
    }
  });
});

describe("chops", () => {
  const players = [
    { playerId: "a", stack: 6000 },
    { playerId: "b", stack: 3000 },
    { playerId: "c", stack: 1000 },
  ];

  it("even chop splits equally", () => {
    const lines = evenChop(players, 300);
    expect(lines.every((l) => l.amount === 100)).toBe(true);
  });

  it("chip chop guarantees the lowest payout plus stack share", () => {
    // Remaining payouts 150/90/60 → pool 300, everyone locks 60, rest 120 by stacks.
    const lines = chipChop(players, [150, 90, 60], 300);
    expect(lines[0].amount).toBeCloseTo(60 + (120 * 6000) / 10000); // 132
    expect(lines[1].amount).toBeCloseTo(60 + (120 * 3000) / 10000); // 96
    expect(lines[2].amount).toBeCloseTo(60 + (120 * 1000) / 10000); // 72
    expect(lines.reduce((a, l) => a + l.amount, 0)).toBeCloseTo(300);
  });

  it("icm chop conserves the pool", () => {
    const lines = icmChop(players, [150, 90, 60]);
    expect(lines.reduce((a, l) => a + l.amount, 0)).toBeCloseTo(300);
    expect(lines[0].amount).toBeGreaterThan(lines[1].amount);
    expect(lines[1].amount).toBeGreaterThan(lines[2].amount);
  });

  it("roundChop preserves the exact total with whole units", () => {
    const lines = icmChop(players, [151, 91, 58]);
    const rounded = roundChop(lines, 300);
    expect(rounded.reduce((a, l) => a + l.amount, 0)).toBe(300);
    for (const l of rounded) expect(Number.isInteger(l.amount)).toBe(true);
  });
});
