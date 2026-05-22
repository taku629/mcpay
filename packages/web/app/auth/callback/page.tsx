"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Lands after the user clicks a Supabase magic-link email. Supabase's implicit
// flow returns tokens in the URL hash fragment (#access_token=...). The hash
// is *not* sent to the server, so we parse it here on the client and POST the
// tokens to /api/auth/set-session, which verifies and mints HttpOnly cookies.

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const expiresIn = Number(params.get("expires_in") ?? "3600");
      const errParam = params.get("error_description") ?? params.get("error");

      if (errParam) {
        setError(errParam);
        return;
      }
      if (!accessToken || !refreshToken) {
        setError("Missing tokens in callback URL.");
        return;
      }

      const res = await fetch("/api/auth/set-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessToken, refreshToken, expiresIn }),
      });

      if (!res.ok) {
        const { error: msg } = (await res.json().catch(() => ({}))) as { error?: string };
        setError(msg ?? `Session exchange failed (${res.status}).`);
        return;
      }

      // Wipe the hash so tokens don't sit in browser history.
      history.replaceState(null, "", window.location.pathname);
      router.replace("/dashboard");
    };

    run().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
      <h1 className="mb-3 text-2xl font-bold">Signing you in…</h1>
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <p className="text-sm text-zinc-400">One moment.</p>
      )}
    </main>
  );
}
