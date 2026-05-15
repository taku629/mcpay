import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateApiSecret, hashApiSecret } from "@/lib/secret-hash";

// Create a project. Returns the freshly minted api_secret in *plaintext* —
// once. We store only the hash; the user has to copy it now or rotate later.

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  if (!body.name || body.name.length > 80) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  const projectId = `prj_${randomId(10)}`;
  const apiSecret = generateApiSecret();
  const apiSecretHash = hashApiSecret(apiSecret);

  // TODO: persist via Repository once createProject is added (out of scope
  // for the MVP — for now the dashboard ships with the seeded prj_demo).
  return NextResponse.json({
    id: projectId,
    name: body.name,
    apiSecret,
    apiSecretHash,
    notice:
      "Save this api_secret now — it is shown only once. The server only stores its hash.",
  });
}

function randomId(len: number): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (const b of buf) out += chars[b % chars.length];
  return out;
}
