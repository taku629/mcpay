# mcpay-example-basic

A minimal example showing how to wrap tool handlers with the MCPay SDK.

This is **not** a real `@modelcontextprotocol/sdk` Server — it's a tiny dispatch
loop that calls the same `createMCPayMiddleware` you'd use in a real server. The
goal is to keep the moving parts visible.

## Run

1. Start the dashboard locally (`packages/web`) so the verify/usage endpoints
   exist:

   ```bash
   cd ../../packages/web
   npm install
   npm run dev
   ```

2. In another terminal, run the example:

   ```bash
   cd examples/basic-server
   MCPAY_PROJECT_ID=prj_demo \
   MCPAY_API_SECRET=sk_test_demo_only_do_not_use_in_prod \
   MCPAY_ENDPOINT=http://localhost:3000 \
   node --experimental-strip-types index.ts
   ```

You should see:

- `ping` (free) succeeds with no API key.
- `search_web` (paid) succeeds when the demo customer key is provided.
- `search_web` without a key is rejected.

## Wire it into a real MCP server

Replace the `dispatch` loop with your `@modelcontextprotocol/sdk` request
handler. The middleware shape is the same: pass `{ toolName, apiKey }` and the
real handler, MCPay does the rest.
