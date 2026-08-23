# Shuffle Up — Poker Tournament Director

A free, offline-first PWA for running home-game and small-club poker tournaments from one device: blind clock, structure generator, buy-in/rebuy bookkeeping, seating, payouts (incl. ICM), and a read-only share link for a second screen.

Live: https://pokertimer-nine.vercel.app

## Features

- **Tournament clock** — level timer derived purely from timestamps (survives reloads and sleep), pause/resume, breaks, level sounds, wake lock.
- **Blind structures** — built-in presets plus a generator (`/structures`) that targets a duration and player count.
- **Chip sets** (`/chipsets`) — describe your physical chips once, get stack breakdowns for any player count.
- **Players & bookkeeping** — buy-ins, rebuys, add-ons, bust-outs. Bookkeeping only; the app never moves money.
- **Seating** — table/seat assignment and balancing.
- **Payouts** — configurable payout structures and ICM chop calculations.
- **Display mode** (`/t/{id}/display`) — full-screen broadcast board for a TV.
- **Share link** (`/d/{code}`) — read-only remote board; the director device pushes snapshots to a Redis-backed endpoint and viewers poll.
- **Offline-first** — every director action is an event in IndexedDB (Dexie); state is a fold over the event log; undo removes the last undoable event. Service worker via Serwist.
- **Backup/restore** — export and import the local database.
- No accounts in v1; all IDs are UUIDs so records can be merged into a cloud backend later.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn/ui (Radix) · Dexie · Zustand · Serwist · Upstash Redis (share link only) · Vitest.

## Development

```bash
npm install
npm run dev      # http://localhost:3000 (service worker disabled in dev)
npm test         # vitest
npm run lint
npm run build    # uses --webpack: required for the Serwist service-worker hook
```

The share link API (`src/app/api/display/[code]`) needs `KV_REST_API_URL`/`KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL`/`_TOKEN`) in `.env.local`; without them it returns an error and the rest of the app still works offline.

`public/sw.js` is generated from `src/app/sw.ts` at build time and is not committed.

## Deploy

GitHub repo `billye2/pokertimer` is connected to the Vercel project: pushes to `main` deploy to production, other branches/PRs get preview URLs. `vercel --prod` still works for an ad-hoc deploy of the local tree.
