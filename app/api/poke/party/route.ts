import { NextResponse } from "next/server";
import { listParties } from "@/app/poke/party-store";

export async function GET() {
  try {
    const parties = listParties();
    return NextResponse.json({ parties });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
