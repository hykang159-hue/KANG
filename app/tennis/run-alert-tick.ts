import {
  filterNewOpenings,
  markOpeningsNotified,
} from "./alert-store";
import {
  getAlertWindowForDay,
  slotOverlapsWindow,
  type AlertOpening,
} from "./alert-windows";
import { sendTelegramMessage } from "./telegram";
import type { DayAvailability } from "./types";
import { fetchMonthAvailability } from "./ycs-client";

const SEOUL_TZ = "Asia/Seoul";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function seoulParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return { year, month, day };
}

function addDays(year: number, month: number, day: number, delta: number) {
  const utc = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function dayOfWeekSeoul(year: number, month: number, day: number): number {
  // Noon UTC avoids DST edge issues; Korea has no DST.
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0)).getUTCDay();
}

function collectOpenings(days: DayAvailability[]): AlertOpening[] {
  const openings: AlertOpening[] = [];
  for (const day of days) {
    const [year, month, dayNum] = day.date.split("-").map(Number);
    const window = getAlertWindowForDay(dayOfWeekSeoul(year, month, dayNum));
    for (const slot of day.slots) {
      if (!slotOverlapsWindow(slot.start, slot.end, window)) {
        continue;
      }
      for (const court of slot.courts) {
        if (!court.available) {
          continue;
        }
        openings.push({
          date: day.date,
          start: slot.start,
          end: slot.end,
          courtId: court.courtId,
          courtName: court.courtName,
        });
      }
    }
  }
  return openings;
}

function formatAlertMessage(openings: AlertOpening[]): string {
  const byDate = new Map<string, AlertOpening[]>();
  for (const opening of openings) {
    const list = byDate.get(opening.date) ?? [];
    list.push(opening);
    byDate.set(opening.date, list);
  }

  const lines = ["🎾 목동테니스장 빈자리 알림", ""];
  for (const date of [...byDate.keys()].sort()) {
    lines.push(`📅 ${date}`);
    const list = (byDate.get(date) ?? []).sort((a, b) =>
      `${a.start}${a.courtId}`.localeCompare(`${b.start}${b.courtId}`),
    );
    for (const opening of list) {
      lines.push(
        `· ${opening.start}~${opening.end} ${opening.courtName}`,
      );
    }
    lines.push("");
  }
  lines.push("https://kang-nu.vercel.app");
  return lines.join("\n").trim();
}

async function loadWatchDays(): Promise<DayAvailability[]> {
  const today = seoulParts();
  const monthKeys = new Set<string>();
  const wantedDates = new Set<string>();

  for (let offset = 0; offset <= 7; offset += 1) {
    const date = addDays(today.year, today.month, today.day, offset);
    wantedDates.add(isoDate(date.year, date.month, date.day));
    monthKeys.add(`${date.year}-${pad2(date.month)}`);
  }

  const months = [...monthKeys].map((key) => {
    const [year, month] = key.split("-").map(Number);
    return { year, month };
  });

  // Sequential month fetches avoid concurrent YCS login races.
  const days: DayAvailability[] = [];
  for (const { year, month } of months) {
    const monthDays = await fetchMonthAvailability(year, month, {
      bypassCache: true,
    });
    days.push(...monthDays);
  }

  return days.filter((day) => wantedDates.has(day.date));
}

export type AlertTickResult = {
  watchedDays: number;
  openings: number;
  newOpenings: number;
  notified: boolean;
  telegramOk?: boolean;
  telegramError?: string;
  sample?: string[];
};

export async function runAlertTick(): Promise<AlertTickResult> {
  const days = await loadWatchDays();
  const openings = collectOpenings(days);
  const fresh = filterNewOpenings(openings);

  if (fresh.length === 0) {
    return {
      watchedDays: days.length,
      openings: openings.length,
      newOpenings: 0,
      notified: false,
      sample: openings.slice(0, 5).map(
        (item) =>
          `${item.date} ${item.start}~${item.end} ${item.courtName}`,
      ),
    };
  }

  const message = formatAlertMessage(fresh);
  const telegram = await sendTelegramMessage(message);
  if (telegram.ok) {
    markOpeningsNotified(fresh);
  }

  return {
    watchedDays: days.length,
    openings: openings.length,
    newOpenings: fresh.length,
    notified: telegram.ok,
    telegramOk: telegram.ok,
    telegramError: telegram.description,
    sample: fresh.slice(0, 8).map(
      (item) => `${item.date} ${item.start}~${item.end} ${item.courtName}`,
    ),
  };
}
