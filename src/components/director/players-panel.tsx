"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNow } from "@/hooks/use-now";
import { deriveClock } from "@/lib/clock";
import { db } from "@/lib/db";
import {
  activeEntrants,
  entrantCost,
  type Entrant,
} from "@/lib/events";
import { fmtMoney, ordinal } from "@/lib/format";
import { newId } from "@/lib/id";
import { seatLabel } from "@/lib/seating";
import { useTournamentStore } from "@/stores/tournament-store";

export function PlayersPanel() {
  const config = useTournamentStore((s) => s.config);
  const state = useTournamentStore((s) => s.state);
  const dispatch = useTournamentStore((s) => s.dispatch);
  const now = useNow(1000);

  const [name, setName] = useState("");
  const [eliminating, setEliminating] = useState<Entrant | null>(null);
  const [bountyTo, setBountyTo] = useState<string>("none");

  const profiles = useLiveQuery(() => db.players.toArray(), []);

  if (!config || !state) return null;

  const entrants = state.entrantOrder
    .map((id) => state.entrants[id])
    .filter(Boolean);
  const active = activeEntrants(state);
  const pos = deriveClock(state.clock, config.structure.periods, now);
  const currentPeriodIdx = pos?.periodIdx ?? 0;
  const rebuyOpen =
    !!config.rebuy &&
    (!state.clock.started || currentPeriodIdx <= config.rebuy.lastPeriodIdx);
  const addonOpen = !!config.addon && (!config.rebuy || rebuyOpen);
  const finished = state.finishedAt !== null;

  /** After the draw, new entrants auto-seat at the emptiest table. */
  function autoSeat(playerId: string) {
    const seated = active.filter((e) => e.seat);
    if (seated.length === 0) return;
    const counts = new Map<number, Set<number>>();
    for (const e of seated) {
      const set = counts.get(e.seat!.table) ?? new Set();
      set.add(e.seat!.seat);
      counts.set(e.seat!.table, set);
    }
    let best: { table: number; count: number } | null = null;
    for (const [table, seats] of counts) {
      if (seats.size < config!.tableSize && (!best || seats.size < best.count)) {
        best = { table, count: seats.size };
      }
    }
    if (!best) return;
    const taken = counts.get(best.table)!;
    for (let s = 1; s <= config!.tableSize; s++) {
      if (!taken.has(s)) {
        void dispatch({
          type: "seat/assign",
          playerId,
          seat: { table: best.table, seat: s },
        });
        return;
      }
    }
  }

  async function addPlayer() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = profiles?.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase()
    );
    const playerId = existing?.id ?? newId();
    if (!existing) {
      await db.players.add({ id: playerId, name: trimmed, createdAt: Date.now() });
    }
    if (state!.entrants[playerId]) {
      alert(`${trimmed} is already in this tournament.`);
      return;
    }
    await dispatch({ type: "entrant/buy-in", playerId, name: trimmed });
    autoSeat(playerId);
    setName("");
  }

  function confirmEliminate() {
    if (!eliminating) return;
    void dispatch({
      type: "entrant/eliminate",
      playerId: eliminating.playerId,
      byPlayerId: bountyTo === "none" ? null : bountyTo,
    });
    setEliminating(null);
    setBountyTo("none");
  }

  return (
    <div className="flex flex-col gap-4">
      {!finished && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void addPlayer();
          }}
        >
          <Input
            placeholder="Player name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            list="player-suggestions"
            className="max-w-xs"
          />
          <datalist id="player-suggestions">
            {profiles
              ?.filter((p) => !state.entrants[p.id])
              .map((p) => <option key={p.id} value={p.name} />)}
          </datalist>
          <Button type="submit">Buy in ({fmtMoney(config.buyIn + (config.bounty?.amount ?? 0), config.currency)})</Button>
        </form>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="px-4 py-2 text-left font-medium">Player</th>
                <th className="px-2 py-2 text-left font-medium">Seat</th>
                <th className="px-2 py-2 text-left font-medium">Entries</th>
                <th className="px-2 py-2 text-left font-medium">Rebuys</th>
                <th className="px-2 py-2 text-left font-medium">Add-ons</th>
                {config.bounty && (
                  <th className="px-2 py-2 text-left font-medium">KOs</th>
                )}
                <th className="px-2 py-2 text-left font-medium">Paid</th>
                <th className="px-2 py-2 text-left font-medium">Status</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {entrants.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No players yet — add the first buy-in above.
                  </td>
                </tr>
              )}
              {entrants.map((e) => (
                <tr key={e.playerId} className="border-b border-border/40">
                  <td className="px-4 py-2 font-medium">{e.name}</td>
                  <td className="px-2 py-2 tabular-nums text-muted-foreground">
                    {seatLabel(e.seat)}
                  </td>
                  <td className="px-2 py-2 tabular-nums">{e.entries}</td>
                  <td className="px-2 py-2 tabular-nums">{e.rebuys}</td>
                  <td className="px-2 py-2 tabular-nums">{e.addons}</td>
                  {config.bounty && (
                    <td className="px-2 py-2 tabular-nums">{e.bounties}</td>
                  )}
                  <td className="px-2 py-2 tabular-nums">
                    {fmtMoney(entrantCost(config, e), config.currency)}
                  </td>
                  <td className="px-2 py-2">
                    {e.status === "active" ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline">
                        Out {e.finishPlace ? ordinal(e.finishPlace) : ""}
                      </Badge>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {!finished && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            ⋯
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {e.status === "active" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEliminating(e);
                                  setBountyTo("none");
                                }}
                              >
                                Eliminate
                              </DropdownMenuItem>
                              {config.rebuy && (
                                <DropdownMenuItem
                                  disabled={!rebuyOpen}
                                  onClick={() =>
                                    void dispatch({
                                      type: "entrant/rebuy",
                                      playerId: e.playerId,
                                    })
                                  }
                                >
                                  Rebuy ({fmtMoney(config.rebuy.amount, config.currency)})
                                </DropdownMenuItem>
                              )}
                              {config.addon && (
                                <DropdownMenuItem
                                  disabled={!addonOpen}
                                  onClick={() =>
                                    void dispatch({
                                      type: "entrant/addon",
                                      playerId: e.playerId,
                                    })
                                  }
                                >
                                  Add-on ({fmtMoney(config.addon.amount, config.currency)})
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          {e.status === "eliminated" &&
                            config.rebuy?.reentry &&
                            rebuyOpen && (
                              <DropdownMenuItem
                                onClick={() => {
                                  void dispatch({
                                    type: "entrant/re-entry",
                                    playerId: e.playerId,
                                  }).then(() => autoSeat(e.playerId));
                                }}
                              >
                                Re-enter ({fmtMoney(config.buyIn + (config.bounty?.amount ?? 0), config.currency)})
                              </DropdownMenuItem>
                            )}
                          <DropdownMenuItem
                            onClick={() => {
                              const newName = prompt("Rename player", e.name);
                              if (newName?.trim()) {
                                void dispatch({
                                  type: "entrant/rename",
                                  playerId: e.playerId,
                                  name: newName.trim(),
                                });
                              }
                            }}
                          >
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              if (
                                confirm(
                                  `Remove ${e.name} entirely (mistaken entry)? This reverses their buy-in.`
                                )
                              ) {
                                void dispatch({
                                  type: "entrant/remove",
                                  playerId: e.playerId,
                                });
                              }
                            }}
                          >
                            Remove (mistake)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {config.rebuy && !rebuyOpen && !finished && (
        <p className="text-sm text-muted-foreground">
          Rebuy window is closed.
        </p>
      )}

      <Dialog
        open={eliminating !== null}
        onOpenChange={(open) => !open && setEliminating(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminate {eliminating?.name}</DialogTitle>
          </DialogHeader>
          {config.bounty ? (
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">
                Who gets the {fmtMoney(config.bounty.amount, config.currency)} bounty?
              </div>
              <Select value={bountyTo} onValueChange={setBountyTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No bounty</SelectItem>
                  {active
                    .filter((a) => a.playerId !== eliminating?.playerId)
                    .map((a) => (
                      <SelectItem key={a.playerId} value={a.playerId}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              They finish {ordinal(active.length)} of {entrants.length}.
            </p>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEliminating(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmEliminate}>
              Eliminate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
