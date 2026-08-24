# Project Memory

- Production: <https://pokertimer-nine.vercel.app>. Pushing `main` to `billye2/pokertimer` deploys to Vercel production.
- Core tournament data is offline-first in IndexedDB (Dexie); it is not stored in Supabase or Postgres.
- Neon Postgres, through Drizzle and `@neondatabase/serverless`, stores passwordless-auth users and long-lived sessions.
- Upstash Redis backs two ephemeral concerns: passwordless email codes/rate limiting and remote display snapshots. It must be available through REST environment variables in Vercel.
- Supabase is not used anywhere in the codebase. An unused legacy Supabase environment variable, if one remains in Vercel, can be removed separately.
- The director page’s **Share link** action opens a QR-code dialog and offers a copy-link fallback. This shipped in commit `7341ef9`.

## Validation baseline

After application changes, run:

```bash
npm run lint
npm run build
```

The QR-share feature passed both checks before commit `7341ef9`.
