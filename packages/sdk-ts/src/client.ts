import type { MCPayConfig, UsageEvent, VerifyKeyResult } from "./types.js";

const DEFAULT_ENDPOINT = "https://api.mcpay.dev";

export class MCPayClient {
  private readonly endpoint: string;
  private readonly projectId: string;
  private readonly apiSecret: string;
  private readonly failOpen: boolean;
  private readonly keyCache = new Map<string, { result: VerifyKeyResult; expiresAt: number }>();

  constructor(config: Pick<MCPayConfig, "projectId" | "apiSecret" | "endpoint" | "failOpen">) {
    this.endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
    this.projectId = config.projectId;
    this.apiSecret = config.apiSecret;
    this.failOpen = config.failOpen ?? false;
  }

  async verifyApiKey(apiKey: string): Promise<VerifyKeyResult> {
    const cached = this.keyCache.get(apiKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    try {
      const res = await fetch(`${this.endpoint}/v1/verify`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ projectId: this.projectId, apiKey }),
      });

      if (!res.ok) {
        return this.handleFailure(`verify HTTP ${res.status}`);
      }

      const result = (await res.json()) as VerifyKeyResult;
      this.keyCache.set(apiKey, { result, expiresAt: Date.now() + 60_000 });
      return result;
    } catch (err) {
      return this.handleFailure(err instanceof Error ? err.message : "network error");
    }
  }

  async recordUsage(event: Omit<UsageEvent, "projectId">): Promise<void> {
    const payload: UsageEvent = { ...event, projectId: this.projectId };
    try {
      await fetch(`${this.endpoint}/v1/usage`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // metering is fire-and-forget; failures must not block tool execution
    }
  }

  private headers(): Record<string, string> {
    return {
      "content-type": "application/json",
      authorization: `Bearer ${this.apiSecret}`,
      "x-mcpay-project": this.projectId,
    };
  }

  private handleFailure(reason: string): VerifyKeyResult {
    if (this.failOpen) {
      return { ok: true, reason: `fail-open: ${reason}` };
    }
    return { ok: false, reason };
  }
}
