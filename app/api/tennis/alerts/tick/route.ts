import { NextResponse } from "next/server";
import { runAlertTick } from "@/app/tennis/run-alert-tick";
import { YcsSessionError } from "@/app/tennis/ycs-client";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.TENNIS_ALERT_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ") && auth.slice(7) === secret) {
    return true;
  }

  const headerSecret = request.headers.get("x-tennis-alert-secret");
  if (headerSecret === secret) {
    return true;
  }

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAlertTick();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof YcsSessionError) {
      return NextResponse.json(
        { ok: false, error: error.message, sessionExpired: true },
        { status: 401 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
