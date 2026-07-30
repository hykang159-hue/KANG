export type SlotWindow = {
  start: string;
  end: string;
};

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function buildHourlySlots(startHour: number, endHour: number): SlotWindow[] {
  const slots: SlotWindow[] = [];
  for (let hour = startHour; hour < endHour; hour += 1) {
    slots.push({
      start: formatHour(hour),
      end: formatHour(hour + 1),
    });
  }
  return slots;
}

function buildTwoHourSlots(startHour: number, endHour: number): SlotWindow[] {
  const slots: SlotWindow[] = [];
  for (let hour = startHour; hour < endHour; hour += 2) {
    slots.push({
      start: formatHour(hour),
      end: formatHour(hour + 2),
    });
  }
  return slots;
}

/** 0 = Sunday … 6 = Saturday */
export function isWeekend(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * Weekday (Mon–Fri): 06:00–22:00 in 1-hour slots.
 * Weekend (Sat–Sun): 06:00–15:00 hourly, 15:00–21:00 two-hour, 21:00–22:00 hourly.
 */
export function getSlotWindowsForDay(dayOfWeek: number): SlotWindow[] {
  if (!isWeekend(dayOfWeek)) {
    return buildHourlySlots(6, 22);
  }

  return [
    ...buildHourlySlots(6, 15),
    ...buildTwoHourSlots(15, 21),
    ...buildHourlySlots(21, 22),
  ];
}

export function availableCourtCount(courts: { available: boolean }[]): number {
  return courts.filter((court) => court.available).length;
}
