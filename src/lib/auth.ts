import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";

const CODE_TTL_S = 10 * 60;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 3;
export const SESSION_COOKIE = "su_session";
const SESSION_MAX_AGE_S = 365 * 24 * 60 * 60;

function redis() {
  return Redis.fromEnv();
}

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Generate + store a code for the email. Returns the code, or null when rate-limited. */
export async function issueCode(email: string): Promise<string | null> {
  const r = redis();
  const sends = await r.incr(`auth:sends:${email}`);
  if (sends === 1) await r.expire(`auth:sends:${email}`, 3600);
  if (sends > MAX_SENDS_PER_HOUR) return null;

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await r.set(`auth:code:${email}`, { h: sha256(code), tries: 0 }, { ex: CODE_TTL_S });
  return code;
}

/** Check a submitted code. Consumes the code on success; counts attempts on failure. */
export async function redeemCode(email: string, code: string): Promise<boolean> {
  const r = redis();
  const key = `auth:code:${email}`;
  const stored = await r.get<{ h: string; tries: number }>(key);
  if (!stored) return false;
  if (stored.tries >= MAX_VERIFY_ATTEMPTS) {
    await r.del(key);
    return false;
  }
  const ok =
    code.length === 6 &&
    timingSafeEqual(Buffer.from(sha256(code)), Buffer.from(stored.h));
  if (!ok) {
    await r.set(key, { h: stored.h, tries: stored.tries + 1 }, { ex: CODE_TTL_S });
    return false;
  }
  await r.del(key);
  return true;
}

/** Find-or-create the user, mint a session token, set the cookie. */
export async function createSession(email: string): Promise<void> {
  const db = getDb();
  const [user] =
    (await db.select().from(users).where(eq(users.email, email))).length > 0
      ? await db.select().from(users).where(eq(users.email, email))
      : await db.insert(users).values({ email }).returning();

  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({ tokenHash: sha256(token), userId: user.id });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
}

export async function currentUser(): Promise<{ id: string; email: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, sha256(token)));
  return rows[0] ?? null;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await getDb().delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  }
  store.delete(SESSION_COOKIE);
}
