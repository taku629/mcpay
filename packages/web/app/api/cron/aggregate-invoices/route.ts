import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { isAuthorizedCron } from "@/lib/cron";
import { getRepository } from "@/lib/repository";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Monthly cron: bills the *previous* calendar month's usage.
//
// Schedule: monthly, e.g. "0 3 1 * *" (03:00 UTC on the 1st).
// Auth:     CRON_SECRET via Authorization: Bearer <secret> or ?secret=.
// Override: ?month=YYYY-MM to (re-)run for a specific month — safe because
//           invoice_runs gates duplicates.
//
// What it does for each project with a connected Stripe account:
//   1. Loads every usage_event in [first-of-month, first-of-next-month) UTC.
//   2. Groups by customer (via customer_keys).
//   3. For each (project, customer, month) tuple:
//        - skip if invoice_runs already has it (idempotent re-run);
//        - otherwise: create + finalize one invoice on the connected account
//          with a single consolidated line, then record the run.
//
// Idempotency is enforced two ways:
//   * the invoice_runs unique key blocks re-billing the same window;
//   * Stripe idempotency-key on the API calls catches retries mid-flight.

interface AggregateError {
  projectId: string;
  customerId?: string;
  reason: string;
}

interface AggregateResult {
  ok: true;
  monthKey: string;
  windowStart: string;
  windowEnd: string;
  projectsScanned: number;
  invoicesCreated: number;
  invoicesSkipped: number;
  errors: AggregateError[];
}

export async function POST(request: Request) {
  return run(request);
}

export async function GET(request: Request) {
  return run(request);
}

async function run(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const monthOverride = url.searchParams.get("month") ?? undefined;
  const { monthKey, start, end } = resolveMonth(monthOverride);

  const result: AggregateResult = {
    ok: true,
    monthKey,
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    projectsScanned: 0,
    invoicesCreated: 0,
    invoicesSkipped: 0,
    errors: [],
  };

  const repo = await getRepository();
  const projects = await repo.listAllProjects();
  const stripe = getStripe();

  for (const project of projects) {
    result.projectsScanned++;
    if (!project.stripeAccountId) continue;

    const usage = await repo.usageBetween(
      project.id,
      start.toISOString(),
      end.toISOString(),
    );
    if (usage.length === 0) continue;

    // Group usage by customer. usage_events carries api_key, not customer_id,
    // so resolve via customer_keys once per distinct key.
    const keyToCustomer = new Map<string, string>();
    const byCustomer = new Map<string, { totalUsd: number; calls: number }>();

    for (const u of usage) {
      let customerId = keyToCustomer.get(u.apiKey);
      if (!customerId) {
        const key = await repo.getCustomerKey(u.apiKey);
        if (!key) continue; // orphan usage row — should be impossible via FK
        customerId = key.customerId;
        keyToCustomer.set(u.apiKey, customerId);
      }
      const row = byCustomer.get(customerId) ?? { totalUsd: 0, calls: 0 };
      row.totalUsd += u.amountUsd;
      row.calls += 1;
      byCustomer.set(customerId, row);
    }

    for (const [customerId, agg] of byCustomer) {
      try {
        await billCustomer({
          stripe,
          repo,
          projectId: project.id,
          stripeAccountId: project.stripeAccountId,
          customerId,
          monthKey,
          start,
          end,
          totalUsd: agg.totalUsd,
          callCount: agg.calls,
          result,
        });
      } catch (err) {
        result.errors.push({
          projectId: project.id,
          customerId,
          reason: (err as Error).message,
        });
      }
    }
  }

  return NextResponse.json(result);
}

interface BillArgs {
  stripe: Stripe;
  repo: Awaited<ReturnType<typeof getRepository>>;
  projectId: string;
  stripeAccountId: string;
  customerId: string;
  monthKey: string;
  start: Date;
  end: Date;
  totalUsd: number;
  callCount: number;
  result: AggregateResult;
}

async function billCustomer(args: BillArgs): Promise<void> {
  const {
    stripe,
    repo,
    projectId,
    stripeAccountId,
    customerId,
    monthKey,
    start,
    end,
    totalUsd,
    callCount,
    result,
  } = args;

  const existing = await repo.getInvoiceRun(projectId, customerId, monthKey);
  if (existing) {
    result.invoicesSkipped++;
    return;
  }

  const customer = await repo.getCustomerById(customerId);
  if (!customer?.stripeCustomerId) {
    throw new Error(`customer ${customerId} has no stripe_customer_id`);
  }

  const amountCents = Math.round(totalUsd * 100);
  if (amountCents <= 0) {
    result.invoicesSkipped++;
    return;
  }

  const idemBase = `mcpay_inv:${projectId}:${customerId}:${monthKey}`;
  const requestOpts = (suffix: string) => ({
    stripeAccount: stripeAccountId,
    idempotencyKey: `${idemBase}:${suffix}`,
  });

  // 1) Create the invoice first (auto_advance=false so Stripe doesn't finalize
  //    on its own clock). collection_method=send_invoice tells Stripe to email
  //    a hosted invoice link — works without a saved payment method.
  const invoice = await stripe.invoices.create(
    {
      customer: customer.stripeCustomerId,
      collection_method: "send_invoice",
      days_until_due: 14,
      auto_advance: false,
      description: `MCPay usage — ${monthKey}`,
      metadata: {
        mcpay_project_id: projectId,
        mcpay_customer_id: customerId,
        mcpay_month: monthKey,
        mcpay_call_count: String(callCount),
        mcpay_window_start: start.toISOString(),
        mcpay_window_end: end.toISOString(),
      },
    },
    requestOpts("invoice"),
  );

  // 2) Add a single consolidated line item attached to that invoice.
  await stripe.invoiceItems.create(
    {
      customer: customer.stripeCustomerId,
      invoice: invoice.id,
      amount: amountCents,
      currency: "usd",
      description: `MCPay usage — ${callCount.toLocaleString()} calls (${monthKey})`,
      metadata: {
        mcpay_project_id: projectId,
        mcpay_month: monthKey,
      },
    },
    requestOpts("line"),
  );

  // 3) Finalize, which generates a hosted invoice URL and emails the customer.
  const finalized = await stripe.invoices.finalizeInvoice(
    invoice.id!,
    {},
    requestOpts("finalize"),
  );

  await repo.recordInvoiceRun({
    projectId,
    customerId,
    monthKey,
    stripeInvoiceId: finalized.id!,
    totalUsd,
    callCount,
  });
  result.invoicesCreated++;
}

interface ResolvedMonth {
  monthKey: string;
  start: Date;
  end: Date;
}

function resolveMonth(override?: string): ResolvedMonth {
  if (override && /^\d{4}-\d{2}$/.test(override)) {
    const [yStr, mStr] = override.split("-");
    const year = Number(yStr);
    const month = Number(mStr); // 1-12
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return { monthKey: override, start, end };
  }

  // Default: previous calendar month in UTC.
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-11 — JS gives last month if we use -1 below.
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const mm = String(start.getUTCMonth() + 1).padStart(2, "0");
  return { monthKey: `${start.getUTCFullYear()}-${mm}`, start, end };
}
