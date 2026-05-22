// A *real* MCP server using @modelcontextprotocol/sdk, monetized via MCPay
// with the 3-line drop-in `wrapMCPServer`.
//
// Start it under Claude Desktop / Cursor by adding to your MCP config:
//
//   {
//     "mcpServers": {
//       "mcpay-demo": {
//         "command": "node",
//         "args": ["/abs/path/to/dist/server.js"],
//         "env": {
//           "MCPAY_PROJECT_ID":  "prj_demo",
//           "MCPAY_API_SECRET":  "sk_test_demo_only_do_not_use_in_prod",
//           "MCPAY_ENDPOINT":    "http://localhost:3000"
//         }
//       }
//     }
//   }
//
// Customers paste their MCPay key (mcpay_live_…) into the call arguments as
// `_mcpayKey`, or into the request `_meta` field as `"x-mcpay-key"`. Both are
// picked up automatically by the default key extractor.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { wrapMCPServer } from "@mcpay/sdk";

const server = wrapMCPServer(
  new Server({ name: "mcpay-demo", version: "0.1.0" }, { capabilities: { tools: {} } }),
  {
    projectId: process.env.MCPAY_PROJECT_ID ?? "prj_demo",
    apiSecret: process.env.MCPAY_API_SECRET ?? "sk_test_demo_only_do_not_use_in_prod",
    endpoint: process.env.MCPAY_ENDPOINT ?? "http://localhost:3000",
    pricing: {
      search_web: { type: "per_call", amountUsd: 0.01 },
      summarize:  { type: "per_token", amountUsdPer1k: 0.002 },
      ping:       { type: "free" },
    },
    // Claude Desktop & most stdio MCP clients can't yet inject per-call
    // headers, so we also accept the customer's key from a process env var.
    extractApiKey: (req) => {
      const args = req.params.arguments as Record<string, unknown> | undefined;
      if (args && typeof args._mcpayKey === "string") return args._mcpayKey;
      const meta = req.params._meta;
      if (meta && typeof meta["x-mcpay-key"] === "string") return meta["x-mcpay-key"] as string;
      return process.env.MCPAY_KEY;
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_web",
      description: "Pretend-search the web. ($0.01 / call)",
      inputSchema: {
        type: "object",
        properties: { q: { type: "string" } },
        required: ["q"],
      },
    },
    {
      name: "summarize",
      description: "Summarize a long blob of text. ($0.002 / 1k tokens)",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
    {
      name: "ping",
      description: "Health check. Free.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

// No MCPay boilerplate inside the handler — wrapMCPServer takes care of key
// verification, budget checks, and usage metering for every paid tool.
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const toolName = req.params.name;
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;

  switch (toolName) {
    case "search_web":
      return {
        content: [{ type: "text", text: `pretend search results for: ${args.q}` }],
      };
    case "summarize": {
      const text = String(args.text ?? "");
      return {
        content: [{ type: "text", text: text.slice(0, 200) }],
        // _meta.tokens is read by the default `extractTokens` for per_token billing.
        _meta: { tokens: Math.ceil(text.length / 4) },
      };
    }
    case "ping":
      return { content: [{ type: "text", text: "pong" }] };
    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("mcpay-demo MCP server ready (stdio)");
