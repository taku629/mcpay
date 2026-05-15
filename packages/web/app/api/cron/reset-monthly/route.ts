import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { getRepository } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Monthly cron: zero out customer_keys.consumed_this_month_usd on the 1st.
// Schedule (vercel.json): "0 0 1 * *" — midnight UTC on the 1st of each month.

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const repo = await getRepository();
  const reset = await repo.resetAllMonthlyConsumption();
  return NextResponse.json({ ok: true, keysReset: reset });
}
