import Link from "next/link";
import { getRepository } from "@/lib/repository";
import type { ProjectRecord } from "@/lib/repository";

export const dynamic = "force-dynamic";

interface Listing {
  project: ProjectRecord;
  revenueUsd: number;
  callCount: number;
}

const LOOKBACK_DAYS = 30;

// Public discovery page. Lists every project with a connected Stripe account
// — the ones a customer can actually buy from — ranked by recent gross
// revenue. The detail page at /marketplace/[projectId] handles the checkout.
//
// N+1 note: we call usageBetween() per project to compute the rank. Fine while
// project count is in the hundreds. When this stops being true, push the
// aggregation into a single `select project_id, sum(...) ... group by` repo
// method.
export default async function MarketplaceIndex() {
  const repo = await getRepository();
  const allProjects = await repo.listAllProjects();
  const connected = allProjects.filter((p) => p.stripeAccountId);

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();

  const listings: Listing[] = await Promise.all(
    connected.map(async (project) => {
      const usage = await repo.usageBetween(
        project.id,
        since.toISOString(),
        now.toISOString(),
      );
      const revenueUsd = usage.reduce((s, u) => s + u.amountUsd, 0);
      return { project, revenueUsd, callCount: usage.length };
    }),
  );

  listings.sort((a, b) => b.revenueUsd - a.revenueUsd);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <nav className="mb-12 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          MCPay
        </Link>
        <div className="flex gap-6 text-sm text-zinc-400">
          <Link href="/marketplace" className="text-white">Marketplace</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
        </div>
      </nav>

      <header className="mb-12">
        <p className="mb-3 inline-block rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
          Marketplace
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          MCP servers you can buy access to.
        </h1>
        <p className="max-w-2xl text-lg text-zinc-400">
          Every server below accepts MCPay keys. Pick one, top up a prepaid
          balance, and paste the key into your MCP client.
        </p>
      </header>

      {listings.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {listings.map(({ project, revenueUsd, callCount }, idx) => (
            <li key={project.id}>
              <ListingCard
                rank={idx + 1}
                project={project}
                revenueUsd={revenueUsd}
                callCount={callCount}
              />
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-20 border-t border-zinc-900 pt-8 text-sm text-zinc-500">
        Are you a server author?{" "}
        <Link href="/dashboard" className="text-accent hover:underline">
          Connect Stripe and list your server →
        </Link>
      </footer>
    </main>
  );
}

function ListingCard({
  rank,
  project,
  revenueUsd,
  callCount,
}: {
  rank: number;
  project: ProjectRecord;
  revenueUsd: number;
  callCount: number;
}) {
  const hasActivity = callCount > 0;
  return (
    <Link
      href={`/marketplace/${project.id}`}
      className="block rounded-xl border border-zinc-800 p-6 transition hover:border-zinc-600 hover:bg-zinc-950"
    >
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wider text-zinc-500">
          #{rank}
        </span>
        <span className="text-xs text-zinc-600">
          last {LOOKBACK_DAYS}d
        </span>
      </div>
      <h2 className="mb-1 text-xl font-semibold">{project.name}</h2>
      <p className="mb-5 font-mono text-xs text-zinc-500">{project.id}</p>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Stat
          label="Revenue"
          value={hasActivity ? `$${revenueUsd.toFixed(2)}` : "—"}
          dim={!hasActivity}
        />
        <Stat
          label="Calls"
          value={hasActivity ? callCount.toLocaleString() : "—"}
          dim={!hasActivity}
        />
      </dl>

      <p className="mt-5 text-sm text-accent">Buy access →</p>
    </Link>
  );
}

function Stat({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className={`mt-1 font-mono ${dim ? "text-zinc-600" : "text-zinc-200"}`}>
        {value}
      </dd>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
      <h2 className="mb-2 text-lg font-semibold">No live servers yet.</h2>
      <p className="mx-auto mb-6 max-w-md text-sm text-zinc-400">
        Server authors need to finish Stripe Connect onboarding before their
        project shows up here. If you&apos;re an author,{" "}
        <Link href="/dashboard" className="text-accent hover:underline">
          go to the dashboard
        </Link>{" "}
        and connect a Stripe account.
      </p>
    </div>
  );
}
