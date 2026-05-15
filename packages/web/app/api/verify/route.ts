import { NextResponse } from "next/server";
import { store } from "@/lib/store";

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

  const project = store.projects.get(projectId);
  if (!project) {
    return NextResponse.json({ ok: false, reason: "unknown_project" }, { status: 404 });
  }

  const projectSecret = auth.slice("Bearer ".length);
  if (projectSecret !== project.apiSecret) {
    return NextResponse.json({ ok: false, reason: "bad_secret" }, { status: 401 });
  }

  const key = store.customerKeys.get(apiKey);
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
