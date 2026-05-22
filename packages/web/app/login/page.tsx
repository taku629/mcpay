"use client";

import Link from "next/link";
import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);

    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setStatus("sent");
      setMessage(`Check ${email} for a sign-in link.`);
      return;
    }

    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    setStatus("error");
    if (error === "auth_not_enabled") {
      setMessage("Auth is in demo mode. Set AUTH_MODE=supabase to enable email login.");
    } else if (error === "invalid_email") {
      setMessage("That email doesn't look right.");
    } else {
      setMessage("Couldn't send the magic link. Try again in a moment.");
    }
  };

  const disabled = status === "sending" || status === "sent";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        MCPay
      </Link>
      <h1 className="mb-2 text-3xl font-bold">Sign in</h1>
      <p className="mb-8 text-sm text-zinc-400">
        Enter your email and we&apos;ll send you a magic link.
      </p>

      <form className="space-y-3" onSubmit={onSubmit}>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : status === "sent" ? "Link sent" : "Email me a magic link"}
        </button>
      </form>

      {message ? (
        <p
          className={`mt-4 text-sm ${
            status === "error" ? "text-red-400" : "text-zinc-400"
          }`}
        >
          {message}
        </p>
      ) : null}

      <Link
        href="/dashboard"
        className="mt-6 text-center text-xs text-zinc-500 hover:underline"
      >
        Skip — enter dashboard in demo mode →
      </Link>
    </main>
  );
}
