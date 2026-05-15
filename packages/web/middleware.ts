import { NextResponse, type NextRequest } from "next/server";

// Gates /dashboard and /api/billing routes when AUTH_MODE=supabase.
// In demo mode (default), everything is open so the MVP demo "just works".

export function middleware(request: NextRequest) {
  const mode = process.env.AUTH_MODE ?? "demo";
  if (mode !== "supabase") return NextResponse.next();

  const token = request.cookies.get("sb-access-token")?.value;
  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/billing/:path*"],
};
