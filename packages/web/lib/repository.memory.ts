import type {
  CustomerKeyRecord,
  ProjectRecord,
  Repository,
  UsageRecord,
} from "./repository.js";

class Store {
  projects = new Map<string, ProjectRecord>();
  customerKeys = new Map<string, CustomerKeyRecord>();
  usage: UsageRecord[] = [];
}

declare global {
  // eslint-disable-next-line no-var
  var __mcpayMemStore: Store | undefined;
}

const store = globalThis.__mcpayMemStore ?? (globalThis.__mcpayMemStore = new Store());

function seed() {
  if (store.projects.size > 0) return;

  store.projects.set("prj_demo", {
    id: "prj_demo",
    ownerId: "user_demo",
    name: "demo-mcp",
    apiSecret: "sk_test_demo_only_do_not_use_in_prod",
    createdAt: new Date().toISOString(),
  });

  store.customerKeys.set("mcpay_live_demo_key_abc123", {
    apiKey: "mcpay_live_demo_key_abc123",
    projectId: "prj_demo",
    customerId: "cust_demo",
    monthlyBudgetUsd: 10,
    consumedThisMonthUsd: 0,
    createdAt: new Date().toISOString(),
  });
}

seed();

export class InMemoryRepository implements Repository {
  async getProject(id: string): Promise<ProjectRecord | null> {
    return store.projects.get(id) ?? null;
  }

  async setProjectStripeAccount(projectId: string, stripeAccountId: string): Promise<void> {
    const proj = store.projects.get(projectId);
    if (proj) proj.stripeAccountId = stripeAccountId;
  }

  async getCustomerKey(apiKey: string): Promise<CustomerKeyRecord | null> {
    return store.customerKeys.get(apiKey) ?? null;
  }

  async incrementConsumption(apiKey: string, amountUsd: number): Promise<void> {
    const k = store.customerKeys.get(apiKey);
    if (k) k.consumedThisMonthUsd += amountUsd;
  }

  async recordUsage(record: UsageRecord): Promise<void> {
    store.usage.push(record);
  }

  async recentUsageForProject(projectId: string, limit = 50): Promise<UsageRecord[]> {
    return store.usage
      .filter((u) => u.projectId === projectId)
      .slice(-limit)
      .reverse();
  }
}
