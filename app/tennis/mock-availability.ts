import { getSlotWindowsForDay } from "./slot-rules";
import type { CourtSlot, DayAvailability, TimeSlot } from "./types";

const COURT_COUNT = 5;

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function buildCourts(seed: number): CourtSlot[] {
  return Array.from({ length: COURT_COUNT }, (_, index) => {
    const courtNumber = index + 1;
    // Deterministic pseudo-availability from date/slot seed.
    const available = (seed * 17 + courtNumber * 31) % 7 !== 0;
    return {
      courtId: String(courtNumber),
      courtName: `${courtNumber}코트`,
      available,
    };
  });
}

function buildSlotsForDate(date: Date): TimeSlot[] {
  const dayOfWeek = date.getDay();
  const daySeed =
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const windows = getSlotWindowsForDay(dayOfWeek);

  return windows.map((window, index) => ({
    start: window.start,
    end: window.end,
    courts: buildCourts(daySeed + index * 13),
  }));
}

export function generateMockMonth(
  year: number,
  month: number,
): DayAvailability[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: DayAvailability[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    days.push({
      date: `${year}-${padDatePart(month)}-${padDatePart(day)}`,
      slots: buildSlotsForDate(date),
    });
  }

  return days;
}
