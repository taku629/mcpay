# Database

Two backends, one contract (`packages/web/lib/repository.ts`).

## Default (dev): in-memory

If `MCPAY_BACKEND` is unset (or anything other than `supabase`), routes use
`InMemoryRepository`. The store is process-local, seeded with `prj_demo` and
the demo customer key. Restarting the dev server wipes it.

## Production: Supabase Postgres

1. Create a Supabase project.
2. Open the SQL editor and paste `schema.sql`. (Or `psql $DATABASE_URL -f
   schema.sql`.)
3. Copy your project URL and **service-role** key (Settings → API).
4. Set env:

   ```bash
   MCPAY_BACKEND=supabase
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

5. Restart the app. `getRepository()` will now return `SupabaseRepository`.

## Migrations

Numbered SQL files under `migrations/`. Apply in order. No tooling required for
v0 — the schema is small. If you need versioning, switch to `dbmate`,
`sqitch`, or Supabase's built-in migration system.

## Notes

- The service-role key bypasses RLS. **Never expose it to the browser.** All
  routes that use it should run server-side only (`route.ts` files, server
  components, server actions).
- `customer_keys.consumed_this_month_usd` is bumped via the
  `increment_customer_consumption` RPC for atomicity. A nightly cron should
  reset it on the 1st of each month — out of scope for v0.
- `api_secret` is stored in plaintext for the MVP. Hash it (argon2) before
  going live, and show it once at creation.
