export type ToolPricing =
  | { type: "free" }
  | { type: "per_call"; amountUsd: number }
  | { type: "per_token"; amountUsdPer1k: number }
  | { type: "monthly_unlimited"; amountUsdPerMonth: number };

export interface CallToolRequestLike {
  params: {
    name: string;
    arguments?: Record<string, unknown>;
    _meta?: Record<string, unknown>;
  };
}

export interface CallToolResultLike {
  content?: Array<unknown>;
  _meta?: { tokens?: number;[key: string]: unknown };
  [key: string]: unknown;
}

export interface MCPayConfig {
  projectId: string;
  apiSecret: string;
  pricing: Record<string, ToolPricing>;
  endpoint?: string;
  failOpen?: boolean;
  /**
   * Extract the customer's MCPay key from an incoming CallTool request.
   * Default: `params.arguments._mcpayKey` (string) → `params._meta["x-mcpay-key"]`.
   */
  extractApiKey?: (req: CallToolRequestLike) => string | undefined;
  /**
   * For `per_token` pricing, derive a token count from the tool's result.
   * Default: `result._meta.tokens` if numeric.
   */
  extractTokens?: (
    toolName: string,
    req: CallToolRequestLike,
    result: CallToolResultLike,
  ) => number | undefined;
}

export interface UsageEvent {
  projectId: string;
  apiKey: string;
  toolName: string;
  amountUsd: number;
  tokens?: number;
  timestamp: string;
  requestId: string;
}

export interface VerifyKeyResult {
  ok: boolean;
  customerId?: string;
  remainingBudgetUsd?: number;
  reason?: string;
}

export class MCPayError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = "MCPayError";
  }
}
