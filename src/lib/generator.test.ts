import { describe, expect, it } from "vitest";
import { generateStructure } from "./generator";
import type { LevelPeriod } from "./types";

describe("generateStructure", () => {
  const input = {
    targetHours: 5,
    players: 20,
    startingStack: 10000,
    levelMinutes: 20,
    breakEveryLevels: 4,
    breakMinutes: 10,
    antes: true,
  };

  it("produces strictly increasing blinds with bb = 2×sb", () => {
    const s = generateStructure(input);
    const levels = s.periods.filter((p): p is LevelPeriod => p.type === "level");
    expect(levels.length).toBeGreaterThanOrEqual(10);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i].sb).toBeGreaterThan(levels[i - 1].sb);
      expect(levels[i].bb).toBe(levels[i].sb * 2);
    }
  });

  it("reaches an endgame big blind near totalChips/25 within play time", () => {
    const s = generateStructure(input);
    const levels = s.periods.filter((p): p is LevelPeriod => p.type === "level");
    const playLevels = Math.round((input.targetHours * 60) / input.levelMinutes);
    const endBb = levels[Math.min(playLevels - 1, levels.length - 1)].bb;
    const totalChips = input.players * input.startingStack;
    // Snapping makes this approximate — within a factor of ~2.5 either way.
    expect(endBb).toBeGreaterThan(totalChips / 25 / 2.5);
    expect(endBb).toBeLessThan((totalChips / 25) * 2.5);
  });

  it("inserts breaks at the requested cadence and antes later on", () => {
    const s = generateStructure(input);
    const firstBreak = s.periods.findIndex((p) => p.type === "break");
    expect(firstBreak).toBe(4);
    const levels = s.periods.filter((p): p is LevelPeriod => p.type === "level");
    expect(levels[0].ante).toBe(0);
    expect(levels[levels.length - 1].ante).toBe(levels[levels.length - 1].bb);
  });

  it("supports no-break, no-ante configs", () => {
    const s = generateStructure({ ...input, breakEveryLevels: 0, antes: false });
    expect(s.periods.every((p) => p.type === "level")).toBe(true);
    const levels = s.periods.filter((p): p is LevelPeriod => p.type === "level");
    expect(levels.every((l) => l.ante === 0)).toBe(true);
  });
});
