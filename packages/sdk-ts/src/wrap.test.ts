import test from "node:test";
import assert from "node:assert/strict";
import { wrapMCPServer, MCPayError } from "./index.js";

interface FakeServer {
  setRequestHandler(schema: unknown, handler: (...args: unknown[]) => unknown): void;
  handlers: Map<unknown, (...args: unknown[]) => unknown>;
  [key: string]: unknown;
}

function makeFakeServer(): FakeServer {
  const handlers = new Map<unknown, (...args: unknown[]) => unknown>();
  const fake: FakeServer = {
    handlers,
    setRequestHandler(schema, handler) {
      handlers.set(schema, handler);
    },
  };
  return fake;
}

const CallToolSchema = { shape: { method: { value: "tools/call" } } };
const ListToolsSchema = { shape: { method: { value: "tools/list" } } };

test("free tools are not gated and not metered", async () => {
  const server = makeFakeServer();
  wrapMCPServer(server, {
    projectId: "p",
    apiSecret: "s",
    endpoint: "http://invalid.local",
    pricing: { ping: { type: "free" } },
  });

  server.setRequestHandler(CallToolSchema, async (req: any) => {
    return { content: [{ type: "text", text: "pong" }] };
  });

  const handler = server.handlers.get(CallToolSchema)!;
  const result = (await handler({ params: { name: "ping", arguments: {} } })) as any;
  assert.equal(result.content[0].text, "pong");
  assert.ok(!result.isError);
});

test("paid tools without a key produce a structured mcpay error", async () => {
  const server = makeFakeServer();
  wrapMCPServer(server, {
    projectId: "p",
    apiSecret: "s",
    endpoint: "http://invalid.local",
    pricing: { search: { type: "per_call", amountUsd: 0.01 } },
  });

  server.setRequestHandler(CallToolSchema, async () => {
    return { content: [{ type: "text", text: "should-not-run" }] };
  });

  const handler = server.handlers.get(CallToolSchema)!;
  const result = (await handler({ params: { name: "search", arguments: {} } })) as any;
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /\[mcpay\/missing_api_key\]/);
});

test("non-CallTool handlers are passed through untouched", async () => {
  const server = makeFakeServer();
  wrapMCPServer(server, {
    projectId: "p",
    apiSecret: "s",
    endpoint: "http://invalid.local",
    pricing: {},
  });

  server.setRequestHandler(ListToolsSchema, async () => ({ tools: [{ name: "x" }] }));

  const handler = server.handlers.get(ListToolsSchema)!;
  const out = (await handler({ params: {} })) as any;
  assert.deepEqual(out, { tools: [{ name: "x" }] });
});

test("custom extractApiKey is honored", async () => {
  const server = makeFakeServer();
  let sawKey: string | undefined;
  wrapMCPServer(server, {
    projectId: "p",
    apiSecret: "s",
    endpoint: "http://invalid.local",
    pricing: { ping: { type: "free" } },
    extractApiKey: (req) => {
      const args = req.params.arguments as Record<string, unknown> | undefined;
      sawKey = typeof args?.k === "string" ? args.k : undefined;
      return sawKey;
    },
  });

  server.setRequestHandler(CallToolSchema, async () => ({ content: [] }));
  const handler = server.handlers.get(CallToolSchema)!;
  await handler({ params: { name: "ping", arguments: { k: "custom_key" } } });
  assert.equal(sawKey, "custom_key");
});

test("MCPayError is exported for downstream catch sites", () => {
  const err = new MCPayError("x", "y");
  assert.equal(err.code, "y");
});
