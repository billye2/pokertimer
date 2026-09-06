import Dexie, { type EntityTable, type Table } from "dexie";
import type { TournamentEvent } from "./events";
import type { Chipset, PlayerProfile, Structure, TournamentConfig } from "./types";

export interface TournamentRecord {
  id: string;
  createdAt: number;
  status: "live" | "finished";
  finishedAt: number | null;
  config: TournamentConfig;
  /** Unguessable code for the online read-only display link. */
  shareCode?: string;
}

export type StoredEvent = TournamentEvent & { tournamentId: string };

class TournamentDirectorDB extends Dexie {
  structures!: EntityTable<Structure, "id">;
  chipsets!: EntityTable<Chipset, "id">;
  players!: EntityTable<PlayerProfile, "id">;
  tournaments!: EntityTable<TournamentRecord, "id">;
  events!: Table<StoredEvent, [string, number]>;

  constructor() {
    super("shuffleup");
    this.version(1).stores({
      structures: "id, name, preset",
      chipsets: "id, name",
      players: "id, name",
      tournaments: "id, createdAt, status",
      events: "[tournamentId+seq], tournamentId",
    });
  }
}

export const db = new TournamentDirectorDB();

export async function loadEvents(tournamentId: string): Promise<TournamentEvent[]> {
  const rows = await db.events
    .where("[tournamentId+seq]")
    .between([tournamentId, Dexie.minKey], [tournamentId, Dexie.maxKey])
    .toArray();
  return rows.sort((a, b) => a.seq - b.seq);
}

export async function appendEvent(
  tournamentId: string,
  evt: TournamentEvent
): Promise<void> {
  await db.events.add({ ...evt, tournamentId });
}

export async function deleteEvent(
  tournamentId: string,
  seq: number
): Promise<void> {
  await db.events.delete([tournamentId, seq]);
}
