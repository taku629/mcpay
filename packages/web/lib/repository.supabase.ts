import type {
  CustomerKeyRecord,
  CustomerRecord,
  InvoiceRunRecord,
  ProjectRecord,
  Repository,
  UsageRecord,
} from "./repository.js";

// Supabase-backed implementation. Uses the REST API via fetch so we don't pull
// in a heavy client. The service-role key is required for server-to-server use
// — it bypasses RLS, so the routes themselves must enforce auth.

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function assertConfigured() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use SupabaseRepository",
    );
  }
}

async function rest<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string> } = {},
): Promise<T> {
  assertConfigured();
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);

  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      apikey: SERVICE_ROLE,
      authorization: `Bearer ${SERVICE_ROLE}`,
      prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`supabase ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

// --- Row types ----------------------------------------------------------

type ProjectRow = {
  id: string;
  owner_id: string;
  name: string;
  api_secret: string;
  stripe_account_id: string | null;
  created_at: string;
};

type CustomerRow = {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  created_at: string;
};

type CustomerKeyRow = {
  api_key: string;
  project_id: string;
  customer_id: string;
  monthly_budget_usd: number | null;
  consumed_this_month_usd: number;
  created_at: string;
  revoked_at: string | null;
};

type UsageRow = {
  id: string;
  project_id: string;
  api_key: string;
  tool_name: string;
  amount_usd: number;
  tokens: number | null;
  timestamp: string;
};

type InvoiceRunRow = {
  project_id: string;
  customer_id: string;
  month_key: string;
  stripe_invoice_id: string;
  total_usd: number;
  call_count: number;
  created_at: string;
};

// --- Mappers ------------------------------------------------------------

const mapProject = (r: ProjectRow): ProjectRecord => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  apiSecret: r.api_secret,
  stripeAccountId: r.stripe_account_id ?? undefined,
  createdAt: r.created_at,
});

const mapCustomer = (r: CustomerRow): CustomerRecord => ({
  id: r.id,
  email: r.email,
  stripeCustomerId: r.stripe_customer_id ?? undefined,
  createdAt: r.created_at,
});

const mapKey = (r: CustomerKeyRow): CustomerKeyRecord => ({
  apiKey: r.api_key,
  projectId: r.project_id,
  customerId: r.customer_id,
  monthlyBudgetUsd: r.monthly_budget_usd ?? undefined,
  consumedThisMonthUsd: r.consumed_this_month_usd,
  createdAt: r.created_at,
  revokedAt: r.revoked_at ?? undefined,
});

const mapUsage = (r: UsageRow): UsageRecord => ({
  id: r.id,
  projectId: r.project_id,
  apiKey: r.api_key,
  toolName: r.tool_name,
  amountUsd: r.amount_usd,
  tokens: r.tokens ?? undefined,
  timestamp: r.timestamp,
});

const mapInvoiceRun = (r: InvoiceRunRow): InvoiceRunRecord => ({
  projectId: r.project_id,
  customerId: r.customer_id,
  monthKey: r.month_key,
  stripeInvoiceId: r.stripe_invoice_id,
  totalUsd: r.total_usd,
  callCount: r.call_count,
  createdAt: r.created_at,
});

function newId(prefix: string, len = 10): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = prefix;
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (const b of buf) out += chars[b % chars.length];
  return out;
}

// --- Repository ---------------------------------------------------------

export class SupabaseRepository implements Repository {
  async createProject(input: {
    ownerId: string;
    name: string;
    apiSecretHash: string;
  }): Promise<ProjectRecord> {
    const rows = await rest<ProjectRow[]>("projects", {
      method: "POST",
      body: JSON.stringify({
        id: newId("prj_"),
        owner_id: input.ownerId,
        name: input.name,
        api_secret: input.apiSecretHash,
      }),
    });
    return mapProject(rows[0]);
  }

  async getProject(id: string): Promise<ProjectRecord | null> {
    const rows = await rest<ProjectRow[]>("projects", {
      query: { id: `eq.${id}`, select: "*", limit: "1" },
    });
    return rows[0] ? mapProject(rows[0]) : null;
  }

  async setProjectStripeAccount(projectId: string, stripeAccountId: string): Promise<void> {
    await rest<ProjectRow[]>("projects", {
      method: "PATCH",
      query: { id: `eq.${projectId}` },
      body: JSON.stringify({ stripe_account_id: stripeAccountId }),
    });
  }

  async listProjectsByOwner(ownerId: string): Promise<ProjectRecord[]> {
    const rows = await rest<ProjectRow[]>("projects", {
      query: { owner_id: `eq.${ownerId}`, select: "*" },
    });
    return rows.map(mapProject);
  }

  async getCustomerById(id: string): Promise<CustomerRecord | null> {
    const rows = await rest<CustomerRow[]>("customers", {
      query: { id: `eq.${id}`, select: "*", limit: "1" },
    });
    return rows[0] ? mapCustomer(rows[0]) : null;
  }

  async getCustomerByStripeId(stripeCustomerId: string): Promise<CustomerRecord | null> {
    const rows = await rest<CustomerRow[]>("customers", {
      query: { stripe_customer_id: `eq.${stripeCustomerId}`, select: "*", limit: "1" },
    });
    return rows[0] ? mapCustomer(rows[0]) : null;
  }

  async upsertCustomer(input: {
    email: string;
    stripeCustomerId: string;
  }): Promise<CustomerRecord> {
    const existing = await this.getCustomerByStripeId(input.stripeCustomerId);
    if (existing) {
      const rows = await rest<CustomerRow[]>("customers", {
        method: "PATCH",
        query: { id: `eq.${existing.id}` },
        body: JSON.stringify({ email: input.email }),
      });
      return mapCustomer(rows[0]);
    }
    const rows = await rest<CustomerRow[]>("customers", {
      method: "POST",
      body: JSON.stringify({
        id: newId("cust_"),
        email: input.email,
        stripe_customer_id: input.stripeCustomerId,
      }),
    });
    return mapCustomer(rows[0]);
  }

  async createCustomerKey(input: {
    apiKey: string;
    projectId: string;
    customerId: string;
    monthlyBudgetUsd?: number;
  }): Promise<CustomerKeyRecord> {
    const rows = await rest<CustomerKeyRow[]>("customer_keys", {
      method: "POST",
      body: JSON.stringify({
        api_key: input.apiKey,
        project_id: input.projectId,
        customer_id: input.customerId,
        monthly_budget_usd: input.monthlyBudgetUsd ?? null,
      }),
    });
    return mapKey(rows[0]);
  }

  async getCustomerKey(apiKey: string): Promise<CustomerKeyRecord | null> {
    const rows = await rest<CustomerKeyRow[]>("customer_keys", {
      query: { api_key: `eq.${apiKey}`, select: "*", limit: "1" },
    });
    return rows[0] ? mapKey(rows[0]) : null;
  }

  async incrementConsumption(apiKey: string, amountUsd: number): Promise<void> {
    await rest("rpc/increment_customer_consumption", {
      method: "POST",
      body: JSON.stringify({ p_api_key: apiKey, p_amount_usd: amountUsd }),
    });
  }

  async recordUsage(record: UsageRecord): Promise<void> {
    await rest("usage_events", {
      method: "POST",
      body: JSON.stringify({
        id: record.id,
        project_id: record.projectId,
        api_key: record.apiKey,
        tool_name: record.toolName,
        amount_usd: record.amountUsd,
        tokens: record.tokens ?? null,
        timestamp: record.timestamp,
      }),
    });
  }

  async recentUsageForProject(projectId: string, limit = 50): Promise<UsageRecord[]> {
    const rows = await rest<UsageRow[]>("usage_events", {
      query: {
        project_id: `eq.${projectId}`,
        select: "*",
        order: "timestamp.desc",
        limit: String(limit),
      },
    });
    return rows.map(mapUsage);
  }

  async listAllProjects(): Promise<ProjectRecord[]> {
    const rows = await rest<ProjectRow[]>("projects", { query: { select: "*" } });
    return rows.map(mapProject);
  }

  async listAllCustomerKeys(): Promise<CustomerKeyRecord[]> {
    const rows = await rest<CustomerKeyRow[]>("customer_keys", {
      query: { select: "*", revoked_at: "is.null" },
    });
    return rows.map(mapKey);
  }

  async usageBetween(projectId: string, fromISO: string, toISO: string): Promise<UsageRecord[]> {
    const rows = await rest<UsageRow[]>("usage_events", {
      query: {
        project_id: `eq.${projectId}`,
        timestamp: `gte.${fromISO}`,
        and: `(timestamp.lt.${toISO})`,
        select: "*",
        order: "timestamp.asc",
      },
    });
    return rows.map(mapUsage);
  }

  async resetAllMonthlyConsumption(): Promise<number> {
    const rows = await rest<CustomerKeyRow[]>("customer_keys", {
      method: "PATCH",
      query: { consumed_this_month_usd: "gt.0" },
      body: JSON.stringify({ consumed_this_month_usd: 0 }),
    });
    return rows.length;
  }

  async getInvoiceRun(
    projectId: string,
    customerId: string,
    monthKey: string,
  ): Promise<InvoiceRunRecord | null> {
    const rows = await rest<InvoiceRunRow[]>("invoice_runs", {
      query: {
        project_id: `eq.${projectId}`,
        customer_id: `eq.${customerId}`,
        month_key: `eq.${monthKey}`,
        select: "*",
        limit: "1",
      },
    });
    return rows[0] ? mapInvoiceRun(rows[0]) : null;
  }

  async recordInvoiceRun(input: {
    projectId: string;
    customerId: string;
    monthKey: string;
    stripeInvoiceId: string;
    totalUsd: number;
    callCount: number;
  }): Promise<InvoiceRunRecord> {
    const rows = await rest<InvoiceRunRow[]>("invoice_runs", {
      method: "POST",
      body: JSON.stringify({
        project_id: input.projectId,
        customer_id: input.customerId,
        month_key: input.monthKey,
        stripe_invoice_id: input.stripeInvoiceId,
        total_usd: input.totalUsd,
        call_count: input.callCount,
      }),
    });
    return mapInvoiceRun(rows[0]);
  }
}
