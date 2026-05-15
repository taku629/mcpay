import Stripe from "stripe";

// Lazy singleton — calling this without STRIPE_SECRET_KEY throws, so routes
// that need Stripe should let the env error bubble (it surfaces a clear 500).
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local (test mode is fine for dev).",
    );
  }
  cached = new Stripe(secret, { apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion });
  return cached;
}

export const STRIPE_CONFIGURED = Boolean(process.env.STRIPE_SECRET_KEY);

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
