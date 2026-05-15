// Example: a tiny stand-in for an MCP server. Replace the dispatch loop below with
// the real @modelcontextprotocol/sdk Server once you wire this into your project.
//
// What this demonstrates:
//   1. createMCPayMiddleware wraps any async tool handler.
//   2. The middleware gates calls on a customer's MCPay API key.
//   3. Usage is metered to the MCPay backend.
//
// Run with:
//   MCPAY_PROJECT_ID=prj_demo \
//   MCPAY_API_SECRET=sk_test_demo_only_do_not_use_in_prod \
//   MCPAY_ENDPOINT=http://localhost:3000 \
//   node --experimental-strip-types index.ts

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

const tools: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  async search_web(args) {
    return { results: [`pretend search results for ${JSON.stringify(args.q)}`] };
  },
  async summarize(args) {
    const text = String(args.text ?? "");
    return { summary: text.slice(0, 80), tokens: Math.ceil(text.length / 4) };
  },
  async ping() {
    return { pong: true };
  },
};

async function dispatch(toolName: string, apiKey: string | undefined, args: Record<string, unknown>) {
  const handler = tools[toolName];
  if (!handler) throw new MCPayError(`Unknown tool: ${toolName}`, "unknown_tool");

  return mcpay({ toolName, apiKey }, async () => handler(args));
}

async function main() {
  console.log("\nMCPay basic example\n-------------------");

  console.log("[1] ping (free, no key):");
  console.log(await dispatch("ping", undefined, {}));

  console.log("\n[2] search_web (paid) with demo key:");
  console.log(
    await dispatch("search_web", "mcpay_live_demo_key_abc123", { q: "claude code" }),
  );

  console.log("\n[3] search_web without a key (should fail):");
  try {
    await dispatch("search_web", undefined, { q: "no key" });
  } catch (err) {
    console.log("  rejected as expected:", (err as Error).message);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
