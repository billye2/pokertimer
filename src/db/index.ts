import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

/** Lazy so `next build` never needs DATABASE_URL. */
export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}
