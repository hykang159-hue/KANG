/** HH:mm → minutes from midnight */
export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export type AlertWindow = {
  start: string;
  end: string;
};

/** Weekday 18:00–22:00, weekend 17:00–22:00 (Asia/Seoul day-of-week). */
export function getAlertWindowForDay(dayOfWeek: number): AlertWindow {
  // 0 = Sunday … 6 = Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { start: "17:00", end: "22:00" };
  }
  return { start: "18:00", end: "22:00" };
}

export function slotOverlapsWindow(
  slotStart: string,
  slotEnd: string,
  window: AlertWindow,
): boolean {
  const start = timeToMinutes(slotStart);
  const end = timeToMinutes(slotEnd);
  const windowStart = timeToMinutes(window.start);
  const windowEnd = timeToMinutes(window.end);
  return start < windowEnd && end > windowStart;
}

export type AlertOpening = {
  date: string;
  start: string;
  end: string;
  courtId: string;
  courtName: string;
};

export function openingKey(opening: AlertOpening): string {
  return `${opening.date}|${opening.start}|${opening.end}|${opening.courtId}`;
}
