"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  activeEntrants,
  bountyPool,
  prizePool,
  totalEntries,
} from "@/lib/events";
import { fmtMoney, ordinal } from "@/lib/format";
import { chipChop, evenChop, icmChop, roundChop, type ChopLine } from "@/lib/icm";
import { computePayouts, type PayoutLine } from "@/lib/payouts";
import { useTournamentStore } from "@/stores/tournament-store";

type ChopMethod = "even" | "chip-chip" | "icm";

export function PayoutsPanel() {
  const config = useTournamentStore((s) => s.config);
  const state = useTournamentStore((s) => s.state);
  const dispatch = useTournamentStore((s) => s.dispatch);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PayoutLine[]>([]);
  const [chopOpen, setChopOpen] = useState(false);
  const [chopMethod, setChopMethod] = useState<ChopMethod>("icm");
  const [stacks, setStacks] = useState<Record<string, number>>({});

  const pool = config && state ? prizePool(config, state) : 0;
  const entries = state ? totalEntries(state) : 0;

  const lines: PayoutLine[] = useMemo(() => {
    if (!config || !state) return [];
    if (state.payoutOverride) return state.payoutOverride;
    return computePayouts(pool, entries, config.payouts);
  }, [config, state, pool, entries]);

  if (!config || !state) return null;

  const active = activeEntrants(state);
  const finished = state.finishedAt !== null;

  // Remaining (unclaimed) payout places for the chop calculator.
  const remainingPayouts = lines
    .filter((l) => l.place <= active.length)
    .map((l) => l.amount);

  const chopLines: ChopLine[] = (() => {
    if (!chopOpen) return [];
    const players = active.map((e) => ({
      playerId: e.playerId,
      stack: stacks[e.playerId] ?? 0,
    }));
    const remainingPool = remainingPayouts.reduce((a, b) => a + b, 0);
    if (players.length === 0 || remainingPool <= 0) return [];
    if (
      chopMethod !== "even" &&
      players.reduce((a, p) => a + p.stack, 0) <= 0
    ) {
      return [];
    }
    let raw: ChopLine[];
    if (chopMethod === "even") raw = evenChop(players, remainingPool);
    else if (chopMethod === "chip-chip")
      raw = chipChop(players, remainingPayouts, remainingPool);
    else raw = icmChop(players, remainingPayouts);
    return roundChop(raw, remainingPool);
  })();

  const winnerOf = (place: number) =>
    Object.values(state.entrants).find((e) => e.finishPlace === place);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              Payouts
              <span className="text-sm font-normal text-muted-foreground">
                Pool {fmtMoney(pool, config.currency)}
                {config.bounty
                  ? ` · Bounties ${fmtMoney(bountyPool(config, state), config.currency)}`
                  : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.deal ? (
              <div className="mb-3 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
                Deal recorded ({state.deal.method}) — deal amounts shown below
                override places {active.length > 0 ? `1–${active.length + (finished ? 0 : 0)}` : ""}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-6"
                  onClick={() => void dispatch({ type: "deal/clear" })}
                >
                  Clear
                </Button>
              </div>
            ) : null}
            <table className="w-full text-sm">
              <tbody>
                {lines.map((l) => {
                  const w = winnerOf(l.place);
                  const dealt = state.deal?.payouts.find(
                    (d) => d.playerId === w?.playerId
                  );
                  return (
                    <tr key={l.place} className="border-b border-border/40 last:border-0">
                      <td className="py-1.5 pr-3 text-muted-foreground">
                        {ordinal(l.place)}
                      </td>
                      <td className="py-1.5 pr-3 font-medium tabular-nums">
                        {fmtMoney(dealt ? dealt.amount : l.amount, config.currency)}
                        {dealt && (
                          <Badge variant="secondary" className="ml-2">
                            deal
                          </Badge>
                        )}
                      </td>
                      <td className="py-1.5 text-right text-muted-foreground">
                        {w?.name ?? ""}
                      </td>
                    </tr>
                  );
                })}
                {lines.length === 0 && (
                  <tr>
                    <td className="py-4 text-center text-muted-foreground">
                      No entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDraft(lines.map((l) => ({ ...l })));
                  setEditing(true);
                }}
                disabled={lines.length === 0}
              >
                Edit payouts
              </Button>
              {state.payoutOverride && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void dispatch({ type: "payouts/clear-override" })}
                >
                  Reset to standard
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setStacks(
                    Object.fromEntries(active.map((e) => [e.playerId, 0]))
                  );
                  setChopOpen(true);
                }}
                disabled={active.length < 2 || finished}
              >
                Chop calculator
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Results</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {Object.values(state.entrants)
                  .filter((e) => e.finishPlace !== null)
                  .sort((a, b) => a.finishPlace! - b.finishPlace!)
                  .map((e) => {
                    const dealAmt = state.deal?.payouts.find(
                      (d) => d.playerId === e.playerId
                    )?.amount;
                    const lineAmt = lines.find(
                      (l) => l.place === e.finishPlace
                    )?.amount;
                    const winnings =
                      (dealAmt ?? lineAmt ?? 0) +
                      (config.bounty ? e.bounties * config.bounty.amount : 0);
                    return (
                      <tr
                        key={e.playerId}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="py-1.5 pr-3 text-muted-foreground">
                          {ordinal(e.finishPlace!)}
                        </td>
                        <td className="py-1.5 pr-3 font-medium">{e.name}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {winnings > 0
                            ? fmtMoney(winnings, config.currency)
                            : ""}
                          {config.bounty && e.bounties > 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({e.bounties} KO)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {Object.values(state.entrants).every(
                  (e) => e.finishPlace === null
                ) && (
                  <tr>
                    <td className="py-4 text-center text-muted-foreground">
                      No finishers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Override editor */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit payouts</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            {draft.map((l, i) => (
              <div key={l.place} className="flex items-center gap-3">
                <span className="w-10 text-sm text-muted-foreground">
                  {ordinal(l.place)}
                </span>
                <Input
                  type="number"
                  value={l.amount}
                  onChange={(e) =>
                    setDraft((d) =>
                      d.map((x, j) =>
                        j === i
                          ? { ...x, amount: Number(e.target.value) || 0 }
                          : x
                      )
                    )
                  }
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setDraft((d) => [...d, { place: d.length + 1, amount: 0 }])
                }
              >
                + Add place
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={draft.length <= 1}
                onClick={() => setDraft((d) => d.slice(0, -1))}
              >
                − Remove last
              </Button>
            </div>
            <p
              className={`text-sm ${
                draft.reduce((a, l) => a + l.amount, 0) === pool
                  ? "text-muted-foreground"
                  : "text-destructive"
              }`}
            >
              Total {fmtMoney(draft.reduce((a, l) => a + l.amount, 0), config.currency)}{" "}
              of {fmtMoney(pool, config.currency)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void dispatch({ type: "payouts/override", payouts: draft });
                setEditing(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chop calculator */}
      <Dialog open={chopOpen} onOpenChange={setChopOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chop calculator</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <span className="text-sm text-muted-foreground">Method</span>
              <Select
                value={chopMethod}
                onValueChange={(v) => setChopMethod(v as ChopMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="icm">ICM (by stack equity)</SelectItem>
                  <SelectItem value="chip-chip">Chip chop</SelectItem>
                  <SelectItem value="even">Even split</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {chopMethod !== "even" && (
              <div className="grid gap-2">
                <span className="text-sm text-muted-foreground">
                  Current chip counts
                </span>
                {active.map((e) => (
                  <div key={e.playerId} className="flex items-center gap-3">
                    <span className="w-32 truncate text-sm">{e.name}</span>
                    <Input
                      type="number"
                      value={stacks[e.playerId] ?? 0}
                      onChange={(ev) =>
                        setStacks((s) => ({
                          ...s,
                          [e.playerId]: Number(ev.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-md border border-border p-3">
              <div className="mb-1 text-sm text-muted-foreground">
                Splitting{" "}
                {fmtMoney(
                  remainingPayouts.reduce((a, b) => a + b, 0),
                  config.currency
                )}{" "}
                across {active.length} players
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {chopLines.map((l) => (
                    <tr key={l.playerId}>
                      <td className="py-1">
                        {state.entrants[l.playerId]?.name}
                      </td>
                      <td className="py-1 text-right font-medium tabular-nums">
                        {fmtMoney(l.amount, config.currency)}
                      </td>
                    </tr>
                  ))}
                  {chopLines.length === 0 && (
                    <tr>
                      <td className="py-2 text-muted-foreground">
                        Enter chip counts to preview the split.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setChopOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={chopLines.length === 0}
              onClick={() => {
                void dispatch({
                  type: "deal/set",
                  method: chopMethod,
                  payouts: chopLines,
                });
                setChopOpen(false);
              }}
            >
              Record deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
