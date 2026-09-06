import { db } from "./db";

export interface BackupFile {
  app: "shuffleup";
  version: 1;
  exportedAt: number;
  structures: unknown[];
  chipsets: unknown[];
  players: unknown[];
  tournaments: unknown[];
  events: unknown[];
}

export async function exportBackup(): Promise<Blob> {
  const [structures, chipsets, players, tournaments, events] =
    await Promise.all([
      db.structures.toArray(),
      db.chipsets.toArray(),
      db.players.toArray(),
      db.tournaments.toArray(),
      db.events.toArray(),
    ]);
  const data: BackupFile = {
    app: "shuffleup",
    version: 1,
    exportedAt: Date.now(),
    structures,
    chipsets,
    players,
    tournaments,
    events,
  };
  return new Blob([JSON.stringify(data)], { type: "application/json" });
}

/** Merge a backup into the local database (last-write-wins by primary key). */
export async function importBackup(json: string): Promise<void> {
  const data = JSON.parse(json) as BackupFile;
  if (data.app !== "shuffleup" || data.version !== 1) {
    throw new Error("Not a Tournament Director backup file.");
  }
  await db.transaction(
    "rw",
    [db.structures, db.chipsets, db.players, db.tournaments, db.events],
    async () => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      await db.structures.bulkPut(data.structures as any);
      await db.chipsets.bulkPut(data.chipsets as any);
      await db.players.bulkPut(data.players as any);
      await db.tournaments.bulkPut(data.tournaments as any);
      await db.events.bulkPut(data.events as any);
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }
  );
}
