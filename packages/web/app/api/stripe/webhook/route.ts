import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Stripe webhooks. Signature is verified with STRIPE_WEBHOOK_SECRET. We accept
// the events we care about and 200-OK everything else so Stripe doesn't retry
// indefinitely.
//
// Important: Stripe needs the RAW request body for signature verification.
// Next.js gives us this via `request.text()` before any parsing.

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ received: false, reason: "no_signature" }, { status: 400 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { received: false, reason: "webhook_secret_unset" },
      { status: 500 },
    );
  }

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { received: false, reason: `bad_signature: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "account.updated":
      // Connect account onboarding state changed. Re-pull status into the dashboard.
      console.log("[stripe] account.updated", event.data.object.id);
      break;
    case "invoice.paid":
      // Customer paid an invoice — credit the author's balance / unlock budget.
      console.log("[stripe] invoice.paid", event.data.object.id);
      break;
    case "invoice.payment_failed":
      // Block usage for that customer key until resolved.
      console.log("[stripe] invoice.payment_failed", event.data.object.id);
      break;
    case "customer.subscription.deleted":
      // Monthly-unlimited subscription cancelled.
      console.log("[stripe] subscription.deleted", event.data.object.id);
      break;
    default:
      // Ignore — but log so we can spot useful events to handle later.
      console.log("[stripe] ignored event", event.type);
  }

  return NextResponse.json({ received: true });
}
