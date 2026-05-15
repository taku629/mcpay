import { NextResponse } from "next/server";

// Skeleton webhook receiver. Wire up Stripe.webhooks.constructEvent with the raw
// body once STRIPE_WEBHOOK_SECRET is available — left intentionally inert so the
// app boots without secrets.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ received: false, reason: "no_signature" }, { status: 400 });
  }

  const raw = await request.text();
  console.log("[stripe.webhook] received payload bytes:", raw.length);

  return NextResponse.json({ received: true });
}
