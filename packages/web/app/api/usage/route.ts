import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRepository, type UsageRecord } from "@/lib/repository";
import { verifyApiSecret } from "@/lib/secret-hash";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, reason: "missing_bearer" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | (Partial<UsageRecord> & { requestId?: string }) | null;
  const requestId = body?.requestId ?? body?.id;
  if (
    !body?.projectId || !body.apiKey || !body.toolName || !requestId ||
    !/^req_[A-Za-z0-9_-]{8,128}$/.test(requestId) ||
    typeof body.amountUsd !== "number" || !Number.isFinite(body.amountUsd) ||
    body.amountUsd <= 0 || body.amountUsd > 10_000 ||
    (body.tokens !== undefined && (!Number.isSafeInteger(body.tokens) || body.tokens < 0))
  ) {
    return NextResponse.json({ ok: false, reason: "invalid_payload" }, { status: 400 });
  }

  const rate = checkRateLimit(`usage:${body.projectId}`, { limit: 1200, windowMs: 60_000 });
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited", retryAfterMs: rate.retryAfterMs },
      { status: 429, headers: { "retry-after": String(Math.ceil(rate.retryAfterMs / 1000)) } },
    );
  }

  const repo = await getRepository();
  const project = await repo.getProject(body.projectId);
  if (!project) {
    return NextResponse.json({ ok: false, reason: "unknown_project" }, { status: 404 });
  }

  const projectSecret = auth.slice("Bearer ".length);
  if (!verifyApiSecret(projectSecret, project.apiSecret)) {
    return NextResponse.json({ ok: false, reason: "bad_secret" }, { status: 401 });
  }

  const outcome = await repo.ingestUsage({
    id: requestId,
    projectId: body.projectId,
    apiKey: body.apiKey,
    toolName: body.toolName,
    amountUsd: body.amountUsd,
    tokens: body.tokens,
    // Server receipt time defines billing windows; callers cannot backdate usage.
    timestamp: new Date().toISOString(),
  });

  if (outcome === "duplicate") return NextResponse.json({ ok: true, duplicate: true });
  if (outcome === "budget_exceeded") {
    return NextResponse.json({ ok: false, reason: outcome }, { status: 409 });
  }
  if (outcome !== "recorded") {
    const status = outcome === "revoked" ? 403 : 404;
    return NextResponse.json({ ok: false, reason: outcome }, { status });
  }

  return NextResponse.json({ ok: true });
}
