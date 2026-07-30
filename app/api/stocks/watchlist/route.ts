import { NextResponse } from "next/server";
import {
  createWatchlist,
  getWatchlist,
  listWatchlists,
} from "@/app/stocks/watchlist-store";

type CreateBody = {
  name?: unknown;
};

function parseName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!name) return null;
  return name;
}

export async function GET() {
  try {
    const watchlists = listWatchlists();
    return NextResponse.json({ watchlists });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateBody;
    const name = parseName(body.name);

    if (!name) {
      return NextResponse.json(
        { error: "이름은 비어 있을 수 없습니다." },
        { status: 400 }
      );
    }

    const watchlistId = createWatchlist(name);
    const watchlist = getWatchlist(watchlistId);

    return NextResponse.json({ watchlist }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
