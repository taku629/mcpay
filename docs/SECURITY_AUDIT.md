# Security audit (2026-09-21)

## Scope and repository baseline

This review examined `README.md`, `STATUS.md`, `SECURITY.md`, `package.json`, architecture documentation, both SDKs, every API route, the SQL schema/migrations, and the existing tests. Before changes, branch `work` was clean (`git status --short --branch`), version was `0.1.0`, and the repository contained 35 historically documented tests. Historical claims were not treated as evidence.

No live credentials, Stripe endpoints, production infrastructure, or paid APIs were used.

## Confirmed findings and remediation

### Critical: non-atomic, unauthorised usage charging (fixed)

`POST /api/usage` previously incremented a key and inserted an event in separate operations. It did not establish that the key belonged to the submitted project, was unrevoked, or remained within budget. A failed insert produced charged consumption without an auditable event; a retry charged again; concurrent requests could overspend.

The route now requires a bounded positive finite amount, valid non-negative token count, and stable `req_…` idempotency key. Billing time is server receipt time. Repository ingestion performs project/key/revocation/budget checks and the insert plus increment as one operation. The Postgres RPC locks the key row, rejects duplicates, and runs in one transaction. Execution is revoked from public/anonymous/authenticated roles and granted only to `service_role`.

### High: rate limiting can be bypassed across instances (open)

The limiter is process-local. An attacker can distribute traffic across serverless instances or cause cold starts. Production must use a shared store (for example Upstash/Redis), key limits by authenticated project and a privacy-preserving client discriminator, and fail closed for billing writes.

### High: checkout webhook idempotency is incomplete (open)

Stripe signatures are correctly checked against the raw request body. However, `checkout.session.completed` does not persist the Stripe event/session id. Re-delivery or concurrency can mint multiple customer keys; the source comment claiming session idempotency is inaccurate. Add a `stripe_webhook_events` state table with a unique event id, processing lease, and completed state in a migration before launch. Do not simply mark an event complete before side effects.

### Medium: service-role blast radius (mitigated, residual)

Server repository calls bypass RLS by design. Route authorization is therefore the boundary. The new security-definer usage function fixes `search_path`, validates ownership, and denies non-service execution. Manual Supabase policy tests are still required.

### Medium: API key storage and exposure (open)

Customer keys remain primary-key plaintext in Postgres. A database read compromise exposes active credentials. Migrate to a non-secret prefix/key id plus a slow hash or keyed HMAC lookup; this is a breaking data migration and was not silently introduced.

### Medium: project-wide limiter allows noisy-neighbor denial (open)

Both verification and usage limits are keyed only by caller-supplied project id before secret verification. A remote party can exhaust a known project's bucket. Authenticate first or isolate an inexpensive pre-auth IP bucket from the authenticated project bucket.

## RLS review

Author-facing select policies constrain projects, pricing, keys, usage, and invoice runs through `auth.uid()`. Customers have no direct table policy. The service role bypasses all policies, so every service route needs explicit tenant checks. A local Postgres/Supabase instance was unavailable; policy behavior and grants require manual integration verification.

## Required manual verification

1. Apply migrations through `0003_atomic_usage.sql` to a staging clone and inspect grants with `\df+ ingest_usage_event`.
2. Run two concurrent transactions against one near-budget key; exactly one must return `recorded`.
3. Confirm `anon` and `authenticated` cannot invoke the RPC, while `service_role` can.
4. Replay a signed Stripe fixture concurrently; expect duplicate keys until webhook event-state idempotency is implemented.
5. Rotate real project, Supabase, cron, and Stripe webhook secrets before launch; ensure `AUTH_MODE=supabase` and `MCPAY_BACKEND=supabase`.
