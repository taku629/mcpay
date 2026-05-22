import { NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

// POST { accessToken, refreshToken, expiresIn } → verifies the access token's
// signature, then sets HttpOnly cookies. Called from /auth/callback after the
// client extracts tokens from the Supabase implicit-flow URL hash.
//
// Verification mirrors lib/auth.ts: HS256 if SUPABASE_JWT_SECRET is set,
// otherwise RS256/ES256 via the project's JWKS.

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (cachedJwks) return cachedJwks;
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL not set");
  cachedJwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
  return cachedJwks;
}

async function verifyAccessToken(token: string): Promise<string | null> {
  const hs = process.env.SUPABASE_JWT_SECRET;
  try {
    const { payload } = hs
      ? await jwtVerify(token, new TextEncoder().encode(hs), { algorithms: ["HS256"] })
      : await jwtVerify(token, getJwks(), { algorithms: ["RS256", "ES256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (process.env.AUTH_MODE !== "supabase") {
    return NextResponse.json({ error: "auth_not_enabled" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  };

  const { accessToken, refreshToken } = body;
  if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
    return NextResponse.json({ error: "missing_tokens" }, { status: 400 });
  }

  const userId = await verifyAccessToken(accessToken);
  if (!userId) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  // Cap to a sane range; Supabase default access-token TTL is 3600s.
  const accessMaxAge = Math.max(60, Math.min(body.expiresIn ?? 3600, 24 * 3600));
  const refreshMaxAge = 30 * 24 * 3600; // 30 days; refresh tokens are long-lived.

  const res = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("sb-access-token", accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: accessMaxAge,
  });
  res.cookies.set("sb-refresh-token", refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: refreshMaxAge,
  });
  return res;
}
