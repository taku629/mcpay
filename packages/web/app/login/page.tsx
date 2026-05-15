import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        MCPay
      </Link>
      <h1 className="mb-2 text-3xl font-bold">Sign in</h1>
      <p className="mb-8 text-sm text-zinc-400">
        Auth is in demo mode for the MVP. Set <code className="font-mono">AUTH_MODE=supabase</code>{" "}
        and wire up Supabase Auth (or your provider of choice) to make this real.
      </p>

      <form className="space-y-3">
        <input
          type="email"
          placeholder="you@example.com"
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
        />
        <button
          type="button"
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium"
        >
          Email me a magic link
        </button>
      </form>

      <Link href="/dashboard" className="mt-6 text-center text-xs text-zinc-500 hover:underline">
        Skip — enter dashboard in demo mode →
      </Link>
    </main>
  );
}
