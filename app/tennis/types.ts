export type CourtSlot = {
  courtId: string;
  courtName: string;
  available: boolean;
};

export type TimeSlot = {
  start: string;
  end: string;
  courts: CourtSlot[];
};

export type DayAvailability = {
  date: string;
  slots: TimeSlot[];
};

export type AvailabilityResponse = {
  year: number;
  month: number;
  days: DayAvailability[];
  source: "mock" | "ycs";
  sessionExpired?: boolean;
};

export type SelectedSlot = {
  date: string;
  start: string;
  end: string;
  courts: CourtSlot[];
};
