export type ToolPricing =
  | { type: "free" }
  | { type: "per_call"; amountUsd: number }
  | { type: "per_token"; amountUsdPer1k: number }
  | { type: "monthly_unlimited"; amountUsdPerMonth: number };

export interface MCPayConfig {
  projectId: string;
  apiSecret: string;
  pricing: Record<string, ToolPricing>;
  endpoint?: string;
  failOpen?: boolean;
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
