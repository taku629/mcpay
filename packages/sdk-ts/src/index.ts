import { MCPayClient } from "./client.js";
import { generateRequestId, priceCall } from "./meter.js";
import {
  MCPayError,
  type CallToolRequestLike,
  type CallToolResultLike,
  type MCPayConfig,
  type ToolPricing,
} from "./types.js";

export { MCPayClient } from "./client.js";
export { priceCall } from "./meter.js";
export {
  MCPayError,
  type CallToolRequestLike,
  type CallToolResultLike,
  type MCPayConfig,
  type ToolPricing,
  type UsageEvent,
  type VerifyKeyResult,
} from "./types.js";

export interface ToolInvocation {
  toolName: string;
  apiKey: string | undefined;
  tokens?: number;
}

export interface WrappedHandler<T> {
  (invocation: ToolInvocation, next: () => Promise<T>): Promise<T>;
}

export function createMCPayMiddleware<T>(config: MCPayConfig): WrappedHandler<T> {
  const client = new MCPayClient(config);

  return async (invocation, next) => {
    const pricing = config.pricing[invocation.toolName];

    if (pricing && pricing.type !== "free") {
      if (!invocation.apiKey) {
        throw new MCPayError(
          `Tool "${invocation.toolName}" requires an MCPay API key. ` +
            `Pass it via the "x-mcpay-key" header or the "apiKey" argument.`,
          "missing_api_key",
        );
      }

      const verification = await client.verifyApiKey(invocation.apiKey);
      if (!verification.ok) {
        throw new MCPayError(
          `MCPay key rejected: ${verification.reason ?? "unknown"}`,
          "invalid_api_key",
        );
      }

      const amount = priceCall(pricing, invocation.tokens);
      if (verification.remainingBudgetUsd !== undefined && amount > verification.remainingBudgetUsd) {
        throw new MCPayError(
          `Customer budget exceeded (need $${amount.toFixed(4)}, have $${verification.remainingBudgetUsd.toFixed(4)})`,
          "budget_exceeded",
        );
      }
    }

    const result = await next();

    if (pricing) {
      const amount = priceCall(pricing, invocation.tokens);
      if (amount > 0 && invocation.apiKey) {
        void client.recordUsage({
          apiKey: invocation.apiKey,
          toolName: invocation.toolName,
          amountUsd: amount,
          tokens: invocation.tokens,
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
        });
      }
    }

    return result;
  };
}

function defaultExtractApiKey(req: CallToolRequestLike): string | undefined {
  const args = req.params.arguments;
  if (args && typeof args._mcpayKey === "string") return args._mcpayKey;
  const meta = req.params._meta;
  if (meta && typeof meta["x-mcpay-key"] === "string") {
    return meta["x-mcpay-key"] as string;
  }
  return undefined;
}

function defaultExtractTokens(
  _toolName: string,
  _req: CallToolRequestLike,
  result: CallToolResultLike,
): number | undefined {
  const t = result?._meta?.tokens;
  return typeof t === "number" && Number.isFinite(t) ? t : undefined;
}

function looksLikeCallToolRequest(value: unknown): value is CallToolRequestLike {
  if (!value || typeof value !== "object") return false;
  const params = (value as { params?: unknown }).params;
  if (!params || typeof params !== "object") return false;
  return typeof (params as { name?: unknown }).name === "string";
}

function looksLikeCallToolSchema(schema: unknown): boolean {
  // @modelcontextprotocol/sdk uses zod schemas with a literal method field.
  // We don't import zod, so we sniff structurally to avoid a hard dependency.
  const method = (schema as { shape?: { method?: { value?: unknown } } })?.shape?.method?.value;
  return method === "tools/call";
}

// Intentionally loose — the real `Server.setRequestHandler` from
// `@modelcontextprotocol/sdk` is generic over a Zod schema, and we want
// `wrapMCPServer` to accept that exact server without forcing the caller to
// cast. We monkey-patch internally and preserve the input type via `S`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface MinimalMCPServer { setRequestHandler?: (...args: any[]) => any }

/**
 * Drop-in monetization for an `@modelcontextprotocol/sdk` Server.
 *
 * Returns the same server reference. After wrapping, any handler you register
 * via `server.setRequestHandler(CallToolRequestSchema, …)` is automatically
 * gated by the customer's MCPay API key and metered per `config.pricing`.
 *
 * Customer key sources (in order, override via `extractApiKey`):
 *   1. `params.arguments._mcpayKey`
 *   2. `params._meta["x-mcpay-key"]`
 *
 * Token counts for `per_token` pricing are read from the tool result's
 * `_meta.tokens` field unless overridden via `extractTokens`.
 */
export function wrapMCPServer<S extends MinimalMCPServer>(server: S, config: MCPayConfig): S {
  const middleware = createMCPayMiddleware<unknown>(config);
  const extractApiKey = config.extractApiKey ?? defaultExtractApiKey;
  const extractTokens = config.extractTokens ?? defaultExtractTokens;

  const original = server.setRequestHandler;
  if (typeof original !== "function") {
    (server as Record<string, unknown>).__mcpay = { middleware };
    return server;
  }

  const bound = original.bind(server);

  (server as Record<string, unknown>).setRequestHandler = (
    schema: unknown,
    handler: (...args: unknown[]) => unknown,
  ) => {
    const isCallTool = looksLikeCallToolSchema(schema);

    const wrapped = async (...args: unknown[]) => {
      const req = args[0];
      if (!isCallTool && !looksLikeCallToolRequest(req)) {
        return handler(...args);
      }

      const callReq = req as CallToolRequestLike;
      const toolName = callReq.params.name;
      const apiKey = extractApiKey(callReq);

      let computedTokens: number | undefined;

      try {
        const result = await middleware(
          { toolName, apiKey, get tokens() { return computedTokens; } } as ToolInvocation,
          async () => {
            const out = (await handler(...args)) as CallToolResultLike;
            computedTokens = extractTokens(toolName, callReq, out);
            return out;
          },
        );
        return result;
      } catch (err) {
        if (err instanceof MCPayError) {
          return {
            content: [
              { type: "text", text: `[mcpay/${err.code}] ${err.message}` },
            ],
            isError: true,
          };
        }
        throw err;
      }
    };

    return bound(schema, wrapped);
  };

  (server as Record<string, unknown>).__mcpay = { middleware, config: { projectId: config.projectId, pricing: config.pricing } };
  return server;
}
