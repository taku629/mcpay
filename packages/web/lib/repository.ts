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

export interface CustomerRecord {
  id: string;
  email: string;
  stripeCustomerId?: string;
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

// One row per (project, customer, month) the aggregate-invoices cron has
// already processed. Lets us safely re-run the cron — if a run already
// exists, we skip without double-billing.
export interface InvoiceRunRecord {
  projectId: string;
  customerId: string;
  monthKey: string; // "YYYY-MM" — UTC calendar month being billed
  stripeInvoiceId: string;
  totalUsd: number;
  callCount: number;
  createdAt: string;
}

export interface Repository {
  // Projects
  createProject(input: {
    ownerId: string;
    name: string;
    apiSecretHash: string;
  }): Promise<ProjectRecord>;
  getProject(id: string): Promise<ProjectRecord | null>;
  setProjectStripeAccount(projectId: string, stripeAccountId: string): Promise<void>;
  listProjectsByOwner(ownerId: string): Promise<ProjectRecord[]>;

  // Customers
  getCustomerById(id: string): Promise<CustomerRecord | null>;
  getCustomerByStripeId(stripeCustomerId: string): Promise<CustomerRecord | null>;
  upsertCustomer(input: {
    email: string;
    stripeCustomerId: string;
  }): Promise<CustomerRecord>;

  // Customer keys
  createCustomerKey(input: {
    apiKey: string;
    projectId: string;
    customerId: string;
    monthlyBudgetUsd?: number;
  }): Promise<CustomerKeyRecord>;
  getCustomerKey(apiKey: string): Promise<CustomerKeyRecord | null>;
  incrementConsumption(apiKey: string, amountUsd: number): Promise<void>;

  // Usage
  recordUsage(record: UsageRecord): Promise<void>;
  recentUsageForProject(projectId: string, limit?: number): Promise<UsageRecord[]>;

  // Cron-driven operations.
  listAllProjects(): Promise<ProjectRecord[]>;
  listAllCustomerKeys(): Promise<CustomerKeyRecord[]>;
  usageBetween(projectId: string, fromISO: string, toISO: string): Promise<UsageRecord[]>;
  resetAllMonthlyConsumption(): Promise<number>;

  // Invoice runs (idempotency for the aggregate-invoices cron).
  getInvoiceRun(
    projectId: string,
    customerId: string,
    monthKey: string,
  ): Promise<InvoiceRunRecord | null>;
  recordInvoiceRun(input: {
    projectId: string;
    customerId: string;
    monthKey: string;
    stripeInvoiceId: string;
    totalUsd: number;
    callCount: number;
  }): Promise<InvoiceRunRecord>;
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
