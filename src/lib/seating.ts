import type { Entrant, Seat, SeatAssignment } from "./events";

export function neededTables(players: number, tableSize: number): number {
  return Math.max(1, Math.ceil(players / tableSize));
}

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Random full seat draw: spreads players across the minimum number of tables
 * as evenly as possible, random seats within each table.
 */
export function randomSeatDraw(
  playerIds: string[],
  tableSize: number
): SeatAssignment[] {
  const tables = neededTables(playerIds.length, tableSize);
  const order = shuffled(playerIds);
  const assignments: SeatAssignment[] = [];
  // Deal players round-robin to tables, then random seat numbers per table.
  const perTable: string[][] = Array.from({ length: tables }, () => []);
  order.forEach((id, i) => perTable[i % tables].push(id));
  perTable.forEach((ids, t) => {
    const seats = shuffled(
      Array.from({ length: tableSize }, (_, i) => i + 1)
    ).slice(0, ids.length);
    ids.forEach((playerId, i) =>
      assignments.push({ playerId, table: t + 1, seat: seats[i] })
    );
  });
  return assignments;
}

export interface TableCount {
  table: number;
  count: number;
}

export function tableCounts(entrants: Entrant[]): TableCount[] {
  const map = new Map<number, number>();
  for (const e of entrants) {
    if (e.status === "active" && e.seat) {
      map.set(e.seat.table, (map.get(e.seat.table) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([table, count]) => ({ table, count }))
    .sort((a, b) => a.table - b.table);
}

/** Tables are unbalanced when max and min player counts differ by more than 1. */
export function isUnbalanced(counts: TableCount[]): boolean {
  if (counts.length < 2) return false;
  const values = counts.map((c) => c.count);
  return Math.max(...values) - Math.min(...values) > 1;
}

function openSeats(
  entrants: Entrant[],
  table: number,
  tableSize: number
): number[] {
  const taken = new Set(
    entrants
      .filter((e) => e.status === "active" && e.seat?.table === table)
      .map((e) => e.seat!.seat)
  );
  const open: number[] = [];
  for (let s = 1; s <= tableSize; s++) if (!taken.has(s)) open.push(s);
  return open;
}

/**
 * Suggest moves to rebalance: repeatedly move a random player from the largest
 * table into an open seat at the smallest, until balanced.
 */
export function balanceMoves(
  entrants: Entrant[],
  tableSize: number
): SeatAssignment[] {
  const moves: SeatAssignment[] = [];
  // Work on a mutable copy of seatings.
  const seated = entrants
    .filter((e) => e.status === "active" && e.seat)
    .map((e) => ({ playerId: e.playerId, seat: { ...e.seat! } }));

  for (let guard = 0; guard < 50; guard++) {
    const counts = new Map<number, number>();
    for (const p of seated)
      counts.set(p.seat.table, (counts.get(p.seat.table) ?? 0) + 1);
    const entries = [...counts.entries()];
    if (entries.length < 2) break;
    entries.sort((a, b) => a[1] - b[1]);
    const [smallTable, smallCount] = entries[0];
    const [bigTable, bigCount] = entries[entries.length - 1];
    if (bigCount - smallCount <= 1) break;

    const candidates = seated.filter((p) => p.seat.table === bigTable);
    const mover = candidates[Math.floor(Math.random() * candidates.length)];
    const takenAtSmall = new Set(
      seated.filter((p) => p.seat.table === smallTable).map((p) => p.seat.seat)
    );
    let destSeat = 1;
    for (let s = 1; s <= tableSize; s++) {
      if (!takenAtSmall.has(s)) {
        destSeat = s;
        break;
      }
    }
    mover.seat = { table: smallTable, seat: destSeat };
    moves.push({ playerId: mover.playerId, table: smallTable, seat: destSeat });
  }
  return moves;
}

/**
 * Should a table break? True when the remaining players fit in one fewer table.
 */
export function shouldBreakTable(
  activeSeated: number,
  tables: number,
  tableSize: number
): boolean {
  return tables > 1 && activeSeated <= (tables - 1) * tableSize;
}

/** Pick the highest-numbered table as the one to break. */
export function tableToBreak(counts: TableCount[]): number | null {
  if (counts.length < 2) return null;
  return Math.max(...counts.map((c) => c.table));
}

/**
 * Assign everyone at the breaking table to open seats across the remaining
 * tables, filling the emptiest tables first.
 */
export function breakTableMoves(
  entrants: Entrant[],
  table: number,
  tableSize: number
): SeatAssignment[] {
  const movers = shuffled(
    entrants.filter((e) => e.status === "active" && e.seat?.table === table)
  );
  const others = tableCounts(
    entrants.filter((e) => e.seat?.table !== table)
  ).filter((c) => c.table !== table);

  // Build open-seat pools per destination table.
  const pools = new Map<number, number[]>();
  for (const { table: t } of others) {
    pools.set(
      t,
      shuffled(
        openSeats(
          entrants.filter((e) => e.seat?.table !== table),
          t,
          tableSize
        )
      )
    );
  }

  const moves: SeatAssignment[] = [];
  const counts = new Map(others.map((c) => [c.table, c.count]));
  for (const mover of movers) {
    // Emptiest destination with an open seat.
    const dest = [...counts.entries()]
      .filter(([t]) => (pools.get(t)?.length ?? 0) > 0)
      .sort((a, b) => a[1] - b[1])[0];
    if (!dest) break;
    const [t] = dest;
    const seat = pools.get(t)!.shift()!;
    moves.push({ playerId: mover.playerId, table: t, seat });
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return moves;
}

export function seatLabel(seat: Seat | null): string {
  return seat ? `T${seat.table} · S${seat.seat}` : "—";
}
