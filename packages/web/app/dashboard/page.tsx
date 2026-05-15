import Link from "next/link";

const mockProjects = [
  {
    id: "prj_kxe129",
    name: "search-mcp",
    monthlyRevenueUsd: 482.15,
    callsThisMonth: 48215,
    activeKeys: 23,
    topTool: "search_web",
  },
  {
    id: "prj_pa5gx2",
    name: "vision-tools-mcp",
    monthlyRevenueUsd: 91.40,
    callsThisMonth: 1828,
    activeKeys: 4,
    topTool: "generate_image",
  },
];

export default function Dashboard() {
  const totalRevenue = mockProjects.reduce((s, p) => s + p.monthlyRevenueUsd, 0);
  const totalCalls = mockProjects.reduce((s, p) => s + p.callsThisMonth, 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <nav className="mb-12 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          MCPay
        </Link>
        <div className="flex gap-6 text-sm text-zinc-400">
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/dashboard" className="text-white">Dashboard</Link>
        </div>
      </nav>

      <header className="mb-10">
        <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
          Welcome back
        </p>
        <h1 className="text-3xl font-bold">Your MCP servers</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Mock data — wire up auth + Postgres to make this real.
        </p>
      </header>

      <section className="mb-10 grid gap-4 md:grid-cols-3">
        <Stat label="Monthly revenue" value={`$${totalRevenue.toFixed(2)}`} />
        <Stat label="Calls this month" value={totalCalls.toLocaleString()} />
        <Stat label="Active customer keys" value="27" />
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
              <th className="px-4 py-3">Revenue (mo)</th>
              <th className="px-4 py-3">Calls</th>
              <th className="px-4 py-3">Active keys</th>
              <th className="px-4 py-3">Top tool</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {mockProjects.map((p) => (
              <tr key={p.id} className="border-t border-zinc-900">
                <td className="px-4 py-4">
                  <div className="font-medium">{p.name}</div>
                  <div className="font-mono text-xs text-zinc-500">{p.id}</div>
                </td>
                <td className="px-4 py-4 font-mono">
                  ${p.monthlyRevenueUsd.toFixed(2)}
                </td>
                <td className="px-4 py-4 font-mono">{p.callsThisMonth.toLocaleString()}</td>
                <td className="px-4 py-4 font-mono">{p.activeKeys}</td>
                <td className="px-4 py-4 font-mono text-zinc-400">{p.topTool}</td>
                <td className="px-4 py-4 text-right">
                  <a className="text-accent hover:underline" href="#">
                    View →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-12 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Stripe Connect
        </h3>
        <p className="mb-4 text-sm text-zinc-400">
          Connect a Stripe account to receive payouts. We never hold your funds —
          customer payments land in your Stripe balance directly.
        </p>
        <button className="rounded-md border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900">
          Connect Stripe account
        </button>
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
