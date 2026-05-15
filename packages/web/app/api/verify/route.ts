import { NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRepository } from "@/lib/repository";
import { verifyApiSecret } from "@/lib/secret-hash";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, reason: "missing_bearer" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    projectId?: string;
    apiKey?: string;
  };

  const { projectId, apiKey } = body;
  if (!projectId || !apiKey) {
    return NextResponse.json(
      { ok: false, reason: "missing_project_id_or_api_key" },
      { status: 400 },
    );
  }

  const rate = checkRateLimit(`verify:${projectId}`, { limit: 600, windowMs: 60_000 });
  if (!rate.ok) {
    log.warn("verify rate limited", { projectId, retryAfterMs: rate.retryAfterMs });
    return NextResponse.json(
      { ok: false, reason: "rate_limited", retryAfterMs: rate.retryAfterMs },
      { status: 429, headers: { "retry-after": String(Math.ceil(rate.retryAfterMs / 1000)) } },
    );
  }

  const repo = await getRepository();
  const project = await repo.getProject(projectId);
  if (!project) {
    return NextResponse.json({ ok: false, reason: "unknown_project" }, { status: 404 });
  }

  const projectSecret = auth.slice("Bearer ".length);
  if (!verifyApiSecret(projectSecret, project.apiSecret)) {
    return NextResponse.json({ ok: false, reason: "bad_secret" }, { status: 401 });
  }

  const key = await repo.getCustomerKey(apiKey);
  if (!key || key.projectId !== projectId) {
    return NextResponse.json({ ok: false, reason: "unknown_key" }, { status: 404 });
  }
  if (key.revokedAt) {
    return NextResponse.json({ ok: false, reason: "revoked" }, { status: 403 });
  }

  const remaining =
    key.monthlyBudgetUsd !== undefined
      ? Math.max(0, key.monthlyBudgetUsd - key.consumedThisMonthUsd)
      : undefined;

  return NextResponse.json({
    ok: true,
    customerId: key.customerId,
    remainingBudgetUsd: remaining,
  });
}
