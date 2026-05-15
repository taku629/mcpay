import { NextResponse, type NextRequest } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Edge middleware: gates /dashboard and /api/billing when AUTH_MODE=supabase.
// Verifies the sb-access-token cookie's signature (HS256 if SUPABASE_JWT_SECRET
// is set, otherwise RS256 via JWKS). Demo mode is a passthrough.
//
// Note: middleware can't import from lib/auth.ts because that uses next/headers
// which doesn't run on edge — keep this self-contained.

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (cachedJwks) return cachedJwks;
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL not set");
  cachedJwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
  return cachedJwks;
}

async function isValidToken(token: string): Promise<boolean> {
  const hs256 = process.env.SUPABASE_JWT_SECRET;
  try {
    if (hs256) {
      await jwtVerify(token, new TextEncoder().encode(hs256), { algorithms: ["HS256"] });
    } else {
      await jwtVerify(token, getJwks(), { algorithms: ["RS256", "ES256"] });
    }
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const mode = process.env.AUTH_MODE ?? "demo";
  if (mode !== "supabase") return NextResponse.next();

  const token = request.cookies.get("sb-access-token")?.value;
  if (!token || !(await isValidToken(token))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/billing/:path*"],
};
