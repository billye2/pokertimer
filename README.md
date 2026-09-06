# Tournament Director

A free, offline-first PWA for running home-game and small-club poker tournaments from one device: blind clock, structure generator, buy-in/rebuy bookkeeping, seating, payouts (incl. ICM), and a read-only share link for a second screen.

Live: https://tournamentdir.vercel.app

## Features

- **Tournament clock** — level timer derived purely from timestamps (survives reloads and sleep), pause/resume, breaks, level sounds, wake lock.
- **Blind structures** — built-in presets plus a generator (`/structures`) that targets a duration and player count.
- **Chip sets** (`/chipsets`) — describe your physical chips once, get stack breakdowns for any player count.
- **Players & bookkeeping** — buy-ins, rebuys, add-ons, bust-outs. Bookkeeping only; the app never moves money.
- **Seating** — table/seat assignment and balancing.
- **Payouts** — configurable payout structures and ICM chop calculations.
- **Display mode** (`/t/{id}/display`) — full-screen broadcast board for a TV.
- **Share link** (`/d/{code}`) — read-only remote board; the director device pushes snapshots to a Redis-backed endpoint, viewers poll, and a QR code makes sharing to a second device quick.
- **Offline-first** — every director action is an event in IndexedDB (Dexie); state is a fold over the event log; undo removes the last undoable event. Service worker via Serwist.
- **Backup/restore** — export and import the local database.
- **Help** (`/help`) — in-app guide covering setup, clock, players, seating, payouts, display, undo, and backups.
- **Passwordless sign-in** — email verification codes are rate-limited and stored in Redis; users and device sessions live in Postgres.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn/ui (Radix) · Dexie · Zustand · Serwist · Neon Postgres + Drizzle · Upstash Redis · Resend · Vitest.

## Development

```bash
npm install
npm run dev      # http://localhost:3000 (service worker disabled in dev)
npm test         # vitest
npm run lint
npm run build    # uses --webpack: required for the Serwist service-worker hook
```

Set these environment variables locally (or through the corresponding Vercel integrations):

- `DATABASE_URL` — Neon Postgres connection used for users and sessions.
- `DATABASE_URL_UNPOOLED` — direct Neon connection used by Drizzle migrations.
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` — Upstash Redis credentials for share-link snapshots and sign-in codes. `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are also supported by the SDK.
- `RESEND_API_KEY` and optionally `RESEND_EMAIL_DOMAIN` — passwordless email sign-in.

Without Redis REST credentials, the share-link endpoint returns an error and sign-in codes cannot be issued; tournament operations continue to work offline.

`public/sw.js` is generated from `src/app/sw.ts` at build time and is not committed.

## Deploy

GitHub repo `billye2/pokertimer` is connected to the Vercel project: pushes to `main` deploy to production, other branches/PRs get preview URLs. `vercel --prod` still works for an ad-hoc deploy of the local tree.
