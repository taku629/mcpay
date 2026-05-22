import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRepository } from "@/lib/repository";
import { appBaseUrl, getStripe } from "@/lib/stripe";

// Returns a short-lived Stripe Billing Portal URL for a given customer.
// Customers hit this to update their card, cancel a subscription, or download
// invoices — without us building any of those screens ourselves.
//
// AuthZ: customer ↔ user is matched by email (CustomerRecord has no userId
// today). The session middleware (matcher: /api/billing/:path*) enforces a
// valid token in supabase mode; this also checks the customer belongs to the
// authenticated user before handing out a portal link.

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { stripeCustomerId?: string };
  if (!body.stripeCustomerId) {
    return NextResponse.json({ error: "missing_stripe_customer_id" }, { status: 400 });
  }

  const repo = await getRepository();
  const customer = await repo.getCustomerByStripeId(body.stripeCustomerId);
  if (!customer) {
    return NextResponse.json({ error: "unknown_customer" }, { status: 404 });
  }
  if (customer.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: body.stripeCustomerId,
    return_url: `${appBaseUrl()}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
