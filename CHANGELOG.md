# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
