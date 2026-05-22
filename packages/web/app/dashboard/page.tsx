import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getCurrentUser();
  const repo = await getRepository();

  // For the MVP we hard-code one demo project. Once auth lands, list the
  // projects whose owner_id matches the session user.
  const demo = await repo.getProject("prj_demo");
  const recent = demo ? await repo.recentUsageForProject(demo.id, 10) : [];
  const totalRevenue = recent.reduce((s, r) => s + r.amountUsd, 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <nav className="mb-12 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          MCPay
        </Link>
        <div className="flex items-center gap-6 text-sm text-zinc-400">
          <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/dashboard" className="text-white">Dashboard</Link>
          <a href="/api/auth/signout" className="hover:text-white">Sign out</a>
        </div>
      </nav>

      <header className="mb-10">
        <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
          Signed in as {user?.email ?? "demo@mcpay.dev"}
        </p>
        <h1 className="text-3xl font-bold">Your MCP servers</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Backend: <code className="font-mono">{process.env.MCPAY_BACKEND ?? "in-memory"}</code>
        </p>
      </header>

      <section className="mb-10 grid gap-4 md:grid-cols-3">
        <Stat label="Revenue (recent)" value={`$${totalRevenue.toFixed(4)}`} />
        <Stat label="Calls (recent)" value={recent.length.toLocaleString()} />
        <Stat label="Stripe Connect" value={demo?.stripeAccountId ? "Connected" : "Not connected"} />
      </section>

      <section className="mb-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projects</h2>
        <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium">
          + New project
        </button>
      </section>

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Stripe</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {demo ? (
              <tr className="border-t border-zinc-900">
                <td className="px-4 py-4">
                  <div className="font-medium">{demo.name}</div>
                  <div className="font-mono text-xs text-zinc-500">{demo.id}</div>
                </td>
                <td className="px-4 py-4 text-zinc-400">
                  {new Date(demo.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-4 font-mono text-xs text-zinc-400">
                  {demo.stripeAccountId ?? "—"}
                </td>
                <td className="px-4 py-4 text-right">
                  <a className="text-accent hover:underline" href="#">
                    View →
                  </a>
                </td>
              </tr>
            ) : (
              <tr className="border-t border-zinc-900">
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-zinc-500">
                  No projects yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Stripe Connect
          </h3>
          <p className="mb-4 text-sm text-zinc-400">
            Connect a Stripe account to receive payouts. We never hold your funds —
            customer payments land in your Stripe balance directly.
          </p>
          <form action="/api/stripe/connect/onboard" method="post">
            <input type="hidden" name="projectId" value={demo?.id ?? "prj_demo"} />
            <button className="rounded-md border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900">
              {demo?.stripeAccountId ? "Continue onboarding" : "Connect Stripe account"}
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Recent usage
          </h3>
          {recent.length === 0 ? (
            <p className="text-sm text-zinc-500">No usage yet. Run the example server.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recent.slice(0, 6).map((r) => (
                <li key={r.id} className="flex justify-between font-mono text-xs">
                  <span className="text-zinc-300">{r.toolName}</span>
                  <span className="text-zinc-500">${r.amountUsd.toFixed(4)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 p-5">
      <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
