// A *real* MCP server using @modelcontextprotocol/sdk, monetized via MCPay.
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
// Customers paste *their* MCPay key (mcpay_live_…) into a header named
// x-mcpay-key — many MCP clients support arbitrary header injection per server.
// For dev we read it from the MCPAY_KEY env var if the header is absent.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createMCPayMiddleware, MCPayError } from "@mcpay/sdk";

const mcpay = createMCPayMiddleware<unknown>({
  projectId: process.env.MCPAY_PROJECT_ID ?? "prj_demo",
  apiSecret: process.env.MCPAY_API_SECRET ?? "sk_test_demo_only_do_not_use_in_prod",
  endpoint: process.env.MCPAY_ENDPOINT ?? "http://localhost:3000",
  pricing: {
    search_web: { type: "per_call", amountUsd: 0.01 },
    summarize:  { type: "per_token", amountUsdPer1k: 0.002 },
    ping:       { type: "free" },
  },
});

const server = new Server(
  { name: "mcpay-demo", version: "0.1.0" },
  { capabilities: { tools: {} } },
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

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const toolName = req.params.name;
  // MCP clients don't have a standard for "auth headers", so we look in two
  // places: arguments._mcpayKey (explicit pass-through) and the MCPAY_KEY env
  // var (dev convenience). Real prod deployments would standardise on one.
  const argsObject = (req.params.arguments ?? {}) as Record<string, unknown>;
  const apiKey =
    (typeof argsObject._mcpayKey === "string" ? argsObject._mcpayKey : undefined) ??
    process.env.MCPAY_KEY;

  try {
    const result = await mcpay({ toolName, apiKey }, async () => {
      switch (toolName) {
        case "search_web":
          return {
            content: [
              { type: "text", text: `pretend search results for: ${argsObject.q}` },
            ],
          };
        case "summarize": {
          const text = String(argsObject.text ?? "");
          return {
            content: [{ type: "text", text: text.slice(0, 200) }],
            _meta: { tokens: Math.ceil(text.length / 4) },
          };
        }
        case "ping":
          return { content: [{ type: "text", text: "pong" }] };
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    });

    return result as { content: Array<{ type: string; text: string }> };
  } catch (err) {
    if (err instanceof MCPayError) {
      return {
        content: [{ type: "text", text: `[mcpay/${err.code}] ${err.message}` }],
        isError: true,
      };
    }
    throw err;
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

// stderr is the conventional MCP server log channel; stdout is reserved for
// JSON-RPC framing.
console.error("mcpay-demo MCP server ready (stdio)");
