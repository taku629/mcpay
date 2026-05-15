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

Wrap your server:

```ts
import { wrapMCPServer } from "@mcpay/sdk";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

const server = new Server({ name: "your-mcp", version: "0.1.0" });
// ... register tools ...

export default wrapMCPServer(server, {
  projectId: process.env.MCPAY_PROJECT_ID!,
  apiSecret: process.env.MCPAY_API_SECRET!,
  pricing: {
    your_tool: { type: "per_call", amountUsd: 0.01 },
  },
});
```

If you aren't using `@modelcontextprotocol/sdk` directly, drop down to the
middleware:

```ts
import { createMCPayMiddleware } from "@mcpay/sdk";

const mcpay = createMCPayMiddleware({ ... });

async function handle(toolName, apiKey, args) {
  return mcpay({ toolName, apiKey }, () => yourRealHandler(args));
}
```

## 5. Go to production

Before launch you'll want to swap the in-memory store for real infra:

- Replace `packages/web/lib/store.ts` with a Postgres-backed implementation
  (Supabase works well).
- Wire up the Stripe webhook route (`app/api/stripe/webhook/route.ts`) with
  your `STRIPE_WEBHOOK_SECRET` and verify signatures.
- Set up Stripe Connect Express onboarding for your authors.
- Add auth (Supabase Auth, Clerk, or NextAuth) gating `/dashboard`.

The schema in [`ARCHITECTURE.md`](ARCHITECTURE.md) is a good starting point.

## Troubleshooting

**SDK throws `missing_api_key` on every paid call** — make sure your MCP server
is reading the customer's key (e.g. from the `x-mcpay-key` header) and passing
it as `invocation.apiKey`. The SDK doesn't pull it from anywhere automatically.

**`verify` returns `bad_secret`** — your `MCPAY_API_SECRET` env var doesn't
match the secret on file for that project. Rotate it in the dashboard if you
lost the original.
