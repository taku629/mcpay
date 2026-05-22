# Getting started

This walks you through running MCPay locally and adding billing to an MCP
server.

## 0. Prerequisites

- Node.js 22+
- npm 10+
- (Eventually) Postgres + a Stripe test account. The MVP ships without these so
  you can poke around.

## 1. Clone and install

```bash
git clone https://github.com/taku629/mcpay.git
cd mcpay
npm install
npm run build:sdk
```

## 2. Boot the dashboard

```bash
npm run dev:web
# → http://localhost:3000
```

You should see the landing page. `/dashboard` shows mock data. `/pricing` shows
the platform-fee tiers.

The MVP backend is in-memory; it seeds one demo project:

- `projectId`: `prj_demo`
- `apiSecret`: `sk_test_demo_only_do_not_use_in_prod`
- demo customer key: `mcpay_live_demo_key_abc123` with $10/mo budget

## 3. Run the example MCP server

In a second terminal:

```bash
cd examples/basic-server
MCPAY_PROJECT_ID=prj_demo \
MCPAY_API_SECRET=sk_test_demo_only_do_not_use_in_prod \
MCPAY_ENDPOINT=http://localhost:3000 \
node --experimental-strip-types index.ts
```

You'll see three calls: a free `ping`, a paid `search_web`, and a `search_web`
that fails because no key was passed.

## 4. Add MCPay to your own MCP server

Install the SDK:

```bash
npm install @mcpay/sdk
```

Wrap your server *before* registering handlers — `wrapMCPServer` works by
intercepting `setRequestHandler` calls:

```ts
import { wrapMCPServer } from "@mcpay/sdk";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = wrapMCPServer(
  new Server({ name: "your-mcp", version: "0.1.0" }, { capabilities: { tools: {} } }),
  {
    projectId: process.env.MCPAY_PROJECT_ID!,
    apiSecret: process.env.MCPAY_API_SECRET!,
    pricing: {
      your_tool: { type: "per_call", amountUsd: 0.01 },
    },
  },
);

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  // your tool dispatch — no MCPay boilerplate inside.
});
```

Customers pass their MCPay key in one of:
- `params.arguments._mcpayKey` (works with every MCP client today)
- `params._meta["x-mcpay-key"]` (forward-looking, once clients support it)
- Anywhere you like, via the `extractApiKey` config hook.

If you aren't using `@modelcontextprotocol/sdk` directly, drop down to the
middleware:

```ts
import { createMCPayMiddleware } from "@mcpay/sdk";

const mcpay = createMCPayMiddleware({ ... });

async function handle(toolName, apiKey, args) {
  return mcpay({ toolName, apiKey }, () => yourRealHandler(args));
}
```

## 5. Enable real login (Supabase Auth)

Demo mode ships with an always-on `demo@mcpay.dev` user. To enable real email
magic-link login:

1. In your Supabase project, add `${NEXT_PUBLIC_APP_URL}/auth/callback` to
   **Authentication → URL Configuration → Redirect URLs**.
2. In `packages/web/.env`, set:

   ```
   AUTH_MODE=supabase
   SUPABASE_URL=https://<your-project>.supabase.co
   SUPABASE_ANON_KEY=<anon key>
   # Only for legacy HS256 projects; modern projects use JWKS automatically.
   SUPABASE_JWT_SECRET=
   ```

3. Restart `npm run dev:web`. `/login` now sends a real magic link, and
   `middleware.ts` redirects unauthenticated requests for `/dashboard` and
   `/api/billing/*` to `/login`.

The flow:

- `POST /api/auth/magic-link` calls Supabase `/auth/v1/otp`.
- The email link returns to `/auth/callback`, which extracts tokens from the
  URL hash and posts them to `POST /api/auth/set-session`.
- `set-session` verifies the JWT (HS256 via `SUPABASE_JWT_SECRET` or RS256/ES256
  via JWKS) and sets `sb-access-token` + `sb-refresh-token` as HttpOnly cookies.
- `GET /api/auth/signout` clears them.

## 6. Monthly usage billing

Two scheduled jobs run on the 1st of each calendar month (UTC):

| Cron path                       | Schedule       | What it does                                                                                   |
| ------------------------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `/api/cron/reset-monthly`       | `0 0 1 * *`    | Zeroes `consumed_this_month_usd` on every customer key for the new month.                      |
| `/api/cron/aggregate-invoices`  | `0 3 1 * *`    | Bills the *previous* calendar month's usage: one finalized invoice per (project, customer).    |

Both are wired up in `packages/web/vercel.json`. To enable them you need:

```
CRON_SECRET=<random>
```

On Vercel this is sent automatically as `Authorization: Bearer ${CRON_SECRET}`.
Locally you can force a run with:

```bash
curl -X POST "http://localhost:3000/api/cron/aggregate-invoices?secret=$CRON_SECRET"
# Re-run a specific month (safe — idempotent via the invoice_runs table):
curl -X POST "http://localhost:3000/api/cron/aggregate-invoices?secret=$CRON_SECRET&month=2026-04"
```

Each invoice is created on the project's connected Stripe account
(`stripeAccount: project.stripe_account_id`) with
`collection_method: send_invoice`, so Stripe emails the customer a hosted
invoice URL — no saved payment method required.

Idempotency comes from two places: the `invoice_runs` table (PK on
`project_id, customer_id, month_key`) and per-call Stripe idempotency keys, so
a retried or re-run job will not double-bill.

## 7. Go to production

Before launch you'll want to swap the in-memory store for real infra:

- Set `MCPAY_BACKEND=supabase` so routes use `SupabaseRepository` (requires
  `SUPABASE_SERVICE_ROLE_KEY`).
- Wire up the Stripe webhook route (`app/api/stripe/webhook/route.ts`) with
  your `STRIPE_WEBHOOK_SECRET` and verify signatures.
- Set up Stripe Connect Express onboarding for your authors.
- Enable Supabase Auth as described in step 5.

The schema in [`ARCHITECTURE.md`](ARCHITECTURE.md) is a good starting point.

## Troubleshooting

**SDK throws `missing_api_key` on every paid call** — make sure your MCP server
is reading the customer's key (e.g. from the `x-mcpay-key` header) and passing
it as `invocation.apiKey`. The SDK doesn't pull it from anywhere automatically.

**`verify` returns `bad_secret`** — your `MCPAY_API_SECRET` env var doesn't
match the secret on file for that project. Rotate it in the dashboard if you
lost the original.
