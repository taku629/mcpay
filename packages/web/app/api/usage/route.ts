import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRepository, type UsageRecord } from "@/lib/repository";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, reason: "missing_bearer" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Partial<UsageRecord> | null;
  if (!body?.projectId || !body.apiKey || !body.toolName || typeof body.amountUsd !== "number") {
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
  if (projectSecret !== project.apiSecret) {
    return NextResponse.json({ ok: false, reason: "bad_secret" }, { status: 401 });
  }

  await repo.incrementConsumption(body.apiKey, body.amountUsd);
  await repo.recordUsage({
    id: `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    projectId: body.projectId,
    apiKey: body.apiKey,
    toolName: body.toolName,
    amountUsd: body.amountUsd,
    tokens: body.tokens,
    timestamp: body.timestamp ?? new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
