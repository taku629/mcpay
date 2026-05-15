import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository";
import { getStripe } from "@/lib/stripe";

// Hit after Stripe Express onboarding redirects back. We re-pull the account
// to record charges_enabled / payouts_enabled so the dashboard can surface
// onboarding status accurately. The redirect itself happens on the dashboard
// — this route is for the dashboard to call asynchronously.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "missing_project_id" }, { status: 400 });
  }

  const repo = await getRepository();
  const project = await repo.getProject(projectId);
  if (!project?.stripeAccountId) {
    return NextResponse.json({ error: "no_stripe_account" }, { status: 404 });
  }

  const account = await getStripe().accounts.retrieve(project.stripeAccountId);

  return NextResponse.json({
    accountId: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    requirementsCurrentlyDue: account.requirements?.currently_due ?? [],
  });
}
