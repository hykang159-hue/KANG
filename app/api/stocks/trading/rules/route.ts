import { NextResponse } from "next/server";
import { normalizeSymbol, parseMarket } from "@/app/stocks/normalize-symbol";
import {
  createTradingRule,
  getTradingRule,
  listTradingRules,
  type ConditionType,
  type OrderType,
  type RuleStatus,
  type TradeSide,
} from "@/app/stocks/trading/rule-store";

const conditionTypes = new Set<ConditionType>([
  "priceAbove",
  "priceBelow",
  "pctChange",
  "smaCross",
  "breakoutHigh",
  "breakdownLow",
  "takeProfitPct",
  "stopLossPct",
]);

type CreateBody = {
  name?: unknown;
  symbol?: unknown;
  market?: unknown;
  marketCountry?: unknown;
  side?: unknown;
  conditionType?: unknown;
  params?: unknown;
  orderType?: unknown;
  quantity?: unknown;
  limitPrice?: unknown;
  status?: unknown;
  cooldownSeconds?: unknown;
};

function parseName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name || null;
}

function parseQuantity(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(value);
  }
  if (typeof value === "string" && value.trim()) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return value.trim();
  }
  return null;
}

function parseCooldown(value: unknown) {
  if (value == null) return 3600;
  const number =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(number) || number < 0) return null;
  return number;
}

export async function GET() {
  try {
    const rules = listTradingRules();
    return NextResponse.json({ rules });
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
    const rawSymbol = typeof body.symbol === "string" ? body.symbol : "";
    const marketRaw =
      typeof body.marketCountry === "string"
        ? body.marketCountry
        : typeof body.market === "string"
          ? body.market
          : "";

    if (marketRaw !== "KR" && marketRaw !== "US") {
      return NextResponse.json(
        { error: "marketCountry는 KR 또는 US여야 합니다." },
        { status: 400 }
      );
    }

    const marketCountry = parseMarket(marketRaw);
    const normalized = normalizeSymbol(rawSymbol, marketCountry);

    if (!name) {
      return NextResponse.json(
        { error: "이름은 비어 있을 수 없습니다." },
        { status: 400 }
      );
    }

    if (!normalized.ok) {
      return NextResponse.json(
        { error: "유효하지 않은 심볼입니다." },
        { status: 400 }
      );
    }

    if (body.side !== "BUY" && body.side !== "SELL") {
      return NextResponse.json(
        { error: "side는 BUY 또는 SELL이어야 합니다." },
        { status: 400 }
      );
    }

    if (
      typeof body.conditionType !== "string" ||
      !conditionTypes.has(body.conditionType as ConditionType)
    ) {
      return NextResponse.json(
        { error: "지원하지 않는 conditionType입니다." },
        { status: 400 }
      );
    }

    if (
      !body.params ||
      typeof body.params !== "object" ||
      Array.isArray(body.params)
    ) {
      return NextResponse.json(
        { error: "params는 객체여야 합니다." },
        { status: 400 }
      );
    }

    const quantity = parseQuantity(body.quantity);
    if (!quantity) {
      return NextResponse.json(
        { error: "quantity는 양수여야 합니다." },
        { status: 400 }
      );
    }

    const orderType: OrderType =
      body.orderType === "LIMIT" ? "LIMIT" : "MARKET";
    const limitPrice =
      typeof body.limitPrice === "string" || typeof body.limitPrice === "number"
        ? String(body.limitPrice)
        : null;

    if (orderType === "LIMIT" && !limitPrice) {
      return NextResponse.json(
        { error: "LIMIT 주문은 limitPrice가 필요합니다." },
        { status: 400 }
      );
    }

    const status: RuleStatus =
      body.status === "PAUSED" || body.status === "DISABLED"
        ? body.status
        : "ACTIVE";

    const cooldownSeconds = parseCooldown(body.cooldownSeconds);
    if (cooldownSeconds == null) {
      return NextResponse.json(
        { error: "cooldownSeconds는 0 이상의 정수여야 합니다." },
        { status: 400 }
      );
    }

    const ruleId = createTradingRule({
      name,
      symbol: normalized.symbol,
      marketCountry,
      side: body.side as TradeSide,
      conditionType: body.conditionType as ConditionType,
      params: body.params as Record<string, unknown>,
      orderType,
      quantity,
      limitPrice,
      status,
      cooldownSeconds,
    });

    const rule = getTradingRule(ruleId);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
