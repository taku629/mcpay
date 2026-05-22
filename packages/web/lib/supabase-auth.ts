// Thin REST wrapper for Supabase Auth (GoTrue). We avoid @supabase/supabase-js
// to keep the dep tree light — same approach as repository.supabase.ts.

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

function authUrl(path: string) {
  if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required for auth");
  return `${SUPABASE_URL}/auth/v1${path}`;
}

export interface OtpRequest {
  email: string;
  emailRedirectTo: string;
}

// Triggers a magic-link email. The recipient clicks the link, Supabase verifies
// it on its side, then redirects to `emailRedirectTo` with the access/refresh
// tokens in the URL hash fragment (implicit flow).
export async function sendMagicLink({ email, emailRedirectTo }: OtpRequest): Promise<void> {
  if (!ANON_KEY) throw new Error("SUPABASE_ANON_KEY is required for auth");

  const res = await fetch(authUrl("/otp"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify({
      email,
      options: {
        emailRedirectTo,
        // create_user: true is GoTrue's default; surfacing here for clarity.
        shouldCreateUser: true,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`supabase otp ${res.status}: ${await res.text()}`);
  }
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function refreshSession(refreshToken: string): Promise<RefreshResult | null> {
  if (!ANON_KEY) throw new Error("SUPABASE_ANON_KEY is required for auth");

  const res = await fetch(authUrl("/token?grant_type=refresh_token"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
  };
}
