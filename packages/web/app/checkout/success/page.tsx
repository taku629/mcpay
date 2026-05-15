import Link from "next/link";

type SearchParams = Promise<{ session_id?: string }>;

export default async function CheckoutSuccess({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { session_id } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-12 text-lg font-semibold tracking-tight">
        MCPay
      </Link>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8">
        <p className="mb-3 inline-block rounded-full border border-emerald-700 bg-emerald-900/20 px-3 py-1 text-xs text-emerald-400">
          Payment received
        </p>
        <h1 className="mb-4 text-3xl font-bold">Your API key is on its way.</h1>
        <p className="mb-6 text-sm text-zinc-400">
          We're emailing your <code className="font-mono">mcpay_live_…</code> key to the address
          you used at checkout. Add it to your MCP client config as the value of the{" "}
          <code className="font-mono">MCPAY_KEY</code> env var (or whatever the server expects).
        </p>

        {session_id && (
          <p className="mb-6 break-all rounded-md bg-zinc-900 p-3 text-xs text-zinc-500">
            Reference: {session_id}
          </p>
        )}

        <div className="flex gap-3">
          <Link
            href="/"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Back to MCPay
          </Link>
          <a
            href="https://github.com/taku629/mcpay"
            className="rounded-md border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-900"
          >
            Read the docs
          </a>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-zinc-600">
        Email not arrived? It's MVP — for now, contact the project owner directly.
      </p>
    </main>
  );
}
