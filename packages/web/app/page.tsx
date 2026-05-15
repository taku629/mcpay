import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <nav className="mb-20 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          MCPay
        </Link>
        <div className="flex gap-6 text-sm text-zinc-400">
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
          <a
            href="https://github.com/taku629/mcpay"
            className="hover:text-white"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </nav>

      <section className="mb-24">
        <p className="mb-4 inline-block rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
          For MCP server authors
        </p>
        <h1 className="mb-6 max-w-3xl text-5xl font-bold leading-tight tracking-tight">
          Get paid for your MCP server in <span className="text-accent">3 lines of code</span>.
        </h1>
        <p className="mb-8 max-w-2xl text-lg text-zinc-400">
          11,000+ MCP servers exist. Fewer than 5% are monetized — and the ones that are
          require crypto plumbing or platform lock-in. MCPay gives you per-call billing,
          customer keys, and Stripe payouts. Keep your server. Add a price tag.
        </p>
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-accent px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            Start free →
          </Link>
          <a
            href="https://github.com/taku629/mcpay"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-zinc-800 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900"
          >
            View on GitHub
          </a>
        </div>
      </section>

      <section className="mb-24">
        <h2 className="mb-6 text-sm font-medium uppercase tracking-wider text-zinc-500">
          The 3-line integration
        </h2>
        <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-sm leading-relaxed">
          <code className="font-mono text-zinc-300">{`import { wrapMCPServer } from "@mcpay/sdk";

export default wrapMCPServer(server, {
  projectId: process.env.MCPAY_PROJECT_ID!,
  apiSecret: process.env.MCPAY_API_SECRET!,
  pricing: {
    search_web:     { type: "per_call",  amountUsd: 0.01 },
    summarize_text: { type: "per_token", amountUsdPer1k: 0.002 },
    ping:           { type: "free" },
  },
});`}</code>
        </pre>
        <p className="mt-3 text-sm text-zinc-500">
          Python? <code className="font-mono text-zinc-300">pip install mcpay</code> — wire-compatible.
        </p>
      </section>

      <section className="mb-24 grid gap-8 md:grid-cols-3">
        <Feature
          title="Per-tool pricing"
          body="Charge per call, per token, or via flat monthly subscription. Mix and match across tools in the same server."
        />
        <Feature
          title="Fiat-first, Stripe-backed"
          body="No crypto wallets, no chains. Customers pay in USD through Stripe. You get monthly Connect payouts."
        />
        <Feature
          title="Self-host friendly"
          body="Run the SDK + your own Postgres + your own Stripe account. MCPay-Cloud is opt-in, not required."
        />
      </section>

      <section className="mb-24 rounded-xl border border-zinc-800 p-8">
        <h2 className="mb-3 text-2xl font-semibold">The pricing nobody else offers.</h2>
        <p className="mb-6 max-w-2xl text-zinc-400">
          We make money when you make money — and not before. Under $1,000/mo GMV
          the platform fee is <span className="font-mono text-white">0%</span>.
        </p>
        <Link href="/pricing" className="text-sm text-accent hover:underline">
          See full pricing →
        </Link>
      </section>

      <section className="mb-24">
        <h2 className="mb-8 text-2xl font-semibold">FAQ</h2>
        <div className="space-y-6">
          <Faq q="Do I have to host on MCPay to use the SDK?">
            No. <code className="font-mono">@mcpay/sdk</code> takes an <code className="font-mono">endpoint</code> option.
            Point it at your own deployment of the dashboard repo and you have a self-hosted control
            plane. MCPay-Cloud just removes the hosting work.
          </Faq>
          <Faq q="What happens if your service is down?">
            With <code className="font-mono">failOpen: true</code> the SDK lets paid calls through and queues
            metering for later. With it off (the default in prod), paid calls fail closed. Free tools
            are unaffected — they never call MCPay.
          </Faq>
          <Faq q="How is this different from x402 / L402 / Lightning?">
            Those are crypto-native protocols. MCPay is fiat-native, Stripe-backed. Customers pay
            with cards, you receive USD via Stripe Connect, taxes/invoices/refunds are handled by
            Stripe. If your customers prefer crypto, the protocols above are great — they're
            orthogonal to MCPay, not competitors.
          </Faq>
          <Faq q="Can I price per token, not per call?">
            Yes. <code className="font-mono">{"{ type: 'per_token', amountUsdPer1k: 0.002 }"}</code>.
            Your tool reports the token count; the SDK does the multiplication.
          </Faq>
          <Faq q="When does the 10% platform fee kick in?">
            Once your project crosses $1,000 of gross merchandise value in a calendar month. Below
            that we charge 0%. Stripe's 2.9%+$0.30 are pass-through, paid by the customer.
          </Faq>
        </div>
      </section>

      <footer className="border-t border-zinc-900 pt-8 text-sm text-zinc-500">
        MIT-licensed. Built for the MCP ecosystem.
        {" · "}
        <a href="https://github.com/taku629/mcpay" className="hover:text-zinc-300">
          GitHub
        </a>
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-zinc-400">{body}</p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-lg border border-zinc-800 p-5 open:bg-zinc-950">
      <summary className="cursor-pointer text-sm font-medium text-zinc-200 marker:content-['']">
        <span className="mr-2 text-zinc-500 group-open:rotate-90 inline-block transition">▸</span>
        {q}
      </summary>
      <div className="mt-3 pl-5 text-sm leading-relaxed text-zinc-400">{children}</div>
    </details>
  );
}
