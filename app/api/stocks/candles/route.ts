import { NextResponse } from "next/server";
import { getCandles, type CandleInterval } from "../../../stocks/toss-client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim();
  const intervalParam = searchParams.get("interval");
  const interval: CandleInterval =
    intervalParam === "1m" ? "1m" : "1d";

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  try {
    const result = await getCandles(symbol, { interval, count: 100 });
    return NextResponse.json({
      candles: result.candles,
      interval,
    });
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status: number }).status)
        : 500;
    return NextResponse.json(
      { error: "Failed to fetch candles" },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
