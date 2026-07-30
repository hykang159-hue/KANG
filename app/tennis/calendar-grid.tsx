"use client";

import { availableCourtCount } from "./slot-rules";
import type { DayAvailability, SelectedSlot, TimeSlot } from "./types";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

type CalendarGridProps = {
  year: number;
  month: number;
  days: DayAvailability[];
  selected: SelectedSlot | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectSlot: (selection: SelectedSlot) => void;
};

function buildCalendarCells(
  year: number,
  month: number,
  days: DayAvailability[],
): Array<DayAvailability | null> {
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const byDate = new Map(days.map((day) => [day.date, day]));
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: Array<DayAvailability | null> = [];

  for (let index = 0; index < firstDayOfWeek; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push(byDate.get(date) ?? { date, slots: [] });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function isSameSelection(
  selected: SelectedSlot | null,
  date: string,
  slot: TimeSlot,
): boolean {
  return (
    selected !== null &&
    selected.date === date &&
    selected.start === slot.start &&
    selected.end === slot.end
  );
}

export function CalendarGrid({
  year,
  month,
  days,
  selected,
  onPrevMonth,
  onNextMonth,
  onSelectSlot,
}: CalendarGridProps) {
  const cells = buildCalendarCells(year, month, days);
  const monthLabel = `${year}.${String(month).padStart(2, "0")}`;

  return (
    <div>
      <div className="tennis-header">
        <button
          type="button"
          className="tennis-nav-btn"
          onClick={onPrevMonth}
          aria-label="이전 달"
        >
          ‹
        </button>
        <div className="tennis-month-label">{monthLabel}</div>
        <button
          type="button"
          className="tennis-nav-btn"
          onClick={onNextMonth}
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="tennis-calendar">
        <div className="tennis-weekdays">
          {WEEKDAY_LABELS.map((label, index) => (
            <div
              key={label}
              className={`tennis-weekday${index === 0 ? " is-sunday" : ""}${index === 6 ? " is-saturday" : ""}`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="tennis-days">
          {cells.map((day, index) => {
            if (!day) {
              return (
                <div
                  key={`empty-${index}`}
                  className="tennis-day is-empty"
                  aria-hidden
                />
              );
            }

            const dayOfWeek = new Date(
              year,
              month - 1,
              Number(day.date.slice(-2)),
            ).getDay();

            return (
              <div
                key={day.date}
                className={`tennis-day${dayOfWeek === 0 ? " is-sunday" : ""}${dayOfWeek === 6 ? " is-saturday" : ""}`}
              >
                <span className="tennis-day-number">
                  {Number(day.date.slice(-2))}
                </span>
                <div className="tennis-slots">
                  {day.slots.map((slot) => {
                    const count = availableCourtCount(slot.courts);
                    const isAvailable = count > 0;
                    const isSelected = isSameSelection(selected, day.date, slot);

                    if (!isAvailable) {
                      return (
                        <div
                          key={`${slot.start}-${slot.end}`}
                          className="tennis-slot-row"
                        >
                          <span className="tennis-slot-time">
                            {slot.start}~{slot.end}
                          </span>
                          <span className="tennis-badge is-full">예약완료</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`${slot.start}-${slot.end}`}
                        className="tennis-slot-row"
                      >
                        <span className="tennis-slot-time">
                          {slot.start}~{slot.end}
                        </span>
                        <button
                          type="button"
                          className={`tennis-badge is-available${isSelected ? " is-selected" : ""}`}
                          onClick={() =>
                            onSelectSlot({
                              date: day.date,
                              start: slot.start,
                              end: slot.end,
                              courts: slot.courts,
                            })
                          }
                        >
                          예약가능 ({count})
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
