import Link from "next/link";

const tiers = [
  {
    name: "Starter",
    range: "< $1,000 / month GMV",
    fee: "0%",
    blurb:
      "Build, ship, and validate without giving up a cent. We win when you cross $1k.",
    features: [
      "Unlimited MCP servers",
      "Unlimited customer API keys",
      "Usage dashboard",
      "Stripe Connect payouts",
      "Email support",
    ],
  },
  {
    name: "Standard",
    range: "$1,000 – $10,000 / month",
    fee: "10%",
    blurb:
      "We take a clean cut once you're earning. No subscription on top, no per-seat tax.",
    features: [
      "Everything in Starter",
      "Per-customer rate limits",
      "Webhooks (usage, payments)",
      "Custom domain on hosted listing page",
      "Priority support",
    ],
    highlight: true,
  },
  {
    name: "Scale",
    range: "> $10,000 / month",
    fee: "5% + invoicing",
    blurb:
      "High volume? You earn the lower rate, invoiced quarterly with revenue review.",
    features: [
      "Everything in Standard",
      "Dedicated infra option",
      "SOC-2 attestation (in progress)",
      "Quarterly revenue review",
      "Slack-channel support",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <nav className="mb-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          MCPay
        </Link>
        <div className="flex gap-6 text-sm text-zinc-400">
          <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
          <Link href="/pricing" className="text-white">Pricing</Link>
          <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
        </div>
      </nav>

      <header className="mb-12">
        <h1 className="mb-3 text-4xl font-bold">Pricing built for builders.</h1>
        <p className="max-w-2xl text-zinc-400">
          Platform fees scale with you. Stripe processing fees are pass-through.
          Self-host the SDK for $0 forever.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-xl border p-6 ${
              tier.highlight
                ? "border-accent bg-accent/5"
                : "border-zinc-800"
            }`}
          >
            <h2 className="mb-1 text-xl font-semibold">{tier.name}</h2>
            <p className="mb-4 text-xs uppercase tracking-wider text-zinc-500">
              {tier.range}
            </p>
            <p className="mb-1 text-4xl font-bold">{tier.fee}</p>
            <p className="mb-6 text-xs text-zinc-500">platform fee on GMV</p>
            <p className="mb-6 text-sm text-zinc-400">{tier.blurb}</p>
            <ul className="space-y-2 text-sm text-zinc-300">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <section className="mt-12 rounded-lg border border-zinc-800 p-6 text-sm text-zinc-400">
        <p className="mb-2 font-semibold text-zinc-200">A note on Stripe fees</p>
        <p>
          Stripe charges 2.9% + $0.30 per transaction. These flow through to the
          customer-facing invoice — they're never deducted from your payout. The
          MCPay platform fee above is in addition to Stripe's own fees, but only
          applied to <em>your</em> share of GMV.
        </p>
      </section>
    </main>
  );
}
