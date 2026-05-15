# Contributing to MCPay

Thanks for your interest. Patches, bug reports, and design feedback are all
welcome.

## Quick start

```bash
git clone https://github.com/taku629/mcpay.git
cd mcpay
npm install                          # installs all workspaces
npm run build:sdk                    # builds @mcpay/sdk
npm run dev:web                      # http://localhost:3000

# Python SDK
cd packages/sdk-python
python -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/pytest
```

## Repo layout

- `packages/sdk-ts` — `@mcpay/sdk`, the TypeScript SDK.
- `packages/sdk-python` — `mcpay`, the Python SDK (wire-compatible).
- `packages/web` — Next.js dashboard + API routes + DB schema.
- `examples/basic-server` — minimal SDK demo.
- `examples/mcp-server-real` — `@modelcontextprotocol/sdk` server using the SDK.

## Branch and commit conventions

- Branch from `main` directly. We don't use long-lived release branches yet.
- One topic per branch. Keep PRs scoped — if it touches both an SDK and the
  dashboard, that's two PRs (or one with a clear "this is two changes" note).
- Commit messages: lowercase prefix (`feat:`, `fix:`, `docs:`, `refactor:`,
  `test:`, `chore:`), then a short subject. Body explains the why, not the what.

## Tests

We run three suites in CI (see `.github/workflows/ci.yml`):

```bash
# TS SDK
cd packages/sdk-ts && npx tsc && node --test dist/meter.test.js

# Web app
cd packages/web && npx tsc --noEmit
cd packages/web/lib && node --test *.test.mjs

# Python SDK
cd packages/sdk-python && .venv/bin/pytest -q
```

All four should pass before you open a PR.

## Adding a new pricing model

Pricing is centralised in three places. Update them together or the type
system will catch you:

1. `packages/sdk-ts/src/types.ts` — `ToolPricing` union.
2. `packages/sdk-ts/src/meter.ts` — `priceCall` switch.
3. `packages/sdk-python/mcpay/types.py` + `meter.py` — same change, mirrored.
4. `packages/web/db/schema.sql` — `pricing_rules.type` check constraint.

## Adding a new repository operation

If you add a method to the `Repository` interface in
`packages/web/lib/repository.ts`, implement it in both `repository.memory.ts`
and `repository.supabase.ts`. The Supabase one usually maps onto a single
Postgres query or RPC.

## Style

- TypeScript: `strict: true`. No `any` in shipped code (test files can be
  looser). Prefer the `unknown` type and narrow.
- Comments: only the kind that explain *why*. No `// adds two numbers` above
  `a + b`.
- File names: kebab-case for `.ts`, lowercase for routes.

## Releases

See `.github/workflows/README.md` for the publishing flow. The short version:

- Bump `packages/sdk-ts/package.json` version, tag `sdk-ts-v…`, push tag.
- Bump `packages/sdk-python/pyproject.toml` version, tag `sdk-python-v…`, push.

## Code of conduct

Be kind. Disagree about the code, not the person. We don't have a long-form CoC
yet; if behavior comes up that needs one, we'll write one.

## Questions

Open an issue with the `question` label, or ping `@taku629` on GitHub.
