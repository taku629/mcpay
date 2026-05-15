import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { getRepository } from "@/lib/repository";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily cron: roll up usage_events into Stripe invoice items per customer,
// per project. Each invoice item carries metadata so authors can reconcile.
//
// Schedule (vercel.json): "0 3 * * *" — 03:00 UTC daily.
// Auth: CRON_SECRET via Authorization: Bearer <secret> or ?secret=.
//
// What we do:
//  1. Determine the window: [last cron run, now). For MVP we just use the past
//     24h. A real implementation should track high-watermarks per project.
//  2. For each project with a connected Stripe account:
//       a. Sum amount_usd grouped by api_key over the window.
//       b. Create an invoice item on the customer (via the connected account).
//  3. The author finalises invoices on their schedule via Stripe Billing.

interface AggregateResult {
  ok: true;
  windowStart: string;
  windowEnd: string;
  projectsScanned: number;
  invoiceItemsCreated: number;
  errors: Array<{ projectId: string; reason: string }>;
}

export async function POST(request: Request) {
  return run(request);
}

export async function GET(request: Request) {
  // Vercel cron currently uses GET. Both paths supported.
  return run(request);
}

async function run(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  const result: AggregateResult = {
    ok: true,
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    projectsScanned: 0,
    invoiceItemsCreated: 0,
    errors: [],
  };

  const repo = await getRepository();
  const projects = await repo.listAllProjects();
  const stripe = getStripe();

  for (const project of projects) {
    result.projectsScanned++;
    if (!project.stripeAccountId) continue;

    const usage = await repo.usageBetween(project.id, start.toISOString(), end.toISOString());
    if (usage.length === 0) continue;

    const byKey = new Map<string, { totalUsd: number; calls: number }>();
    for (const u of usage) {
      const row = byKey.get(u.apiKey) ?? { totalUsd: 0, calls: 0 };
      row.totalUsd += u.amountUsd;
      row.calls += 1;
      byKey.set(u.apiKey, row);
    }

    for (const [apiKey, agg] of byKey) {
      const key = await repo.getCustomerKey(apiKey);
      if (!key) continue;

      try {
        const amountCents = Math.round(agg.totalUsd * 100);
        if (amountCents <= 0) continue;

        // The customer must exist in the connected account. Mapping
        // customer_id → stripe_customer_id is out of scope for MVP — we look it
        // up via the customers table once that's wired up.
        await stripe.invoiceItems.create(
          {
            customer: key.customerId, // expected to be a Stripe customer id
            amount: amountCents,
            currency: "usd",
            description: `MCPay usage — ${agg.calls} calls`,
            metadata: {
              mcpay_project_id: project.id,
              mcpay_api_key: apiKey,
              window_start: start.toISOString(),
              window_end: end.toISOString(),
            },
          },
          { stripeAccount: project.stripeAccountId },
        );
        result.invoiceItemsCreated++;
      } catch (err) {
        result.errors.push({
          projectId: project.id,
          reason: (err as Error).message,
        });
      }
    }
  }

  return NextResponse.json(result);
}
