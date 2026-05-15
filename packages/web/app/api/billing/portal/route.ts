import { NextResponse } from "next/server";
import { appBaseUrl, getStripe } from "@/lib/stripe";

// Returns a short-lived Stripe Billing Portal URL for a given customer.
// Customers hit this to update their card, cancel a subscription, or download
// invoices — without us building any of those screens ourselves.

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { stripeCustomerId?: string };
  if (!body.stripeCustomerId) {
    return NextResponse.json({ error: "missing_stripe_customer_id" }, { status: 400 });
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: body.stripeCustomerId,
    return_url: `${appBaseUrl()}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
