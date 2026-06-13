export const SCHOOL_DAY_VALUES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type SchoolDay = (typeof SCHOOL_DAY_VALUES)[number];

export type SchoolSettings = {
  id: string;
  weekendDays: SchoolDay[];
  customHolidayDates: string[];
  checkoutWarningTime: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SchoolSettingsInput = {
  weekendDays: SchoolDay[];
  customHolidayDates: string[];
  checkoutWarningTime: string;
  notes?: string;
};

export const DEFAULT_SCHOOL_SETTINGS: Omit<SchoolSettings, "createdAt" | "updatedAt"> = {
  id: "main",
  weekendDays: ["friday", "saturday"],
  customHolidayDates: [],
  checkoutWarningTime: "12:00",
  notes: null,
};

export const SCHOOL_DAY_OPTIONS: { value: SchoolDay; label: string }[] = [
  { value: "sunday", label: "الأحد" },
  { value: "monday", label: "الاثنين" },
  { value: "tuesday", label: "الثلاثاء" },
  { value: "wednesday", label: "الأربعاء" },
  { value: "thursday", label: "الخميس" },
  { value: "friday", label: "الجمعة" },
  { value: "saturday", label: "السبت" },
];

export function isSchoolDay(value: string): value is SchoolDay {
  return (SCHOOL_DAY_VALUES as readonly string[]).includes(value);
}

export function getSchoolDayLabel(day: string): string {
  return SCHOOL_DAY_OPTIONS.find((item) => item.value === day)?.label ?? day;
}

export function normalizeCheckoutWarningTime(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim();
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
    return trimmed;
  }
  return DEFAULT_SCHOOL_SETTINGS.checkoutWarningTime;
}

export function normalizeHolidayDate(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return trimmed;
}

export function normalizeHolidayDates(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeHolidayDate(value))
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();
}

export function parseHolidayDatesText(value: string): string[] {
  return normalizeHolidayDates(
    value
      .split(/[\n,،]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function serializeHolidayDatesForTextarea(values: string[]): string {
  return normalizeHolidayDates(values).join("\n");
}
