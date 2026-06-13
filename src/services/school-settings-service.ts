import { db } from "@/lib/db";
import {
  DEFAULT_SCHOOL_SETTINGS,
  SCHOOL_DAY_VALUES,
  isSchoolDay,
  normalizeCheckoutWarningTime,
  normalizeHolidayDates,
  type SchoolDay,
  type SchoolSettings,
  type SchoolSettingsInput,
} from "@/types/settings";

const SETTINGS_ID = "main";

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function normalizeWeekendDays(value: unknown): SchoolDay[] {
  if (value === null || value === undefined) {
    return [...DEFAULT_SCHOOL_SETTINGS.weekendDays];
  }

  return Array.from(new Set(toArray(value).filter(isSchoolDay)));
}

function toSchoolSettings(record: any): SchoolSettings {
  const now = new Date();

  return {
    id: String(record?.id ?? DEFAULT_SCHOOL_SETTINGS.id),
    weekendDays: normalizeWeekendDays(record?.weekendDays),
    customHolidayDates: normalizeHolidayDates(toArray(record?.customHolidayDates)),
    checkoutWarningTime: normalizeCheckoutWarningTime(record?.checkoutWarningTime),
    notes: record?.notes ? String(record.notes) : null,
    createdAt: record?.createdAt ? new Date(record.createdAt) : now,
    updatedAt: record?.updatedAt ? new Date(record.updatedAt) : now,
  };
}

export async function getSchoolSettings(): Promise<SchoolSettings> {
  try {
    const existing = await db.schoolSetting.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (!existing) {
      return toSchoolSettings(DEFAULT_SCHOOL_SETTINGS);
    }

    return toSchoolSettings(existing);
  } catch (error) {
    console.error("[getSchoolSettings] Falling back to defaults:", error);
    return toSchoolSettings(DEFAULT_SCHOOL_SETTINGS);
  }
}

export async function saveSchoolSettings(input: SchoolSettingsInput): Promise<SchoolSettings> {
  const normalizedWeekendDays = Array.from(new Set(input.weekendDays.filter(isSchoolDay)));

  const data = {
    id: SETTINGS_ID,
    weekendDays: normalizedWeekendDays,
    customHolidayDates: normalizeHolidayDates(input.customHolidayDates),
    checkoutWarningTime: normalizeCheckoutWarningTime(input.checkoutWarningTime),
    notes: input.notes?.trim() || null,
  };

  const existing = await db.schoolSetting.findUnique({ where: { id: SETTINGS_ID } });

  const saved = existing
    ? await db.schoolSetting.update({ where: { id: SETTINGS_ID }, data })
    : await db.schoolSetting.create({ data });

  return toSchoolSettings(saved);
}

export function getWeekdayKey(date: Date): SchoolDay {
  return SCHOOL_DAY_VALUES[date.getDay()];
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isConfiguredHoliday(date: Date, settings: Pick<SchoolSettings, "weekendDays" | "customHolidayDates">): boolean {
  const weekday = getWeekdayKey(date);
  const dateKey = formatDateKey(date);

  return settings.weekendDays.includes(weekday) || settings.customHolidayDates.includes(dateKey);
}

export async function getPreviousConfiguredSchoolDay(date: Date): Promise<Date> {
  const settings = await getSchoolSettings();
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  previous.setHours(0, 0, 0, 0);

  for (let i = 0; i < 370; i += 1) {
    if (!isConfiguredHoliday(previous, settings)) {
      return previous;
    }
    previous.setDate(previous.getDate() - 1);
  }

  return previous;
}
