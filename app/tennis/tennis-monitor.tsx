"use client";

import { useEffect, useState } from "react";
import { CalendarGrid } from "./calendar-grid";
import { CourtPanel } from "./court-panel";
import type {
  AvailabilityResponse,
  DayAvailability,
  SelectedSlot,
} from "./types";

function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

function formatLoadedAt(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function TennisMonitor() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<DayAvailability[]>([]);
  const [source, setSource] = useState<"mock" | "ycs" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSelected(null);

    async function loadAvailability() {
      try {
        const refreshQuery = refreshToken > 0 ? "&refresh=1" : "";
        const response = await fetch(
          `/api/tennis/availability?year=${year}&month=${month}${refreshQuery}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const payload = (await response.json()) as AvailabilityResponse & {
          error?: string;
          sessionExpired?: boolean;
        };

        if (!response.ok) {
          if (payload.sessionExpired) {
            throw new Error(
              payload.error ??
                "YCS 세션이 만료되었습니다. .env.local의 계정/쿠키를 갱신한 뒤 서버를 재시작하세요.",
            );
          }
          throw new Error(payload.error ?? "예약 현황을 불러오지 못했습니다.");
        }

        setDays(payload.days);
        setSource(payload.source);
        setLoadedAt(new Date());
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          loadError instanceof Error
            ? loadError.message
            : "예약 현황을 불러오지 못했습니다.";
        setDays([]);
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadAvailability();
    return () => controller.abort();
  }, [year, month, refreshToken]);

  function handlePrevMonth() {
    const next = shiftMonth(year, month, -1);
    setYear(next.year);
    setMonth(next.month);
  }

  function handleNextMonth() {
    const next = shiftMonth(year, month, 1);
    setYear(next.year);
    setMonth(next.month);
  }

  function handleRefresh() {
    setRefreshToken((token) => token + 1);
  }

  return (
    <div className="tennis-shell">
      <div className={`tennis-main${selected ? " is-panel-open" : ""}`}>
        <div className="tennis-toolbar">
          {loading ? (
            <p className="tennis-status">불러오는 중…</p>
          ) : error ? (
            <p className="tennis-status is-error">{error}</p>
          ) : source ? (
            <p className="tennis-status">
              데이터 소스: {source === "mock" ? "목업" : "YCS"}
              {loadedAt ? ` · 갱신 ${formatLoadedAt(loadedAt)}` : ""}
            </p>
          ) : (
            <p className="tennis-status" />
          )}
          <button
            type="button"
            className="tennis-refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? "불러오는 중…" : "새로고침"}
          </button>
        </div>

        <CalendarGrid
          year={year}
          month={month}
          days={days}
          selected={selected}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onSelectSlot={setSelected}
        />
      </div>

      <CourtPanel selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
