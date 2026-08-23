"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useClockSounds } from "@/hooks/use-clock-sounds";
import { useNow } from "@/hooks/use-now";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { deriveClock } from "@/lib/clock";
import { fmtBlinds, fmtClock } from "@/lib/format";
import { unlockAudio } from "@/lib/sounds";
import { useTournamentStore } from "@/stores/tournament-store";

export function ClockPanel() {
  const config = useTournamentStore((s) => s.config);
  const state = useTournamentStore((s) => s.state);
  const dispatch = useTournamentStore((s) => s.dispatch);
  const now = useNow();
  useWakeLock();

  const periods = config?.structure.periods ?? [];
  const pos = state ? deriveClock(state.clock, periods, now) : null;
  useClockSounds(pos);

  if (!config || !state) return null;

  if (!pos) {
    const first = periods[0];
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-16">
          <div className="text-muted-foreground">Ready to shuffle up & deal</div>
          {first?.type === "level" && (
            <div className="text-3xl font-semibold tabular-nums">
              {fmtBlinds(first.sb, first.bb, first.ante)}
            </div>
          )}
          <Button
            size="lg"
            className="px-10 text-lg"
            onClick={() => {
              unlockAudio();
              void dispatch({ type: "clock/start" });
            }}
          >
            Start clock
          </Button>
        </CardContent>
      </Card>
    );
  }

  const onBreak = pos.period.type === "break";
  const level = pos.period.type === "level" ? pos.period : null;

  return (
    <Card className={onBreak ? "border-primary/60" : undefined}>
      <CardContent className="flex flex-col items-center gap-4 py-10">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {onBreak ? (
            <Badge className="text-sm">Break</Badge>
          ) : (
            <span>Level {pos.levelNumber}</span>
          )}
          {pos.paused && <Badge variant="destructive">Paused</Badge>}
          {pos.overtime && <Badge variant="secondary">Final level</Badge>}
        </div>

        <div
          className={`font-mono text-[clamp(4rem,14vw,9rem)] font-bold leading-none tabular-nums tracking-tight ${
            pos.paused ? "text-muted-foreground" : ""
          } ${!pos.paused && pos.remainingMs <= 60_000 ? "text-primary" : ""}`}
        >
          {fmtClock(pos.remainingMs)}
        </div>

        {level && (
          <div className="text-4xl font-semibold tabular-nums">
            {fmtBlinds(level.sb, level.bb, level.ante)}
          </div>
        )}
        {onBreak && pos.period.type === "break" && pos.period.chipRaceBelow ? (
          <div className="rounded-md bg-primary/15 px-4 py-2 text-primary">
            Race off chips below {pos.period.chipRaceBelow.toLocaleString()}
          </div>
        ) : null}

        <div className="mt-2 grid grid-cols-2 gap-x-10 gap-y-1 text-center text-sm text-muted-foreground sm:grid-cols-2">
          <div>
            <div className="uppercase tracking-wide text-xs">Next blinds</div>
            <div className="text-base text-foreground tabular-nums">
              {pos.nextLevel
                ? fmtBlinds(pos.nextLevel.sb, pos.nextLevel.bb, pos.nextLevel.ante)
                : "—"}
            </div>
          </div>
          <div>
            <div className="uppercase tracking-wide text-xs">Next break</div>
            <div className="text-base text-foreground tabular-nums">
              {pos.nextBreak ? `in ${fmtClock(pos.nextBreak.inMs)}` : "—"}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              void dispatch({
                type: "clock/set-period",
                periodIdx: Math.max(0, pos.periodIdx - 1),
              })
            }
          >
            ⏮ Prev level
          </Button>
          <Button
            size="lg"
            className="min-w-32"
            onClick={() => {
              unlockAudio();
              void dispatch({ type: pos.paused ? "clock/resume" : "clock/pause" });
            }}
          >
            {pos.paused ? "Resume" : "Pause"}
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              void dispatch({
                type: "clock/set-period",
                periodIdx: Math.min(periods.length - 1, pos.periodIdx + 1),
              })
            }
          >
            Next level ⏭
          </Button>
          <Button
            variant="outline"
            onClick={() => void dispatch({ type: "clock/adjust", deltaMs: -60_000 })}
          >
            +1 min
          </Button>
          <Button
            variant="outline"
            onClick={() => void dispatch({ type: "clock/adjust", deltaMs: 60_000 })}
          >
            −1 min
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
