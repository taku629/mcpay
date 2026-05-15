import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

// Auth surface for routes + server components.
//
// Modes:
//   "demo"     — always-on demo user. Default when AUTH_MODE is unset.
//   "supabase" — verifies the sb-access-token cookie. Two signing modes:
//                  · HS256 (legacy):  SUPABASE_JWT_SECRET set.
//                  · RS256 (modern):  uses {SUPABASE_URL}/auth/v1/.well-known/jwks.json.
//                If both are set, HS256 wins (it's a single round-trip).
//
// The JWKS for RS256 is cached in-process by jose with a 10-minute TTL by
// default; we don't need to manage it ourselves.

export interface SessionUser {
  id: string;
  email: string;
}

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (cachedJwks) return cachedJwks;
  const url = process.env.SUPABASE_URL;
  if (!url) {
    throw new Error(
      "SUPABASE_URL is required for RS256 JWT verification (or set SUPABASE_JWT_SECRET for HS256)",
    );
  }
  cachedJwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
  return cachedJwks;
}

async function verifyToken(token: string): Promise<JWTPayload | null> {
  const hs256Secret = process.env.SUPABASE_JWT_SECRET;
  try {
    if (hs256Secret) {
      const key = new TextEncoder().encode(hs256Secret);
      const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
      return payload;
    }
    const { payload } = await jwtVerify(token, getJwks(), {
      algorithms: ["RS256", "ES256"],
    });
    return payload;
  } catch {
    return null;
  }
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

    const payload = await verifyToken(token);
    if (!payload?.sub) return null;

    return {
      id: String(payload.sub),
      email: typeof payload.email === "string" ? payload.email : "",
    };
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
