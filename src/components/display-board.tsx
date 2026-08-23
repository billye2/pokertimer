"use client";

import { useNow } from "@/hooks/use-now";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { deriveClock } from "@/lib/clock";
import type { ClockState } from "@/lib/events";
import { fmtBlinds, fmtChips, fmtClock, fmtMoney, ordinal } from "@/lib/format";
import type { PayoutLine } from "@/lib/payouts";
import type { Period } from "@/lib/types";

export interface DisplayBoardProps {
  name: string;
  currency: string;
  clock: ClockState;
  periods: Period[];
  playersLeft: number;
  entries: number;
  pool: number;
  avg: number;
  payouts: PayoutLine[];
  /** Remote displays set this when the feed has gone quiet. */
  staleSinceMs?: number | null;
}

export function DisplayBoard({
  name,
  currency,
  clock,
  periods,
  playersLeft,
  entries,
  pool,
  avg,
  payouts,
  staleSinceMs,
}: DisplayBoardProps) {
  useWakeLock();
  const now = useNow();
  const pos = deriveClock(clock, periods, now);
  const level = pos?.period.type === "level" ? pos.period : null;
  const onBreak = pos?.period.type === "break";
  const bigBlind = level?.bb ?? null;

  return (
    <div
      className="flex min-h-screen cursor-pointer flex-col bg-background px-[4vw] py-[3vh] select-none"
      onDoubleClick={() => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
      }}
      title="Double-click for fullscreen"
    >
      <div className="flex items-baseline justify-between text-[2vh] text-muted-foreground">
        <span className="font-semibold text-foreground">
          <span className="text-primary">♠</span> {name}
        </span>
        <span>
          {staleSinceMs ? (
            <span className="text-destructive">
              Feed paused · last update {Math.round(staleSinceMs / 60000)}m ago ·{" "}
            </span>
          ) : null}
          {onBreak ? "Break" : pos ? `Level ${pos.levelNumber}` : "Waiting to start"}
          {pos?.paused ? " · PAUSED" : ""}
        </span>
      </div>

      <div className="flex flex-1 items-center gap-[3vw]">
        <div className="flex flex-1 flex-col items-center justify-center">
          <div
            className={`font-mono font-bold leading-none tabular-nums tracking-tight ${
              pos?.paused
                ? "text-muted-foreground"
                : pos && pos.remainingMs <= 60_000
                  ? "text-primary"
                  : "text-foreground"
            }`}
            style={{ fontSize: "min(22vh, 19vw)" }}
          >
            {pos ? fmtClock(pos.remainingMs) : "--:--"}
          </div>

          {onBreak ? (
            <div className="mt-[2vh] text-[min(6vh,6vw)] font-semibold text-primary">
              BREAK
              {pos?.period.type === "break" && pos.period.chipRaceBelow
                ? ` — race off below ${fmtChips(pos.period.chipRaceBelow)}`
                : ""}
            </div>
          ) : level ? (
            <div className="mt-[1vh] text-center">
              <div className="text-[min(8vh,8vw)] font-semibold leading-tight tabular-nums">
                {fmtChips(level.sb)} / {fmtChips(level.bb)}
              </div>
              {level.ante > 0 && (
                <div className="text-[3.2vh] text-muted-foreground">
                  BB ante {fmtChips(level.ante)}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-[2vh] text-[4vh] text-muted-foreground">
              Shuffle up & deal
            </div>
          )}

          <div className="mt-[3vh] flex gap-[4vw] text-center text-[2.4vh] text-muted-foreground">
            <div>
              <div className="text-[1.8vh] uppercase tracking-widest">Next</div>
              <div className="text-foreground tabular-nums">
                {pos?.nextLevel
                  ? fmtBlinds(pos.nextLevel.sb, pos.nextLevel.bb, pos.nextLevel.ante)
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-[1.8vh] uppercase tracking-widest">
                Next break
              </div>
              <div className="text-foreground tabular-nums">
                {pos?.nextBreak ? fmtClock(pos.nextBreak.inMs) : "—"}
              </div>
            </div>
          </div>
        </div>

        {payouts.length > 0 && (
          <div className="hidden min-w-[18vw] flex-col gap-[1vh] rounded-xl border border-border/60 bg-card p-[1.5vw] md:flex">
            <div className="text-[1.8vh] uppercase tracking-widest text-muted-foreground">
              Payouts
            </div>
            {payouts.slice(0, 9).map((l) => (
              <div
                key={l.place}
                className="flex items-baseline justify-between gap-[2vw] text-[2.6vh]"
              >
                <span className="text-muted-foreground">{ordinal(l.place)}</span>
                <span className="font-semibold tabular-nums">
                  {fmtMoney(l.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-[2vh] border-t border-border/60 pt-[2.5vh] text-center sm:grid-cols-4">
        {[
          ["Players", `${playersLeft} / ${entries}`],
          ["Prize pool", fmtMoney(pool, currency)],
          [
            "Avg stack",
            bigBlind ? `${fmtChips(avg)} · ${Math.round(avg / bigBlind)} BB` : fmtChips(avg),
          ],
          ["Total chips", fmtChips(avg * Math.max(playersLeft, 0))],
        ].map(([label, value]) => (
          <div key={label}>
            <div className="text-[1.8vh] uppercase tracking-widest text-muted-foreground">
              {label}
            </div>
            <div className="text-[3.6vh] font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
