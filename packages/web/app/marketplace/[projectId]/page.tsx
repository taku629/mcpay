import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

const TOP_UP_AMOUNTS = [5, 10, 25, 50, 100];

type Params = Promise<{ projectId: string }>;

export default async function MarketplaceListing({ params }: { params: Params }) {
  const { projectId } = await params;
  const repo = await getRepository();
  const project = await repo.getProject(projectId);
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <nav className="mb-12 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          MCPay
        </Link>
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          ← Back
        </Link>
      </nav>

      <header className="mb-10">
        <p className="mb-3 inline-block rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
          MCP server
        </p>
        <h1 className="mb-3 text-4xl font-bold">{project.name}</h1>
        <p className="font-mono text-xs text-zinc-500">{project.id}</p>
      </header>

      <section className="mb-12 rounded-xl border border-zinc-800 p-6">
        <h2 className="mb-1 text-xl font-semibold">Get an API key</h2>
        <p className="mb-6 text-sm text-zinc-400">
          Top up a prepaid balance with your card. You'll get an{" "}
          <code className="font-mono">mcpay_live_…</code> key to paste into your MCP client.
          The balance is consumed call-by-call based on this server's pricing.
        </p>

        <form action="/api/checkout/start" method="post" className="space-y-4">
          <input type="hidden" name="projectId" value={project.id} />

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-zinc-500">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-zinc-500">
              Top-up
            </label>
            <div className="grid grid-cols-5 gap-2">
              {TOP_UP_AMOUNTS.map((amt, idx) => (
                <label
                  key={amt}
                  className="cursor-pointer rounded-md border border-zinc-800 px-3 py-2 text-center text-sm hover:bg-zinc-900 has-[:checked]:border-accent has-[:checked]:bg-accent/10"
                >
                  <input
                    type="radio"
                    name="amountUsd"
                    value={amt}
                    defaultChecked={idx === 1}
                    className="sr-only"
                  />
                  ${amt}
                </label>
              ))}
            </div>
          </div>

          <button className="w-full rounded-md bg-accent px-5 py-3 text-sm font-medium text-white transition hover:opacity-90">
            Continue to checkout →
          </button>
        </form>

        <p className="mt-4 text-xs text-zinc-500">
          Payments are processed by Stripe. We never see your card details.
          {!project.stripeAccountId && (
            <span className="ml-1 text-amber-500">
              · Note: this server's author hasn't connected Stripe yet — checkout will fail.
            </span>
          )}
        </p>
      </section>

      <section className="text-sm text-zinc-400">
        <h3 className="mb-2 text-sm font-semibold text-zinc-200">How it works</h3>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Pay above. You'll be emailed an API key.</li>
          <li>
            Paste it into your MCP client config (Claude Desktop, Cursor, …) as{" "}
            <code className="font-mono">MCPAY_KEY</code>.
          </li>
          <li>Your client passes it on every tool call; calls are metered against your balance.</li>
          <li>When you run low, top up again from this page.</li>
        </ol>
      </section>
    </main>
  );
}
