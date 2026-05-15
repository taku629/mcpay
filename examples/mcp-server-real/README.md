# mcpay-example-real

A real MCP server (`@modelcontextprotocol/sdk` `Server` + `StdioServerTransport`)
monetized via `@mcpay/sdk`. Use this as a reference when wrapping your own.

## Build & run

```bash
npm install
npm run build
node dist/server.js   # talks JSON-RPC over stdio
```

For a quick smoke test (no MCP client needed), pipe a `tools/list` request:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/server.js
```

You should see the three tools come back as JSON.

## Plug into Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcpay-demo": {
      "command": "node",
      "args": ["/abs/path/to/examples/mcp-server-real/dist/server.js"],
      "env": {
        "MCPAY_PROJECT_ID":  "prj_demo",
        "MCPAY_API_SECRET":  "sk_test_demo_only_do_not_use_in_prod",
        "MCPAY_ENDPOINT":    "http://localhost:3000",
        "MCPAY_KEY":         "mcpay_live_demo_key_abc123"
      }
    }
  }
}
```

`MCPAY_PROJECT_ID` + `MCPAY_API_SECRET` are the *server author's* credentials.
`MCPAY_KEY` is the *customer's* key — in a real deployment customers would set
that themselves on their side of the config.

Start the MCPay dashboard (`packages/web`) before launching the client so the
verify/usage endpoints respond. With the seeded demo data above, calls land in
the dashboard's "Recent usage" widget.

## Pricing in this example

| Tool         | Price                  |
| ------------ | ---------------------- |
| `search_web` | $0.01 / call           |
| `summarize`  | $0.002 / 1k tokens     |
| `ping`       | free                   |
