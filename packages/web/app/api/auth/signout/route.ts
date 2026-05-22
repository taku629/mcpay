import { NextResponse } from "next/server";

// Clears the Supabase session cookies. Accept POST (form / fetch) and GET so a
// plain <a href="/api/auth/signout"> works as a fallback.

function clear() {
  const res = NextResponse.redirect(
    new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  );
  for (const name of ["sb-access-token", "sb-refresh-token"]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return res;
}

export async function POST() {
  return clear();
}

export async function GET() {
  return clear();
}
