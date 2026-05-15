# Security Policy

## Reporting a vulnerability

If you discover a security issue in MCPay, please **do not open a public
GitHub issue**. Instead, send a private report:

- Email: `karisutefin73@gmail.com` (replace with a project alias before launch)
- Subject prefix: `[mcpay-security]`

Please include:

- A description of the issue and the conditions under which it triggers
- The smallest reproduction you can share (a curl snippet, a short script, etc.)
- Your assessment of the impact (e.g., auth bypass, data exposure, billing
  manipulation)
- Whether you'd like to be credited in the fix's release notes

We aim to acknowledge receipt within **48 hours** and ship a fix or mitigation
within **7 days** for critical issues.

## Scope

In scope:

- `@mcpay/sdk` (TypeScript) and `mcpay` (Python) — anything that could cause
  the SDK to leak secrets, bypass billing, or accept forged usage events.
- The MCPay dashboard (`packages/web`) — auth, Stripe, API routes, RLS policies.
- The Postgres schema and the `increment_customer_consumption` RPC.

Out of scope:

- Third-party services we depend on (Stripe, Supabase, Upstash, Vercel) —
  report those to the vendors directly.
- Issues that require physical access to a developer's machine.
- Self-hosted misconfigurations (e.g., leaking `SUPABASE_SERVICE_ROLE_KEY` to
  the browser). Documentation gaps are still fair game.

## Things we already know

These are documented, not bugs:

- The seed entry in `lib/repository.memory.ts` uses a plaintext `apiSecret`.
  Verification still works because `verifyApiSecret` falls back to a
  constant-time string compare for non-hashed entries. Real records are
  scrypt-hashed.
- `AUTH_MODE=demo` is wide open by design — it exists so the MVP runs without
  Supabase credentials. Set `AUTH_MODE=supabase` and supply
  `SUPABASE_URL` + `SUPABASE_JWT_SECRET` (or rely on the JWKS endpoint) before
  exposing the dashboard to the public internet.
- `failOpen: true` on the SDK lets paid calls through if the MCPay backend is
  unreachable. Off in prod.

## Disclosure timeline (target)

| Day | Event                                                            |
| --- | ---------------------------------------------------------------- |
| 0   | Report received, ack within 48h                                  |
| 1-7 | Investigation + fix in a private branch                          |
| 7+  | Patched release; reporter receives credit if desired             |
| 30  | Public write-up if the issue had broad impact (with their consent) |

Thanks for keeping the ecosystem safe.
