import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight health probe. Returns 200 with subsystem status if everything is
// reachable, 503 otherwise. Safe to expose publicly — no secrets, no
// project-specific data.
//
// Subsystems:
//  - repo:    can we read the seed project?
//  - stripe:  is STRIPE_SECRET_KEY configured? (we don't ping Stripe — that
//             would burn a request on every probe)
//  - upstash: is the Redis backend configured?

interface SubsystemStatus {
  ok: boolean;
  reason?: string;
}

interface HealthResponse {
  ok: boolean;
  version: string;
  uptimeSeconds: number;
  subsystems: {
    repo: SubsystemStatus;
    stripe: SubsystemStatus;
    upstash: SubsystemStatus;
  };
}

const startedAt = Date.now();

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const subsystems: HealthResponse["subsystems"] = {
    repo: await checkRepo(),
    stripe: checkStripe(),
    upstash: checkUpstash(),
  };

  const allOk = Object.values(subsystems).every((s) => s.ok);

  return NextResponse.json(
    {
      ok: allOk,
      version: process.env.npm_package_version ?? "0.1.0",
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      subsystems,
    },
    { status: allOk ? 200 : 503 },
  );
}

async function checkRepo(): Promise<SubsystemStatus> {
  try {
    const repo = await getRepository();
    await repo.getProject("prj_demo"); // existence not required — call must just succeed
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}

function checkStripe(): SubsystemStatus {
  return process.env.STRIPE_SECRET_KEY
    ? { ok: true }
    : { ok: false, reason: "STRIPE_SECRET_KEY not set (dashboard works, paid checkout will fail)" };
}

function checkUpstash(): SubsystemStatus {
  const configured =
    !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
  // Upstash is optional — its absence isn't a failure, just a downgrade.
  return configured
    ? { ok: true }
    : { ok: true, reason: "upstash not configured; using in-memory rate limit" };
}
