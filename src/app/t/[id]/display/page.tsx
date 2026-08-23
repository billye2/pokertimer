"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { DisplayBoard } from "@/components/display-board";
import { db, loadEvents } from "@/lib/db";
import {
  activeEntrants,
  avgStack,
  foldEvents,
  prizePool,
  totalEntries,
} from "@/lib/events";
import { computePayouts } from "@/lib/payouts";

/** Local display: mirrors the director device live via IndexedDB cross-tab. */
export default function DisplayPage() {
  const params = useParams<{ id: string }>();
  const record = useLiveQuery(() => db.tournaments.get(params.id), [params.id]);
  const events = useLiveQuery(() => loadEvents(params.id), [params.id]);
  const state = useMemo(() => (events ? foldEvents(events) : null), [events]);

  if (!record || !state) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        {record === undefined ? "" : "Tournament not found."}
      </div>
    );
  }

  const config = record.config;
  const entries = totalEntries(state);
  const pool = prizePool(config, state);

  return (
    <DisplayBoard
      name={config.name}
      currency={config.currency}
      clock={state.clock}
      periods={config.structure.periods}
      playersLeft={activeEntrants(state).length}
      entries={entries}
      pool={pool}
      avg={avgStack(config, state)}
      payouts={
        state.payoutOverride ?? computePayouts(pool, entries, config.payouts)
      }
    />
  );
}
