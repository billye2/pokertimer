"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  activeEntrants,
} from "@/lib/events";
import type { SeatAssignment } from "@/lib/events";
import {
  balanceMoves,
  breakTableMoves,
  isUnbalanced,
  randomSeatDraw,
  shouldBreakTable,
  tableCounts,
  tableToBreak,
} from "@/lib/seating";
import { useTournamentStore } from "@/stores/tournament-store";

export function TablesPanel() {
  const config = useTournamentStore((s) => s.config);
  const state = useTournamentStore((s) => s.state);
  const dispatch = useTournamentStore((s) => s.dispatch);
  const [pendingMoves, setPendingMoves] = useState<{
    title: string;
    moves: SeatAssignment[];
    breakTable?: number;
  } | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [moveTable, setMoveTable] = useState(1);
  const [moveSeat, setMoveSeat] = useState(1);

  if (!config || !state) return null;

  const active = activeEntrants(state);
  const seated = active.filter((e) => e.seat);
  const counts = tableCounts(active);
  const unbalanced = isUnbalanced(counts);
  const breakable =
    counts.length > 1 &&
    shouldBreakTable(seated.length, counts.length, config.tableSize);
  const breakTarget = breakable ? tableToBreak(counts) : null;

  const nameOf = (id: string) => state.entrants[id]?.name ?? id;

  function drawSeats() {
    const assignments = randomSeatDraw(
      active.map((e) => e.playerId),
      config!.tableSize
    );
    void dispatch({ type: "seat/draw", assignments });
  }

  const tables = counts.map((c) => c.table);
  const maxTable = Math.max(1, ...tables);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={drawSeats} disabled={active.length === 0}>
          {seated.length > 0 ? "Redraw all seats" : "Draw seats"}
        </Button>
        {unbalanced && (
          <Button
            variant="secondary"
            onClick={() =>
              setPendingMoves({
                title: "Balance tables",
                moves: balanceMoves(active, config.tableSize),
              })
            }
          >
            ⚖ Balance tables
          </Button>
        )}
        {breakable && breakTarget && (
          <Button
            variant="secondary"
            onClick={() =>
              setPendingMoves({
                title: `Break table ${breakTarget}`,
                moves: breakTableMoves(active, breakTarget, config.tableSize),
                breakTable: breakTarget,
              })
            }
          >
            Break table {breakTarget}
          </Button>
        )}
      </div>

      {unbalanced && (
        <p className="text-sm text-primary">
          Tables are unbalanced — a table has 2+ more players than another.
        </p>
      )}
      {breakable && (
        <p className="text-sm text-primary">
          The field fits on {counts.length - 1} table
          {counts.length - 1 > 1 ? "s" : ""} — table {breakTarget} can break.
        </p>
      )}

      {seated.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No seats drawn yet. Add players, then draw seats.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {counts.map(({ table, count }) => (
            <Card key={table}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  Table {table}
                  <Badge variant="secondary">{count} players</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1">
                {Array.from({ length: config.tableSize }, (_, i) => i + 1).map(
                  (seatNo) => {
                    const occupant = seated.find(
                      (e) => e.seat!.table === table && e.seat!.seat === seatNo
                    );
                    return (
                      <div
                        key={seatNo}
                        className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-secondary/50"
                      >
                        <span
                          className={
                            occupant ? "" : "text-muted-foreground/50"
                          }
                        >
                          <span className="mr-2 inline-block w-6 text-muted-foreground tabular-nums">
                            {seatNo}
                          </span>
                          {occupant ? occupant.name : "empty"}
                        </span>
                        {occupant && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground"
                            onClick={() => {
                              setMoving(occupant.playerId);
                              setMoveTable(table);
                              setMoveSeat(seatNo);
                            }}
                          >
                            Move
                          </Button>
                        )}
                      </div>
                    );
                  }
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Batch move confirmation (balance / break) */}
      <Dialog
        open={pendingMoves !== null}
        onOpenChange={(open) => !open && setPendingMoves(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingMoves?.title}</DialogTitle>
          </DialogHeader>
          <ul className="grid gap-1 text-sm">
            {pendingMoves?.moves.map((m) => (
              <li key={m.playerId}>
                <span className="font-medium">{nameOf(m.playerId)}</span>
                <span className="text-muted-foreground">
                  {" "}
                  → Table {m.table}, Seat {m.seat}
                </span>
              </li>
            ))}
            {pendingMoves?.moves.length === 0 && (
              <li className="text-muted-foreground">No moves needed.</li>
            )}
          </ul>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPendingMoves(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!pendingMoves) return;
                if (pendingMoves.breakTable) {
                  void dispatch({
                    type: "table/break",
                    table: pendingMoves.breakTable,
                    moves: pendingMoves.moves,
                  });
                } else {
                  void dispatch({
                    type: "seat/draw",
                    assignments: pendingMoves.moves,
                  });
                }
                setPendingMoves(null);
              }}
            >
              Apply moves
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single-player move */}
      <Dialog open={moving !== null} onOpenChange={(open) => !open && setMoving(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Move {moving ? nameOf(moving) : ""}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <span className="text-sm text-muted-foreground">Table</span>
              <Select
                value={String(moveTable)}
                onValueChange={(v) => setMoveTable(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxTable + 1 }, (_, i) => i + 1).map((t) => (
                    <SelectItem key={t} value={String(t)}>
                      Table {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <span className="text-sm text-muted-foreground">Seat</span>
              <Select
                value={String(moveSeat)}
                onValueChange={(v) => setMoveSeat(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: config.tableSize }, (_, i) => i + 1).map(
                    (s) => (
                      <SelectItem key={s} value={String(s)}>
                        Seat {s}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setMoving(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!moving) return;
                const occupied = seated.some(
                  (e) =>
                    e.playerId !== moving &&
                    e.seat!.table === moveTable &&
                    e.seat!.seat === moveSeat
                );
                if (occupied) {
                  alert("That seat is taken.");
                  return;
                }
                void dispatch({
                  type: "seat/assign",
                  playerId: moving,
                  seat: { table: moveTable, seat: moveSeat },
                });
                setMoving(null);
              }}
            >
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
