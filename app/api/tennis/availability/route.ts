import { NextResponse } from "next/server";
import { generateMockMonth } from "@/app/tennis/mock-availability";
import {
  fetchMonthAvailability,
  YcsSessionError,
} from "@/app/tennis/ycs-client";
import type { AvailabilityResponse } from "@/app/tennis/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseYearMonth(searchParams: URLSearchParams): {
  year: number;
  month: number;
} | null {
  const yearRaw = searchParams.get("year");
  const monthRaw = searchParams.get("month");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return { year, month };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseYearMonth(searchParams);

    if (!parsed) {
      return NextResponse.json(
        { error: "Query params year and month (1-12) are required." },
        { status: 400 },
      );
    }

    const dataSource = process.env.TENNIS_DATA_SOURCE ?? "mock";
    const { year, month } = parsed;

    if (dataSource === "ycs") {
      try {
        const bypassCache =
          searchParams.get("refresh") === "1" ||
          searchParams.get("refresh") === "true";
        const days = await fetchMonthAvailability(year, month, { bypassCache });
        const body: AvailabilityResponse = {
          year,
          month,
          days,
          source: "ycs",
        };
        return NextResponse.json(body);
      } catch (error) {
        if (error instanceof YcsSessionError) {
          return NextResponse.json(
            {
              error: error.message,
              sessionExpired: true,
            },
            { status: 401 },
          );
        }
        throw error;
      }
    }

    const body: AvailabilityResponse = {
      year,
      month,
      days: generateMockMonth(year, month),
      source: "mock",
    };

    return NextResponse.json(body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
