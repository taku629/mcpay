# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **`wrapMCPServer` now actually intercepts tool calls.** Previously it
  attached a `__mcpay` marker but left `setRequestHandler` untouched, so the
  documented "3-line drop-in" did not gate or meter tool calls. The wrapper
  now monkey-patches `setRequestHandler` so any handler registered against the
  `CallTool` schema is automatically wrapped in the MCPay middleware.
- `examples/mcp-server-real` rewritten to use `wrapMCPServer` directly, with
  no per-tool MCPay boilerplate in the handler.

### Added

- `MCPayConfig.extractApiKey` — override how the customer's MCPay key is
  pulled from a CallTool request. Default reads
  `params.arguments._mcpayKey` then `params._meta["x-mcpay-key"]`.
- `MCPayConfig.extractTokens` — derive token counts for `per_token` pricing
  from the tool result. Default reads `result._meta.tokens`.
- `CallToolRequestLike` / `CallToolResultLike` exported types.
- Tests covering free pass-through, missing-key rejection, unrelated-schema
  pass-through, and custom `extractApiKey`.

- `/marketplace` public index page — discovery surface listing every project
  with a connected Stripe account, ranked by 30-day gross revenue. Each card
  links to the existing `/marketplace/[projectId]` checkout page. Empty-state
  explains that Stripe Connect is the gating step. Landing + dashboard +
  pricing navs gain a "Marketplace" link; the landing hero's secondary CTA is
  now "Browse servers".

- Monthly usage billing:
  - `/api/cron/aggregate-invoices` rewritten. Runs on the 1st of each month
    and bills the *previous* calendar month: one finalized invoice per
    (project, customer) on the project's connected Stripe account, with
    `collection_method: send_invoice` so Stripe emails a hosted invoice URL.
  - `invoice_runs` table + `Repository.getInvoiceRun` / `recordInvoiceRun`
    give us PK-level idempotency. Combined with Stripe idempotency keys, a
    re-run or retry can't double-bill.
  - `?month=YYYY-MM` query param lets ops backfill or re-trigger a window.
  - `vercel.json` gains the cron entries (00:00 reset, 03:00 aggregate, UTC).
  - Fixes the previous stub's `customer: key.customerId` bug — it was passing
    MCPay's internal customer id where Stripe expected a Stripe customer id.

- Real Supabase magic-link login (replaces the form stub):
  - `POST /api/auth/magic-link` triggers `/auth/v1/otp` via the anon key.
  - `/auth/callback` page extracts implicit-flow tokens from the URL hash.
  - `POST /api/auth/set-session` verifies the JWT and mints HttpOnly
    `sb-access-token` / `sb-refresh-token` cookies.
  - `GET|POST /api/auth/signout` clears the session.
  - Dashboard nav gains a "Sign out" link.
  - `lib/supabase-auth.ts` thin REST wrapper (`sendMagicLink`, `refreshSession`).
- AuthZ checks: `/api/stripe/connect/onboard` now requires the caller to own
  the project; `/api/billing/portal` checks the Stripe customer's email matches
  the authenticated user.
- `SUPABASE_ANON_KEY` env var (required when `AUTH_MODE=supabase`).

- Customer-facing checkout flow:
  - `/marketplace/[projectId]` public listing page.
  - `/api/checkout/start` creates a Stripe Checkout session (one-time prepaid).
  - `/checkout/success` confirmation page.
  - Webhook handler for `checkout.session.completed` mints an API key with the
    purchased budget via Repository upsert.
- `Repository.createProject`, `listProjectsByOwner`, `upsertCustomer`,
  `getCustomerById`, `getCustomerByStripeId`, `createCustomerKey`. Implemented
  in both memory and Supabase backends.
- `CustomerRecord` shape with `stripeCustomerId` mapping.
- `lib/api-key.ts` — high-entropy customer API-key generator.
- `examples/mcp-server-real` — `@modelcontextprotocol/sdk` Server +
  StdioServerTransport demo using the SDK.
- Unit tests for `rate-limit`, `cron`, and `repository` (in-memory contract).
  CI runs them via `node --test`.
- `SECURITY.md`, `CONTRIBUTING.md`, this `CHANGELOG.md`.

## [0.1.0] — 2026-05-15

### Added

- `@mcpay/sdk` TypeScript SDK (`wrapMCPServer`, `createMCPayMiddleware`).
- `mcpay` Python SDK (wire-compatible).
- Next.js 15 dashboard: landing, pricing, dashboard, FAQ, OG image, login stub.
- API routes: `/api/verify`, `/api/usage`, `/api/projects`,
  `/api/stripe/connect/onboard`, `/api/stripe/connect/callback`,
  `/api/stripe/webhook`, `/api/billing/portal`,
  `/api/cron/aggregate-invoices`, `/api/cron/reset-monthly`.
- Repository pattern with memory + Supabase implementations.
- Postgres schema + RLS policies + `increment_customer_consumption` RPC.
- JWT signature verification (HS256 + RS256/ES256 via JWKS).
- `scrypt`-based `api_secret` hashing.
- Sliding-window rate limiter with in-memory + Upstash REST backends.
- GitHub Actions: CI, npm publish (with provenance), PyPI publish (OIDC).
- Documentation: README, ARCHITECTURE, GETTING_STARTED, db/README,
  workflows/README, per-SDK READMEs.

[Unreleased]: https://github.com/taku629/mcpay/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/taku629/mcpay/releases/tag/v0.1.0
