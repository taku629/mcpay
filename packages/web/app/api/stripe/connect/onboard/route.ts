import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository";
import { appBaseUrl, getStripe } from "@/lib/stripe";

// Begins Stripe Connect Express onboarding for an author. The author POSTs
// with their projectId; we create (or reuse) a Connect account and return a
// short-lived hosted onboarding URL.
//
// Auth: the route is server-only and trusts the session middleware. In MVP we
// accept the projectId in the body; production should derive it from the
// authenticated user.

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { projectId?: string };
  if (!body.projectId) {
    return NextResponse.json({ error: "missing_project_id" }, { status: 400 });
  }

  const repo = await getRepository();
  const project = await repo.getProject(body.projectId);
  if (!project) {
    return NextResponse.json({ error: "unknown_project" }, { status: 404 });
  }

  const stripe = getStripe();

  let accountId = project.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      metadata: { mcpay_project_id: project.id },
    });
    accountId = account.id;
    await repo.setProjectStripeAccount(project.id, accountId);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appBaseUrl()}/dashboard?stripe=refresh`,
    return_url: `${appBaseUrl()}/dashboard?stripe=return`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url, accountId });
}
