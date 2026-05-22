import type {
  CustomerKeyRecord,
  CustomerRecord,
  InvoiceRunRecord,
  ProjectRecord,
  Repository,
  UsageRecord,
} from "./repository.js";

class Store {
  projects = new Map<string, ProjectRecord>();
  customers = new Map<string, CustomerRecord>();
  customerKeys = new Map<string, CustomerKeyRecord>();
  usage: UsageRecord[] = [];
  invoiceRuns = new Map<string, InvoiceRunRecord>();
}

const runKey = (projectId: string, customerId: string, monthKey: string) =>
  `${projectId}|${customerId}|${monthKey}`;

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

  store.customers.set("cust_demo", {
    id: "cust_demo",
    email: "demo@example.com",
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

function randomId(prefix: string, len = 10): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = prefix;
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export class InMemoryRepository implements Repository {
  // --- Projects ----------------------------------------------------------
  async createProject(input: {
    ownerId: string;
    name: string;
    apiSecretHash: string;
  }): Promise<ProjectRecord> {
    const record: ProjectRecord = {
      id: randomId("prj_"),
      ownerId: input.ownerId,
      name: input.name,
      apiSecret: input.apiSecretHash,
      createdAt: new Date().toISOString(),
    };
    store.projects.set(record.id, record);
    return record;
  }

  async getProject(id: string): Promise<ProjectRecord | null> {
    return store.projects.get(id) ?? null;
  }

  async setProjectStripeAccount(projectId: string, stripeAccountId: string): Promise<void> {
    const proj = store.projects.get(projectId);
    if (proj) proj.stripeAccountId = stripeAccountId;
  }

  async listProjectsByOwner(ownerId: string): Promise<ProjectRecord[]> {
    return Array.from(store.projects.values()).filter((p) => p.ownerId === ownerId);
  }

  // --- Customers ---------------------------------------------------------
  async getCustomerById(id: string): Promise<CustomerRecord | null> {
    return store.customers.get(id) ?? null;
  }

  async getCustomerByStripeId(stripeCustomerId: string): Promise<CustomerRecord | null> {
    for (const c of store.customers.values()) {
      if (c.stripeCustomerId === stripeCustomerId) return c;
    }
    return null;
  }

  async upsertCustomer(input: {
    email: string;
    stripeCustomerId: string;
  }): Promise<CustomerRecord> {
    const existing = await this.getCustomerByStripeId(input.stripeCustomerId);
    if (existing) {
      existing.email = input.email;
      return existing;
    }
    const record: CustomerRecord = {
      id: randomId("cust_"),
      email: input.email,
      stripeCustomerId: input.stripeCustomerId,
      createdAt: new Date().toISOString(),
    };
    store.customers.set(record.id, record);
    return record;
  }

  // --- Customer keys -----------------------------------------------------
  async createCustomerKey(input: {
    apiKey: string;
    projectId: string;
    customerId: string;
    monthlyBudgetUsd?: number;
  }): Promise<CustomerKeyRecord> {
    const record: CustomerKeyRecord = {
      apiKey: input.apiKey,
      projectId: input.projectId,
      customerId: input.customerId,
      monthlyBudgetUsd: input.monthlyBudgetUsd,
      consumedThisMonthUsd: 0,
      createdAt: new Date().toISOString(),
    };
    store.customerKeys.set(record.apiKey, record);
    return record;
  }

  async getCustomerKey(apiKey: string): Promise<CustomerKeyRecord | null> {
    return store.customerKeys.get(apiKey) ?? null;
  }

  async incrementConsumption(apiKey: string, amountUsd: number): Promise<void> {
    const k = store.customerKeys.get(apiKey);
    if (k) k.consumedThisMonthUsd += amountUsd;
  }

  // --- Usage -------------------------------------------------------------
  async recordUsage(record: UsageRecord): Promise<void> {
    store.usage.push(record);
  }

  async recentUsageForProject(projectId: string, limit = 50): Promise<UsageRecord[]> {
    return store.usage
      .filter((u) => u.projectId === projectId)
      .slice(-limit)
      .reverse();
  }

  // --- Cron --------------------------------------------------------------
  async listAllProjects(): Promise<ProjectRecord[]> {
    return Array.from(store.projects.values());
  }

  async listAllCustomerKeys(): Promise<CustomerKeyRecord[]> {
    return Array.from(store.customerKeys.values());
  }

  async usageBetween(projectId: string, fromISO: string, toISO: string): Promise<UsageRecord[]> {
    return store.usage.filter(
      (u) => u.projectId === projectId && u.timestamp >= fromISO && u.timestamp < toISO,
    );
  }

  async resetAllMonthlyConsumption(): Promise<number> {
    let count = 0;
    for (const k of store.customerKeys.values()) {
      if (k.consumedThisMonthUsd > 0) {
        k.consumedThisMonthUsd = 0;
        count++;
      }
    }
    return count;
  }

  // --- Invoice runs ------------------------------------------------------
  async getInvoiceRun(
    projectId: string,
    customerId: string,
    monthKey: string,
  ): Promise<InvoiceRunRecord | null> {
    return store.invoiceRuns.get(runKey(projectId, customerId, monthKey)) ?? null;
  }

  async recordInvoiceRun(input: {
    projectId: string;
    customerId: string;
    monthKey: string;
    stripeInvoiceId: string;
    totalUsd: number;
    callCount: number;
  }): Promise<InvoiceRunRecord> {
    const record: InvoiceRunRecord = {
      ...input,
      createdAt: new Date().toISOString(),
    };
    store.invoiceRuns.set(runKey(input.projectId, input.customerId, input.monthKey), record);
    return record;
  }
}
