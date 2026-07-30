import { NextResponse } from "next/server";
import { normalizeSymbol, parseMarket } from "@/app/stocks/normalize-symbol";
import { getStocks, TossApiError } from "@/app/stocks/toss-client";
import {
  addWatchlistItem,
  deleteWatchlist,
  getWatchlist,
  removeWatchlistItem,
  renameWatchlist,
} from "@/app/stocks/watchlist-store";

type WatchlistRouteProps = {
  params: Promise<{ id: string }>;
};

type RenameBody = {
  name?: unknown;
};

type AddItemBody = {
  symbol?: unknown;
  market?: unknown;
};

function parseWatchlistId(id: string) {
  const watchlistId = Number(id);
  if (!Number.isInteger(watchlistId) || watchlistId <= 0) return null;
  return watchlistId;
}

function parseName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!name) return null;
  return name;
}

export async function GET(
  _request: Request,
  { params }: WatchlistRouteProps
) {
  try {
    const { id } = await params;
    const watchlistId = parseWatchlistId(id);

    if (watchlistId === null) {
      return NextResponse.json(
        { error: "유효하지 않은 관심종목 리스트 ID입니다." },
        { status: 400 }
      );
    }

    const watchlist = getWatchlist(watchlistId);
    if (!watchlist) {
      return NextResponse.json(
        { error: "관심종목 리스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ watchlist });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: WatchlistRouteProps
) {
  try {
    const { id } = await params;
    const watchlistId = parseWatchlistId(id);

    if (watchlistId === null) {
      return NextResponse.json(
        { error: "유효하지 않은 관심종목 리스트 ID입니다." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as RenameBody;
    const name = parseName(body.name);

    if (!name) {
      return NextResponse.json(
        { error: "이름은 비어 있을 수 없습니다." },
        { status: 400 }
      );
    }

    const renamed = renameWatchlist(watchlistId, name);
    if (!renamed) {
      return NextResponse.json(
        { error: "관심종목 리스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const watchlist = getWatchlist(watchlistId);
    return NextResponse.json({ watchlist });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: WatchlistRouteProps
) {
  try {
    const { id } = await params;
    const watchlistId = parseWatchlistId(id);

    if (watchlistId === null) {
      return NextResponse.json(
        { error: "유효하지 않은 관심종목 리스트 ID입니다." },
        { status: 400 }
      );
    }

    const watchlist = getWatchlist(watchlistId);
    if (!watchlist) {
      return NextResponse.json(
        { error: "관심종목 리스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const body = (await request.json()) as AddItemBody;
    const rawSymbol =
      typeof body.symbol === "string" ? body.symbol : "";

    if (body.market !== "KR" && body.market !== "US") {
      return NextResponse.json(
        { error: "market은 KR 또는 US여야 합니다." },
        { status: 400 }
      );
    }

    const market = parseMarket(body.market);
    const normalized = normalizeSymbol(rawSymbol, market);
    if (!normalized.ok) {
      const errorMessage =
        normalized.error === "empty"
          ? "symbol은 비어 있을 수 없습니다."
          : normalized.error === "marketMismatch"
            ? "선택한 시장과 심볼 형식이 맞지 않습니다."
            : "유효하지 않은 심볼입니다.";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    if (watchlist.items.some((item) => item.symbol === normalized.symbol)) {
      return NextResponse.json(
        { error: "이미 추가된 종목입니다." },
        { status: 409 }
      );
    }

    let stocks;
    try {
      stocks = await getStocks([normalized.symbol]);
    } catch (error) {
      if (error instanceof TossApiError && error.status === 404) {
        return NextResponse.json(
          { error: "종목을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      throw error;
    }

    const stock = stocks[0];
    if (!stock) {
      return NextResponse.json(
        { error: "종목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    addWatchlistItem(watchlistId, {
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      currency: stock.currency,
    });

    const updatedWatchlist = getWatchlist(watchlistId);
    return NextResponse.json({ watchlist: updatedWatchlist }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";

    if (message === "이미 추가된 종목입니다.") {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    if (message === "관심종목 리스트를 찾을 수 없습니다.") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: WatchlistRouteProps
) {
  try {
    const { id } = await params;
    const watchlistId = parseWatchlistId(id);

    if (watchlistId === null) {
      return NextResponse.json(
        { error: "유효하지 않은 관심종목 리스트 ID입니다." },
        { status: 400 }
      );
    }

    const watchlist = getWatchlist(watchlistId);
    if (!watchlist) {
      return NextResponse.json(
        { error: "관심종목 리스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const symbol = url.searchParams.get("symbol")?.trim() ?? null;

    if (symbol === null || symbol === "") {
      deleteWatchlist(watchlistId);
      return new NextResponse(null, { status: 204 });
    }

    const removed = removeWatchlistItem(watchlistId, symbol);
    if (!removed) {
      return NextResponse.json(
        { error: "관심종목에서 해당 종목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const updatedWatchlist = getWatchlist(watchlistId);
    return NextResponse.json({ watchlist: updatedWatchlist });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
