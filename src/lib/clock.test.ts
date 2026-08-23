import { describe, expect, it } from "vitest";
import { deriveClock } from "./clock";
import type { ClockState } from "./events";
import type { Period } from "./types";

const MIN = 60_000;

const periods: Period[] = [
  { type: "level", sb: 25, bb: 50, ante: 0, durationMin: 20 },
  { type: "level", sb: 50, bb: 100, ante: 0, durationMin: 20 },
  { type: "break", durationMin: 10, chipRaceBelow: 25 },
  { type: "level", sb: 100, bb: 200, ante: 200, durationMin: 20 },
];

const running = (baseAt: number, overrides: Partial<ClockState> = {}): ClockState => ({
  started: true,
  basePeriodIdx: 0,
  baseAt,
  pauseAccum: 0,
  pausedAt: null,
  ...overrides,
});

describe("deriveClock", () => {
  it("returns null before start", () => {
    expect(
      deriveClock(
        { started: false, basePeriodIdx: 0, baseAt: 0, pauseAccum: 0, pausedAt: null },
        periods,
        1000
      )
    ).toBeNull();
  });

  it("positions inside the first level", () => {
    const pos = deriveClock(running(0), periods, 5 * MIN)!;
    expect(pos.periodIdx).toBe(0);
    expect(pos.levelNumber).toBe(1);
    expect(pos.remainingMs).toBe(15 * MIN);
    expect(pos.nextLevel).toMatchObject({ sb: 50, bb: 100 });
    expect(pos.nextBreak).toMatchObject({ periodIdx: 2, inMs: 35 * MIN });
  });

  it("advances across periods purely from elapsed time", () => {
    const pos = deriveClock(running(0), periods, 45 * MIN)!;
    expect(pos.periodIdx).toBe(2);
    expect(pos.period.type).toBe("break");
    expect(pos.levelNumber).toBeNull();
    expect(pos.remainingMs).toBe(5 * MIN);
    expect(pos.nextLevel).toMatchObject({ sb: 100, bb: 200 });
    expect(pos.nextBreak).toBeNull();
  });

  it("accounts for accumulated pauses", () => {
    // 25 min wall time, 10 min of it paused → 15 min active.
    const pos = deriveClock(running(0, { pauseAccum: 10 * MIN }), periods, 25 * MIN)!;
    expect(pos.periodIdx).toBe(0);
    expect(pos.remainingMs).toBe(5 * MIN);
  });

  it("freezes at pausedAt while paused", () => {
    const pos = deriveClock(running(0, { pausedAt: 7 * MIN }), periods, 999 * MIN)!;
    expect(pos.paused).toBe(true);
    expect(pos.periodIdx).toBe(0);
    expect(pos.remainingMs).toBe(13 * MIN);
  });

  it("rebases from a manual level jump", () => {
    const pos = deriveClock(
      running(100 * MIN, { basePeriodIdx: 3, baseAt: 100 * MIN }),
      periods,
      103 * MIN
    )!;
    expect(pos.periodIdx).toBe(3);
    expect(pos.levelNumber).toBe(3);
    expect(pos.remainingMs).toBe(17 * MIN);
  });

  it("pins to the last period in overtime", () => {
    const pos = deriveClock(running(0), periods, 500 * MIN)!;
    expect(pos.periodIdx).toBe(3);
    expect(pos.overtime).toBe(true);
    expect(pos.remainingMs).toBe(0);
  });

  it("clamps negative elapsed (rewind past level start) to the period start", () => {
    // baseAt in the future after a big negative adjust.
    const pos = deriveClock(running(10 * MIN), periods, 5 * MIN)!;
    expect(pos.periodIdx).toBe(0);
    expect(pos.remainingMs).toBe(20 * MIN);
  });
});
