"use client";

import type { SelectedSlot } from "./types";

type CourtPanelProps = {
  selected: SelectedSlot | null;
  onClose: () => void;
};

function formatDateLabel(date: string): string {
  const [year, month, day] = date.split("-");
  return `${year}.${month}.${day}`;
}

export function CourtPanel({ selected, onClose }: CourtPanelProps) {
  const isOpen = selected !== null;
  const availableCourts =
    selected?.courts.filter((court) => court.available) ?? [];

  return (
    <aside
      className={`tennis-panel${isOpen ? " is-open" : ""}`}
      aria-hidden={!isOpen}
      aria-label="예약 가능 코트"
    >
      {selected ? (
        <>
          <header className="tennis-panel-header">
            <div>
              <h2 className="tennis-panel-title">
                {formatDateLabel(selected.date)}
              </h2>
              <p className="tennis-panel-subtitle">
                {selected.start}~{selected.end} · 가능 {availableCourts.length}
                코트
              </p>
            </div>
            <button
              type="button"
              className="tennis-panel-close"
              onClick={onClose}
              aria-label="패널 닫기"
            >
              ×
            </button>
          </header>
          <div className="tennis-panel-body">
            <p className="tennis-panel-hint">
              모니터링 전용입니다. 예약은 YCS 원 사이트에서 진행하세요.
            </p>
            {availableCourts.length === 0 ? (
              <p className="tennis-empty-courts">예약 가능한 코트가 없습니다.</p>
            ) : (
              <ul className="tennis-court-list">
                {availableCourts.map((court) => (
                  <li
                    key={court.courtId}
                    className="tennis-court-card is-available"
                  >
                    <p className="tennis-court-name">{court.courtName}</p>
                    <p className="tennis-court-meta is-available">예약가능</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </aside>
  );
}
