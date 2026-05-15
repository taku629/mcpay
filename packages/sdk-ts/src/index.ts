import { MCPayClient } from "./client.js";
import { generateRequestId, priceCall } from "./meter.js";
import { MCPayError, type MCPayConfig, type ToolPricing } from "./types.js";

export { MCPayClient } from "./client.js";
export { priceCall } from "./meter.js";
export {
  MCPayError,
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

export interface MinimalMCPServer {
  setRequestHandler?: (...args: unknown[]) => unknown;
  [key: string]: unknown;
}

export function wrapMCPServer<S extends MinimalMCPServer>(server: S, config: MCPayConfig): S {
  const middleware = createMCPayMiddleware<unknown>(config);
  (server as Record<string, unknown>).__mcpay = {
    middleware,
    config: {
      projectId: config.projectId,
      pricing: config.pricing,
    },
  };
  return server;
}
