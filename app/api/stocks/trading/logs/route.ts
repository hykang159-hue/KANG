import { NextResponse } from "next/server";
import { listSignalLogs } from "@/app/stocks/trading/rule-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 50;
    const logs = listSignalLogs(
      Number.isFinite(limit) ? limit : 50
    );
    return NextResponse.json({ logs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
