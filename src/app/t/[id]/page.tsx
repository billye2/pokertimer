"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ClockPanel } from "@/components/director/clock-panel";
import { PayoutsPanel } from "@/components/director/payouts-panel";
import { PlayersPanel } from "@/components/director/players-panel";
import { TablesPanel } from "@/components/director/tables-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  activeEntrants,
  avgStack,
  prizePool,
  totalEntries,
} from "@/lib/events";
import { fmtChips, fmtMoney } from "@/lib/format";
import { useDisplayPush } from "@/hooks/use-display-push";
import { useTournamentStore } from "@/stores/tournament-store";

export default function DirectorPage() {
  const params = useParams<{ id: string }>();
  const load = useTournamentStore((s) => s.load);
  const shareCode = useTournamentStore((s) => s.shareCode);
  const config = useTournamentStore((s) => s.config);
  const state = useTournamentStore((s) => s.state);
  const status = useTournamentStore((s) => s.status);
  const loading = useTournamentStore((s) => s.loading);
  const dispatch = useTournamentStore((s) => s.dispatch);
  const undo = useTournamentStore((s) => s.undo);
  const lastUndoable = useTournamentStore((s) => s.lastUndoable);

  useEffect(() => {
    void load(params.id);
  }, [params.id, load]);
  useDisplayPush();

  if (loading) return null;
  if (!config || !state) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
          Tournament not found.
        </main>
      </div>
    );
  }

  const active = activeEntrants(state);
  const entries = totalEntries(state);
  const finished = state.finishedAt !== null;
  const canFinish =
    !finished && state.clock.started && active.length === 1 && entries > 1;
  const undoTarget = lastUndoable();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        right={
          <>
            {shareCode && (
              <button
                className="hover:text-foreground transition-colors"
                onClick={() => {
                  const url = `${location.origin}/d/${shareCode}`;
                  void navigator.clipboard.writeText(url).then(
                    () => alert(`Display link copied:\n${url}\n\nAnyone with this link sees a read-only clock (needs internet).`),
                    () => alert(`Display link:\n${url}`)
                  );
                }}
              >
                Share link
              </button>
            )}
            <Link
              href={`/t/${config.id}/display`}
              target="_blank"
              className="hover:text-foreground transition-colors"
            >
              Open display ↗
            </Link>
          </>
        }
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">{config.name}</h1>
            {status === "finished" ? (
              <Badge variant="secondary">Finished</Badge>
            ) : (
              <Badge>Live</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              <span className="font-medium text-foreground tabular-nums">
                {active.length}
              </span>
              /{entries} left
            </span>
            <span>
              Pool{" "}
              <span className="font-medium text-foreground tabular-nums">
                {fmtMoney(prizePool(config, state), config.currency)}
              </span>
            </span>
            <span>
              Avg{" "}
              <span className="font-medium text-foreground tabular-nums">
                {fmtChips(avgStack(config, state))}
              </span>
            </span>
            {undoTarget && !finished && (
              <Button variant="outline" size="sm" onClick={() => void undo()}>
                Undo {undoTarget.type.split("/")[1]}
              </Button>
            )}
          </div>
        </div>

        {canFinish && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/50 bg-primary/10 px-4 py-3">
            <span>
              <span className="font-semibold">{active[0].name}</span> is the last
            player standing.
            </span>
            <Button onClick={() => void dispatch({ type: "tournament/finish" })}>
              Finish tournament
            </Button>
          </div>
        )}

        <Tabs defaultValue="clock">
          <TabsList className="mb-4">
            <TabsTrigger value="clock">Clock</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="tables">Tables</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>
          <TabsContent value="clock">
            <ClockPanel />
          </TabsContent>
          <TabsContent value="players">
            <PlayersPanel />
          </TabsContent>
          <TabsContent value="tables">
            <TablesPanel />
          </TabsContent>
          <TabsContent value="payouts">
            <PayoutsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
