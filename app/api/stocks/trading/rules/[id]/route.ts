import { NextResponse } from "next/server";
import {
  deleteTradingRule,
  getTradingRule,
  updateTradingRule,
  type OrderType,
  type RuleStatus,
} from "@/app/stocks/trading/rule-store";

type RuleRouteProps = {
  params: Promise<{ id: string }>;
};

type PatchBody = {
  name?: unknown;
  params?: unknown;
  orderType?: unknown;
  quantity?: unknown;
  limitPrice?: unknown;
  status?: unknown;
  cooldownSeconds?: unknown;
};

function parseRuleId(id: string) {
  const ruleId = Number(id);
  if (!Number.isInteger(ruleId) || ruleId <= 0) return null;
  return ruleId;
}

export async function GET(
  _request: Request,
  { params }: RuleRouteProps
) {
  try {
    const { id } = await params;
    const ruleId = parseRuleId(id);
    if (ruleId == null) {
      return NextResponse.json(
        { error: "유효하지 않은 규칙 ID입니다." },
        { status: 400 }
      );
    }

    const rule = getTradingRule(ruleId);
    if (!rule) {
      return NextResponse.json(
        { error: "규칙을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ rule });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: RuleRouteProps
) {
  try {
    const { id } = await params;
    const ruleId = parseRuleId(id);
    if (ruleId == null) {
      return NextResponse.json(
        { error: "유효하지 않은 규칙 ID입니다." },
        { status: 400 }
      );
    }

    const existing = getTradingRule(ruleId);
    if (!existing) {
      return NextResponse.json(
        { error: "규칙을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const body = (await request.json()) as PatchBody;
    const patch: {
      name?: string;
      params?: Record<string, unknown>;
      orderType?: OrderType;
      quantity?: string;
      limitPrice?: string | null;
      status?: RuleStatus;
      cooldownSeconds?: number;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { error: "이름은 비어 있을 수 없습니다." },
          { status: 400 }
        );
      }
      patch.name = body.name.trim();
    }

    if (body.params !== undefined) {
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
      patch.params = body.params as Record<string, unknown>;
    }

    if (body.orderType !== undefined) {
      if (body.orderType !== "MARKET" && body.orderType !== "LIMIT") {
        return NextResponse.json(
          { error: "orderType은 MARKET 또는 LIMIT여야 합니다." },
          { status: 400 }
        );
      }
      patch.orderType = body.orderType;
    }

    if (body.quantity !== undefined) {
      const quantity =
        typeof body.quantity === "number"
          ? String(body.quantity)
          : typeof body.quantity === "string"
            ? body.quantity.trim()
            : "";
      const number = Number(quantity);
      if (!quantity || !Number.isFinite(number) || number <= 0) {
        return NextResponse.json(
          { error: "quantity는 양수여야 합니다." },
          { status: 400 }
        );
      }
      patch.quantity = quantity;
    }

    if (body.limitPrice !== undefined) {
      if (body.limitPrice === null) {
        patch.limitPrice = null;
      } else if (
        typeof body.limitPrice === "string" ||
        typeof body.limitPrice === "number"
      ) {
        patch.limitPrice = String(body.limitPrice);
      } else {
        return NextResponse.json(
          { error: "limitPrice 형식이 올바르지 않습니다." },
          { status: 400 }
        );
      }
    }

    if (body.status !== undefined) {
      if (
        body.status !== "ACTIVE" &&
        body.status !== "PAUSED" &&
        body.status !== "DISABLED"
      ) {
        return NextResponse.json(
          { error: "status는 ACTIVE, PAUSED, DISABLED 중 하나여야 합니다." },
          { status: 400 }
        );
      }
      patch.status = body.status;
    }

    if (body.cooldownSeconds !== undefined) {
      const cooldown =
        typeof body.cooldownSeconds === "number"
          ? body.cooldownSeconds
          : typeof body.cooldownSeconds === "string"
            ? Number(body.cooldownSeconds)
            : NaN;
      if (!Number.isInteger(cooldown) || cooldown < 0) {
        return NextResponse.json(
          { error: "cooldownSeconds는 0 이상의 정수여야 합니다." },
          { status: 400 }
        );
      }
      patch.cooldownSeconds = cooldown;
    }

    updateTradingRule(ruleId, patch);
    const rule = getTradingRule(ruleId);
    return NextResponse.json({ rule });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: RuleRouteProps
) {
  try {
    const { id } = await params;
    const ruleId = parseRuleId(id);
    if (ruleId == null) {
      return NextResponse.json(
        { error: "유효하지 않은 규칙 ID입니다." },
        { status: 400 }
      );
    }

    const existing = getTradingRule(ruleId);
    if (!existing) {
      return NextResponse.json(
        { error: "규칙을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    deleteTradingRule(ruleId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
