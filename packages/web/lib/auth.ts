import { cookies } from "next/headers";

// Auth scaffold. Two modes:
//  - "demo"     → always-on demo user, used when AUTH_MODE is unset.
//  - "supabase" → reads sb-access-token cookie, verifies via Supabase JWKS.
//
// The supabase path is intentionally a stub right now: it returns the user id
// embedded in the JWT but does *not* verify the signature. Swap for jose or
// @supabase/auth-helpers-nextjs before going live. Keeping the surface here so
// callers don't change when we wire it up.

export interface SessionUser {
  id: string;
  email: string;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const mode = process.env.AUTH_MODE ?? "demo";

  if (mode === "demo") {
    return { id: "user_demo", email: "demo@mcpay.dev" };
  }

  if (mode === "supabase") {
    const jar = await cookies();
    const token = jar.get("sb-access-token")?.value;
    if (!token) return null;
    const payload = decodeJwtPayloadUnsafe(token);
    if (!payload?.sub) return null;
    return { id: String(payload.sub), email: String(payload.email ?? "") };
  }

  return null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}

function decodeJwtPayloadUnsafe(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const padded = parts[1] + "===".slice((parts[1].length + 3) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
