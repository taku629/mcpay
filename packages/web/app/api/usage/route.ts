import { NextResponse } from "next/server";
import { store, type UsageRecord } from "@/lib/store";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, reason: "missing_bearer" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Partial<UsageRecord> | null;
  if (!body?.projectId || !body.apiKey || !body.toolName || typeof body.amountUsd !== "number") {
    return NextResponse.json({ ok: false, reason: "invalid_payload" }, { status: 400 });
  }

  const project = store.projects.get(body.projectId);
  if (!project) {
    return NextResponse.json({ ok: false, reason: "unknown_project" }, { status: 404 });
  }

  const projectSecret = auth.slice("Bearer ".length);
  if (projectSecret !== project.apiSecret) {
    return NextResponse.json({ ok: false, reason: "bad_secret" }, { status: 401 });
  }

  const key = store.customerKeys.get(body.apiKey);
  if (key && key.projectId === body.projectId) {
    key.consumedThisMonthUsd += body.amountUsd;
  }

  store.usage.push({
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
