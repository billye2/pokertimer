# Handoff

## Current state

- `main` includes `7341ef9 Add QR code for display sharing` and was pushed to GitHub; Vercel deploys it to production automatically.
- The public production URL responded with HTTP 200 after the push.
- The app no longer has a Supabase dependency. Its hosted services are Vercel, Neon Postgres, Upstash Redis, and Resend.

## Recommended verification

On a real device, open a tournament, select **Share link**, scan the QR code from a second device, and confirm the read-only display updates as the director clock changes. Keep the director page open while testing: the remote snapshot expires 12 hours after the last push.

Also test passwordless sign-in in production once with a real inbox. This exercises the Neon database, Upstash code storage, and Resend configuration together.

## Operational notes

- Vercel’s Upstash integration must expose Redis REST variables (`KV_REST_API_URL` / `KV_REST_API_TOKEN` or the Upstash equivalents). A TCP-only `REDIS_URL` does not satisfy the `@upstash/redis` SDK used here.
- `DATABASE_URL` is the app’s normal Neon connection; use `DATABASE_URL_UNPOOLED` for Drizzle migrations.
- Never add secrets or live connection strings to these documents or version control.
