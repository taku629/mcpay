import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository";
import { appBaseUrl, getStripe } from "@/lib/stripe";

// Customer-facing checkout. The customer picks a project + a top-up amount,
// pays once via Stripe Checkout, and after the webhook fires we issue them an
// API key with that budget. Subscription plans come later — prepaid is the
// simplest first iteration.

const ALLOWED_AMOUNTS_USD = new Set([5, 10, 25, 50, 100]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    projectId?: string;
    amountUsd?: number;
    email?: string;
  };

  if (!body.projectId) {
    return NextResponse.json({ error: "missing_project_id" }, { status: 400 });
  }
  if (!body.amountUsd || !ALLOWED_AMOUNTS_USD.has(body.amountUsd)) {
    return NextResponse.json(
      { error: "invalid_amount", allowed: Array.from(ALLOWED_AMOUNTS_USD) },
      { status: 400 },
    );
  }
  if (!body.email || !body.email.includes("@")) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const repo = await getRepository();
  const project = await repo.getProject(body.projectId);
  if (!project) {
    return NextResponse.json({ error: "unknown_project" }, { status: 404 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: body.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: body.amountUsd * 100,
            product_data: {
              name: `${project.name} — $${body.amountUsd} top-up`,
              description: `Prepaid balance for the ${project.name} MCP server. Use until exhausted.`,
            },
          },
        },
      ],
      // Metadata travels through to the webhook so we can mint the API key on
      // payment confirmation rather than trusting the client.
      metadata: {
        mcpay_project_id: project.id,
        mcpay_amount_usd: String(body.amountUsd),
        mcpay_customer_email: body.email,
      },
      payment_intent_data: {
        // Without an application_fee_amount this is a direct charge; the
        // platform fee should be calculated and applied here based on the
        // author's tier. MVP omits the fee — wire it up before going live.
        metadata: {
          mcpay_project_id: project.id,
        },
      },
      success_url: `${appBaseUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl()}/marketplace/${project.id}?cancelled=1`,
    },
    project.stripeAccountId
      ? { stripeAccount: project.stripeAccountId }
      : undefined,
  );

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
