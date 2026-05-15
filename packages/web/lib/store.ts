// Lightweight in-memory store for the MVP. Swap with Postgres / Supabase before prod.
// Each map keyed by string id; values are plain records so the API layer can stay simple.

export interface ProjectRecord {
  id: string;
  ownerId: string;
  name: string;
  apiSecret: string;
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

class Store {
  projects = new Map<string, ProjectRecord>();
  customerKeys = new Map<string, CustomerKeyRecord>();
  usage: UsageRecord[] = [];

  seed(): void {
    if (this.projects.size > 0) return;

    const proj: ProjectRecord = {
      id: "prj_demo",
      ownerId: "user_demo",
      name: "demo-mcp",
      apiSecret: "sk_test_demo_only_do_not_use_in_prod",
      createdAt: new Date().toISOString(),
    };
    this.projects.set(proj.id, proj);

    const key: CustomerKeyRecord = {
      apiKey: "mcpay_live_demo_key_abc123",
      projectId: proj.id,
      customerId: "cust_demo",
      monthlyBudgetUsd: 10,
      consumedThisMonthUsd: 0,
      createdAt: new Date().toISOString(),
    };
    this.customerKeys.set(key.apiKey, key);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __mcpayStore: Store | undefined;
}

export const store: Store = globalThis.__mcpayStore ?? (globalThis.__mcpayStore = new Store());
store.seed();
