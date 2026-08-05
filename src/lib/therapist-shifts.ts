export interface ShiftDay {
  day: string;
  unavailable: boolean;
  start: string;
  end: string;
}

export interface ShiftTherapist {
  weeklyAvailability?: ShiftDay[] | undefined;
}

export interface TherapistShiftStatus {
  startsDuringShift: boolean;
  serviceEndsAfterShift: boolean;
  cleanupEndsAfterShift: boolean;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const parseTime = (value: string) => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toLowerCase();
  if (minute < 0 || minute > 59) return null;

  if (period) {
    if (hour < 1 || hour > 12) return null;
    hour %= 12;
    if (period === "pm") hour += 12;
  } else if (hour < 0 || hour > 23) {
    return null;
  }

  return hour * 60 + minute;
};

const finiteMinutes = (value: number) =>
  Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

export const therapistShiftStatus = (
  therapist: ShiftTherapist,
  start: string,
  duration: number,
  cleanupMinutes: number,
): TherapistShiftStatus => {
  const schedule =
    therapist.weeklyAvailability ??
    WEEKDAYS.map((day) => ({
      day,
      unavailable: false,
      start: "09:00",
      end: "17:00",
    }));

  const date = new Date(start);
  if (Number.isNaN(date.getTime())) {
    return {
      startsDuringShift: false,
      serviceEndsAfterShift: false,
      cleanupEndsAfterShift: false,
    };
  }

  const dayName = WEEKDAYS[date.getDay()]!;
  const day = schedule.find((entry) => entry.day.trim().toLowerCase() === dayName.toLowerCase());
  const shiftStart = day ? parseTime(day.start) : null;
  const shiftEnd = day ? parseTime(day.end) : null;

  if (
    !day ||
    day.unavailable ||
    shiftStart === null ||
    shiftEnd === null ||
    shiftEnd <= shiftStart
  ) {
    return {
      startsDuringShift: false,
      serviceEndsAfterShift: false,
      cleanupEndsAfterShift: false,
    };
  }

  const appointmentStart = date.getHours() * 60 + date.getMinutes();
  const serviceEnd = appointmentStart + finiteMinutes(duration);
  const cleanupEnd = serviceEnd + finiteMinutes(cleanupMinutes);
  const startsDuringShift = appointmentStart >= shiftStart && appointmentStart < shiftEnd;
  const serviceEndsAfterShift = startsDuringShift && serviceEnd > shiftEnd;
  const cleanupEndsAfterShift =
    startsDuringShift && !serviceEndsAfterShift && cleanupEnd > shiftEnd;

  return {
    startsDuringShift,
    serviceEndsAfterShift,
    cleanupEndsAfterShift,
  };
};
