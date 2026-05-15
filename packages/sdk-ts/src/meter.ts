import type { ToolPricing } from "./types.js";

export function priceCall(pricing: ToolPricing | undefined, tokens?: number): number {
  if (!pricing) return 0;
  switch (pricing.type) {
    case "free":
      return 0;
    case "per_call":
      return pricing.amountUsd;
    case "per_token":
      if (!tokens || tokens <= 0) return 0;
      return (tokens / 1000) * pricing.amountUsdPer1k;
    case "monthly_unlimited":
      return 0;
  }
}

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
