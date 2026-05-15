// Repository contract. The two implementations below — in-memory (dev) and
// Supabase Postgres (prod) — must produce identical observable behavior.
//
// Pick the backend via env:
//   MCPAY_BACKEND=supabase  → SupabaseRepository (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
//   otherwise               → InMemoryRepository (seeds prj_demo / mcpay_live_demo_key_abc123)

export interface ProjectRecord {
  id: string;
  ownerId: string;
  name: string;
  apiSecret: string;
  stripeAccountId?: string;
  createdAt: string;
}

export interface CustomerKeyRecord {
  apiKey: string;
  projectId: string;
  customerId: string;
  monthlyBudgetUsd?: number;
  consumedThisMonthUsd: number;
  createdAt: string;
  revokedAt?: string;
}

export interface UsageRecord {
  id: string;
  projectId: string;
  apiKey: string;
  toolName: string;
  amountUsd: number;
  tokens?: number;
  timestamp: string;
}

export interface Repository {
  getProject(id: string): Promise<ProjectRecord | null>;
  setProjectStripeAccount(projectId: string, stripeAccountId: string): Promise<void>;
  getCustomerKey(apiKey: string): Promise<CustomerKeyRecord | null>;
  incrementConsumption(apiKey: string, amountUsd: number): Promise<void>;
  recordUsage(record: UsageRecord): Promise<void>;
  recentUsageForProject(projectId: string, limit?: number): Promise<UsageRecord[]>;
}

let cached: Repository | null = null;

export async function getRepository(): Promise<Repository> {
  if (cached) return cached;

  if (process.env.MCPAY_BACKEND === "supabase") {
    const { SupabaseRepository } = await import("./repository.supabase.js");
    cached = new SupabaseRepository();
  } else {
    const { InMemoryRepository } = await import("./repository.memory.js");
    cached = new InMemoryRepository();
  }
  return cached;
}
