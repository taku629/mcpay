import { NextResponse } from "next/server";
import { sendMagicLink } from "@/lib/supabase-auth";

// POST { email } → triggers a Supabase magic-link email. The link in the email
// points to /auth/callback, which extracts the tokens from the URL hash and
// posts them to /api/auth/set-session to mint HttpOnly cookies.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (process.env.AUTH_MODE !== "supabase") {
    return NextResponse.json({ error: "auth_not_enabled" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    await sendMagicLink({
      email,
      emailRedirectTo: `${appUrl}/auth/callback`,
    });
  } catch (err) {
    console.error("magic-link send failed", err);
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
