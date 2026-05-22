# Launch checklist

Pre-publish gate. Walk through top to bottom. **Do not publish any of
`show-hn.md`, `twitter-thread.md`, `zenn-article.md` until every checkbox in
"Blocking" is green.**

## Blocking — must be done before any external link goes live

- [ ] DNS for `api.mcpay.dev` (or whatever production endpoint) pointing at
      production Next.js deployment.
- [ ] `STRIPE_SECRET_KEY` is a **live** key, not test.
- [ ] `STRIPE_WEBHOOK_SECRET` matches the live endpoint configured in Stripe
      Dashboard → Developers → Webhooks.
- [ ] Stripe Connect production application approved + Express onboarding URL
      whitelisted.
- [ ] Supabase production project. RLS policies applied from
      `packages/web/db/schema.sql`. Service role key is **not** committed.
- [ ] `SUPABASE_ANON_KEY` set on the deploy.
- [ ] Upstash Redis (or equivalent) wired for sliding-window rate limit.
- [ ] `AUTH_MODE=supabase` in production (not `demo`).
- [ ] `prj_demo` seed removed from production database.
- [ ] Cron jobs (`/api/cron/aggregate-invoices`, `/api/cron/reset-monthly`)
      scheduled (Vercel Cron, Upstash Schedule, or whatever).
- [ ] `/api/health` returns 200.
- [ ] Walk through one full real flow end-to-end with a personal test
      account:
      1. Author signs up via magic link.
      2. Author creates a project, copies `MCPAY_PROJECT_ID` and
         `MCPAY_API_SECRET`.
      3. Author connects Stripe Connect Express (test charge first).
      4. Customer visits `/marketplace/<projectId>`, top-up via Stripe
         Checkout.
      5. Customer key works against the example MCP server in
         `examples/mcp-server-real`.
      6. Recorded usage appears in author's dashboard within 5 seconds.
      7. End-of-month aggregate invoice generated correctly (run the cron
         manually once).
- [ ] Stripe payout to the author's connected account lands in test bank.

## Soft-blocking — should be done

- [ ] Screenshot of a real $0.05 transaction on the author dashboard
      (replace the placeholder in `zenn-article.md`).
- [ ] OG image (`packages/web/app/opengraph-image.tsx`) renders with the
      latest copy.
- [ ] `SECURITY.md` lists a real disclosure address (not `taku629@example.com`).
- [ ] CHANGELOG `[Unreleased]` section moved to a `[0.2.0]` heading and
      dated.

## Day-of-launch sequence

1. **Tue or Wed, 09:30 ET**: post Show HN (see `show-hn.md`).
2. **+30 min**: post EN Twitter thread (see `twitter-thread.md`).
3. **+3 hours** (≈ 23:00 JST): post Zenn article (see `zenn-article.md`).
4. **+4 hours** (≈ 00:00 JST): post JP Twitter thread.
5. Stay online for replies for at least 6 hours after the Show HN post.
6. Pre-prepared replies to the 3 most likely critical comments are in the
   "First-comment tactics" section of `show-hn.md`.

## Failure modes to watch

- **Stripe webhook delivery fails silently** → /api/stripe/webhook returns
  500. Monitor the Stripe Dashboard webhook delivery log for the first 24h.
- **Rate limit too tight** under HN traffic → /api/verify rejects legit
  customers. Have a kill switch (env var) to disable rate limit at the
  middleware layer.
- **Supabase free tier connection limit** → 500s on key verify. Pre-scale or
  bring your own pg pooler.
