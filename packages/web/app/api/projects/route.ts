import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRepository } from "@/lib/repository";
import { generateApiSecret, hashApiSecret } from "@/lib/secret-hash";

// Create a project. Returns the freshly minted api_secret in *plaintext* —
// once. We persist only the hash; the user has to copy it now or rotate later.

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  if (!body.name || body.name.length > 80) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  const apiSecret = generateApiSecret();
  const apiSecretHash = hashApiSecret(apiSecret);

  const repo = await getRepository();
  const project = await repo.createProject({
    ownerId: user.id,
    name: body.name,
    apiSecretHash,
  });

  return NextResponse.json({
    id: project.id,
    name: project.name,
    apiSecret,
    notice:
      "Save this api_secret now — it is shown only once. The server only stores its hash.",
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const repo = await getRepository();
  const projects = await repo.listProjectsByOwner(user.id);
  return NextResponse.json({
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      stripeAccountId: p.stripeAccountId,
      createdAt: p.createdAt,
    })),
  });
}
