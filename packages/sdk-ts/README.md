# @mcpay/sdk

TypeScript SDK for monetizing Model Context Protocol (MCP) servers via [MCPay](https://github.com/taku629/mcpay).

## Install

```bash
npm install @mcpay/sdk
```

## Usage

### High-level: wrap an existing MCP server

`wrapMCPServer` monkey-patches `setRequestHandler` so any handler you register
for the `CallTool` schema is automatically gated and metered. Free tools pass
through untouched. Customer keys land back to the caller as a structured
`{ isError: true, content: [...] }` payload following MCP conventions.

```ts
import { wrapMCPServer } from "@mcpay/sdk";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = wrapMCPServer(
  new Server({ name: "my-mcp", version: "0.1.0" }, { capabilities: { tools: {} } }),
  {
    projectId: process.env.MCPAY_PROJECT_ID!,
    apiSecret: process.env.MCPAY_API_SECRET!,
    pricing: {
      search_web:     { type: "per_call",  amountUsd: 0.01 },
      summarize_text: { type: "per_token", amountUsdPer1k: 0.002 },
      ping:           { type: "free" },
    },
  },
);

// Your handler stays free of MCPay boilerplate.
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  // ... your real implementation ...
});
```

**Where does the customer's key come from?** By default the SDK looks at
`params.arguments._mcpayKey`, then `params._meta["x-mcpay-key"]`. Override
with `extractApiKey` if you want to read from headers or a custom convention.

**Token counts for `per_token` pricing** are read from the tool result's
`_meta.tokens` field unless you supply `extractTokens`.

### Low-level: middleware around your own handler

If you're not using `@modelcontextprotocol/sdk` directly, use the middleware:

```ts
import { createMCPayMiddleware } from "@mcpay/sdk";

const mcpay = createMCPayMiddleware({
  projectId: process.env.MCPAY_PROJECT_ID!,
  apiSecret: process.env.MCPAY_API_SECRET!,
  pricing: { hello: { type: "per_call", amountUsd: 0.001 } },
});

async function handleToolCall(toolName: string, apiKey: string, args: unknown) {
  return mcpay({ toolName, apiKey }, async () => {
    // your real implementation here
    return { ok: true };
  });
}
```

## Pricing models

| `type`               | Notes                                            |
| -------------------- | ------------------------------------------------ |
| `free`               | No charge. No API key required.                  |
| `per_call`           | Flat charge per invocation.                      |
| `per_token`          | Bill by token count (you supply `tokens`).       |
| `monthly_unlimited`  | Unlimited usage gated by an active subscription. |

## Config options

- `projectId` — Your MCPay project ID (dashboard).
- `apiSecret` — Server-side secret. **Never ship to clients.**
- `pricing` — Map of tool name → pricing rule.
- `endpoint` — Defaults to `https://api.mcpay.dev`. Override for self-hosted.
- `failOpen` — If true, network failures during key verification pass-through. Use only for dev.
- `extractApiKey(req)` — Customise where the customer's MCPay key is pulled from.
- `extractTokens(toolName, req, result)` — Customise token counting for `per_token` pricing.

## License

MIT
