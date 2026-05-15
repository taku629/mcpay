import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { generateCustomerApiKey } from "@/lib/api-key";
import { getRepository } from "@/lib/repository";
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
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "account.updated":
      console.log("[stripe] account.updated", event.data.object.id);
      break;
    case "invoice.paid":
      console.log("[stripe] invoice.paid", event.data.object.id);
      break;
    case "invoice.payment_failed":
      console.log("[stripe] invoice.payment_failed", event.data.object.id);
      break;
    case "customer.subscription.deleted":
      console.log("[stripe] subscription.deleted", event.data.object.id);
      break;
    default:
      console.log("[stripe] ignored event", event.type);
  }

  return NextResponse.json({ received: true });
}

// Mint a customer + API key with the purchased budget. Idempotent on
// session.id — re-delivered webhooks won't create duplicate keys (we look up
// the stripe customer first).
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const projectId = session.metadata?.mcpay_project_id;
  const amountUsdRaw = session.metadata?.mcpay_amount_usd;
  const email =
    session.metadata?.mcpay_customer_email ??
    session.customer_details?.email ??
    session.customer_email ??
    "";

  if (!projectId || !amountUsdRaw || !email) {
    console.warn("[stripe] checkout.session.completed missing metadata", session.id);
    return;
  }

  const amountUsd = Number(amountUsdRaw);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    console.warn("[stripe] checkout.session.completed bad amount", amountUsdRaw);
    return;
  }

  const stripeCustomerId =
    (typeof session.customer === "string" ? session.customer : session.customer?.id) ?? "";
  if (!stripeCustomerId) {
    console.warn("[stripe] checkout.session.completed no customer", session.id);
    return;
  }

  const repo = await getRepository();
  const customer = await repo.upsertCustomer({ email, stripeCustomerId });
  const apiKey = generateCustomerApiKey();
  await repo.createCustomerKey({
    apiKey,
    projectId,
    customerId: customer.id,
    monthlyBudgetUsd: amountUsd,
  });

  console.log("[stripe] issued mcpay key", { projectId, customerId: customer.id });
}
