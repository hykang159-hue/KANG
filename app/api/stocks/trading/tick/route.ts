import { NextResponse } from "next/server";
import { runTradingTick } from "@/app/stocks/trading/engine";

function authorizeTick(request: Request) {
  const secret = process.env.TRADING_TICK_SECRET;
  if (!secret) {
    // 시크릿 미설정 시 로컬 개발 허용
    return true;
  }

  const header = request.headers.get("authorization");
  if (!header) return false;
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token === secret;
}

export async function POST(request: Request) {
  try {
    if (!authorizeTick(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runTradingTick();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    console.error("[trading] tick failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
