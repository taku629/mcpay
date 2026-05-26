# I built a Stripe cash register for the 11,000+ MCP servers nobody is monetizing

> Long-form English launch article. Cross-post target: **dev.to**, **Hashnode**,
> personal blog. Mirror the Zenn (Japanese) version in `zenn-article.md`.
> Publish *after* Stripe live keys + `api.mcpay.dev` DNS are in.

---

## TL;DR

- I built **MCPay**: a 3-line SDK + dashboard that adds per-tool pricing to any
  Model Context Protocol server. Stripe-backed, fiat payouts via Stripe Connect.
- No crypto. No platform lock-in. Drop it into your existing TS/Python MCP
  server, set per-tool prices, get paid.
- **Platform fee: 0% under $1,000 GMV/month.** We don't take a cut until you're
  actually making money.
- v0.1 is MIT-licensed: https://github.com/taku629/mcpay

---

## Why I built it

There are 11,000+ MCP servers public as of 2026. LinearMCP, NotionMCP, and the
other big ones have homegrown billing. The other 99% — the long tail of
single-author servers that do something useful and specific — are giving away
compute for free because the cost of building billing infrastructure is higher
than the first dollar of revenue.

Concretely, to charge for a single MCP tool call, an author has to wire up:

- Per-customer API key issuance
- Key verification on every call without adding latency
- Per-call metering with idempotency
- Monthly aggregation and invoice generation
- Stripe Connect onboarding for payouts
- Rate limiting that survives traffic spikes

The existing alternatives — x402, Lightning, USDC, Apify — either route through
crypto (authors want USD in their bank, not USDC in a wallet) or require a full
platform migration. None of them solves the simple ask: "I have an MCP server
in TS. I want to charge $0.01 per call. I want the money to land in my Stripe
account. Let me ship this in an afternoon."

MCPay is that afternoon.

## The 3-line drop-in (and why the first version was a lie)

The README promises:

```ts
const server = wrapMCPServer(
  new Server({ name: "my-mcp", version: "0.1.0" }, { capabilities: { tools: {} } }),
  {
    projectId: process.env.MCPAY_PROJECT_ID!,
    apiSecret: process.env.MCPAY_API_SECRET!,
    pricing: {
      search_web:     { type: "per_call", amountUsd: 0.01 },
      generate_image: { type: "per_call", amountUsd: 0.05 },
      ping:           { type: "free" },
    },
  },
);
```

The first version of `wrapMCPServer` was a marketing copy lie:

```ts
// Before — looked like 3-line drop-in, was actually a no-op
export function wrapMCPServer(server, config) {
  server.__mcpay = { /* ... */ };  // just stamped a marker, did nothing
  return server;
}
```

Customers calling the tool were billed for **nothing**, because no handler was
actually intercepted. I caught this in production-readiness review on day 21
and shipped the real fix:

```ts
export function wrapMCPServer<S extends MinimalMCPServer>(
  server: S,
  config: MCPayConfig,
): S {
  const middleware = createMCPayMiddleware<unknown>(config);
  const original = server.setRequestHandler;
  const bound = original.bind(server);

  server.setRequestHandler = (schema, handler) => {
    const isCallTool = looksLikeCallToolSchema(schema);

    const wrapped = async (...args) => {
      const req = args[0];
      if (!isCallTool && !looksLikeCallToolRequest(req)) {
        return handler(...args);
      }

      const toolName = req.params.name;
      const apiKey = extractApiKey(req);

      try {
        return await middleware({ toolName, apiKey }, () => handler(...args));
      } catch (err) {
        if (err instanceof MCPayError) {
          return {
            content: [{ type: "text", text: `[mcpay/${err.code}] ${err.message}` }],
            isError: true,
          };
        }
        throw err;
      }
    };

    return bound(schema, wrapped);
  };

  return server;
}
```

Three design choices worth calling out:

1. **Detect the schema structurally, not by import.** Pulling in
   `CallToolRequestSchema` would force a dependency on `@modelcontextprotocol/sdk`.
   Instead we sniff `schema.shape.method.value === "tools/call"` so the SDK
   stays zero-dep.
2. **Pass-through everything that isn't `CallTool`.** `ListTools`, `ListPrompts`,
   resource handlers — untouched. We only meter the thing we charge for.
3. **MCPay errors are structured tool results, not throws.** `{ isError: true,
   content: [{ type: "text", text: "[mcpay/insufficient_budget] ..." }] }` so
   the client sees a real MCP response, not a connection drop.

## The customer-API-key handoff problem

This is the genuinely hard part and there is no clean answer yet.

MCP's official spec has no per-server authentication header. Clients
(Claude Desktop, Cursor, OpenAI's `mcp` client) don't yet support injecting
custom HTTP headers on a per-server basis. So how does a customer hand their
MCPay API key to a server they don't control?

| Approach | Compatibility | Verdict |
|---|---|---|
| `params.arguments._mcpayKey` | Every client, today | Default |
| `params._meta["x-mcpay-key"]` | Spec-compliant, waiting on adoption | Fallback |
| HTTP `Authorization` header | HTTP transport only | Optional hook |

MCPay tries A → B in order, and `extractApiKey(req)` is user-overridable for
custom transports. For the current Claude-Desktop-over-stdio reality, A is
the only thing that actually works.

This will change. The MCP working group has an open PR on per-server auth
headers; once it lands, B becomes the default and A becomes legacy.

## Architecture

```
MCP Client            MCP Server (yours)              MCPay API (ours)
   │                       │                              │
   │  CallTool {           │                              │
   │   _mcpayKey: ...   ───┤                              │
   │  }                    │                              │
   │                       │── verify(key) ──────────────►│
   │                       │◄──── ok, budget, customerId─│
   │                       │                              │
   │                       │── runYourTool() ─┐           │
   │                       │                  │           │
   │                       │◄─── result ──────┘           │
   │                       │── recordUsage(amount, ...)──►│  fire-and-forget
   │◄──── tool result ─────│                              │
                                                          │
                                                  Monthly cron:
                                                  - aggregate usage
                                                  - create Stripe invoice
                                                  - payout via Stripe Connect
```

The key-verify call is the only synchronous round-trip. Usage recording is
fire-and-forget with a local buffer so MCPay outages don't block tool calls.

## The economics question

A long-tail market where 99% of authors make under $1/month forces a hard
question: how do you set a take rate that (a) doesn't kill the early adopters,
(b) actually scales?

We landed here:

| Monthly GMV | Platform fee |
|---|---|
| $0–$1,000 | **0%** |
| $1,000–$10,000 | 10% |
| $10,000+ | 5% + invoiced enterprise |

Stripe's own fees (2.9% + $0.30) pass through to the customer.

For MCPay to be a business, we need the **mid-tail** — 500 to 1,000 authors
making $100–$10,000/month each. Not the top 100 (they have their own billing)
and not the bottom 10,000 (they aren't ready to charge). So the first-year
strategy is to manufacture a lot of small visible wins: "I put MCPay on my
weather-MCP and made $47 last month, hands-off." Ten of those, posted to
Show HN / dev.to / X, is the entire sales funnel.

## 19, first real OSS infra release

I'm a 19-year-old university student in Tokyo. MCPay is the third SaaS I've
shipped this year and the first one I'm pushing for a global outcome. Writing
Stripe Connect, JWT verification with JWKS rotation, and a sliding-window rate
limiter from scratch at 19 is not easy and I leaned heavily on Cursor, Claude
Code, and Codex CLI. The code is the code, though — review it, break it, file
issues.

Roadmap:

- [x] TS SDK (`@mcpay/sdk`) + Python SDK (`mcpay`, wire-compatible)
- [x] Stripe Connect Express onboarding
- [x] Stripe Checkout + signature-verified webhook
- [x] Supabase Auth (magic-link)
- [x] Public marketplace listing per project
- [ ] Stripe metered billing (usage-based invoicing)
- [ ] Per-author usage webhook (build your own dashboards)
- [ ] Contribute back to the official MCP servers repo

## Try it in 5 minutes

```bash
git clone https://github.com/taku629/mcpay
cd mcpay
npm install
npm run build:sdk
npm run dev:web   # → http://localhost:3000

# in another terminal
cd examples/mcp-server-real
npm install
npm run build
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/server.js
```

If `tools/list` returns `search_web`, `summarize`, and `ping` — you're in.

Tough reviews welcome. Honest PRs more welcome.

→ https://github.com/taku629/mcpay
