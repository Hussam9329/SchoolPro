export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type AttendanceRecord = {
  id: string;
  date: Date;
  mode: string;
  status: string;
  notes: string | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  source: string | null;
  studentId: string;
  scheduleId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AttendanceFormInput = {
  date: string | Date;
  status: AttendanceStatus | string;
  notes?: string;
  studentId: string;
  scheduleId?: string;
  mode?: "check-in" | "check-out";
};

export type AttendanceBatchInput = {
  date: string | Date;
  scheduleId?: string;
  records: {
    studentId: string;
    status: AttendanceStatus | string;
    notes?: string;
  }[];
};

export type AttendanceListItem = {
  id: string;
  date: Date;
  mode: string;
  status: string;
  statusLabel: string;
  notes: string | null;

  checkInAt: Date | null;
  checkOutAt: Date | null;
  source: string | null;

  /** True when this record represents a computed absence (student has no DB record for the date). */
  isComputedAbsence?: boolean;

  studentId: string;
  studentName: string;
  studentCode: string | null;

  sectionId: string | null;
  sectionName: string | null;

  classId: string | null;
  className: string | null;
  classLevel: string | null;

  scheduleId: string | null;
  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;

  subjectId: string | null;
  subjectName: string | null;

  teacherId: string | null;
  teacherName: string | null;

  createdAt: Date;
};

export type AttendanceDetails = AttendanceListItem & {
  updatedAt: Date;
};

export type AttendanceSummary = {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  checkedIn: number;
  checkedOut: number;
  missingCheckOut: number;
  attendanceRate: number;
};

export type AttendanceStudentTotal = {
  studentId: string;
  studentName: string;
  studentCode: string | null;
  classId: string | null;
  className: string | null;
  sectionId: string | null;
  sectionName: string | null;
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  checkedIn: number;
  checkedOut: number;
  missingCheckOut: number;
  attendanceRate: number;
  lastStatus: string | null;
  lastStatusLabel: string | null;
  lastDate: Date | null;
};

export type AttendanceValidationResult = {
  valid: boolean;
  errors: Partial<Record<keyof AttendanceFormInput, string>>;
};

export type AttendanceFilter = {
  query?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
  studentId?: string;
  scheduleId?: string;
  sectionId?: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  hasCheckIn?: string;
  hasCheckOut?: string;
  missingCheckOut?: string;
  source?: string;
};

export type AttendanceScanMode = "check-in" | "check-out";

export type AttendanceScanSource = "qr" | "manual-code" | "manual-name";

export type AttendanceScanInput = {
  studentCode: string;
  mode: AttendanceScanMode;
  source?: AttendanceScanSource;
  /** ISO string of the client's local time — used instead of server time for checkInAt/checkOutAt */
  clientTime?: string;
  scheduleId?: string;
};

export type AttendanceScanResult = {
  ok: boolean;
  studentId: string;
  studentName: string;
  studentCode: string;
  status: string;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  message: string;
};

export const ATTENDANCE_STATUSES: {
  value: AttendanceStatus;
  label: string;
  tone: "success" | "danger" | "warning" | "info";
}[] = [
  {
    value: "present",
    label: "حاضر",
    tone: "success",
  },
  {
    value: "absent",
    label: "غائب",
    tone: "danger",
  },
  {
    value: "late",
    label: "متأخر",
    tone: "warning",
  },
  {
    value: "excused",
    label: "مجاز",
    tone: "info",
  },
];

export function getEmptyAttendanceForm(): AttendanceFormInput {
  return {
    date: new Date(),
    status: "present",
    notes: "",
    studentId: "",
    scheduleId: "",
    mode: "check-in",
  };
}

export function normalizeAttendanceInput(
  input: AttendanceFormInput,
): AttendanceFormInput {
  return {
    date: input.date,
    status: String(input.status || "present").trim(),
    notes: input.notes?.trim() || undefined,
    studentId: input.studentId.trim(),
    scheduleId: input.scheduleId?.trim() || undefined,
    mode: input.mode || "check-in",
  };
}

export function validateAttendanceInput(
  input: AttendanceFormInput,
): AttendanceValidationResult {
  const normalized = normalizeAttendanceInput(input);
  const errors: Partial<Record<keyof AttendanceFormInput, string>> = {};

  if (!normalized.date) {
    errors.date = "تاريخ الحضور مطلوب.";
  }

  if (normalized.date && !parseAttendanceDate(normalized.date)) {
    errors.date = "تاريخ الحضور غير صحيح.";
  }

  if (!normalized.studentId) {
    errors.studentId = "الطالب مطلوب.";
  }

  if (!normalized.status) {
    errors.status = "حالة الحضور مطلوبة.";
  }

  if (
    normalized.status &&
    !ATTENDANCE_STATUSES.some((item) => item.value === normalized.status)
  ) {
    errors.status = "حالة الحضور غير صحيحة.";
  }

  if (normalized.notes && normalized.notes.length > 500) {
    errors.notes = "الملاحظات يجب ألا تتجاوز 500 حرف.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function parseAttendanceDate(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeDateOnly(value: string | Date): Date | null {
  const parsed = parseAttendanceDate(value);

  if (!parsed) {
    return null;
  }

  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    12,
    0,
    0,
    0,
  );
}

export function getDayRange(value: string | Date): {
  start: Date;
  end: Date;
} | null {
  const parsed = parseAttendanceDate(value);

  if (!parsed) {
    return null;
  }

  const start = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    0,
    0,
    0,
    0,
  );

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    start,
    end,
  };
}

export function getAttendanceStatusLabel(status: string): string {
  return (
    ATTENDANCE_STATUSES.find((item) => item.value === status)?.label ??
    "غير محدد"
  );
}

export function getAttendanceStatusBadgeClass(status: string): string {
  if (status === "present") {
    return "badge-success";
  }

  if (status === "absent") {
    return "badge-danger";
  }

  if (status === "late") {
    return "badge-warning";
  }

  if (status === "excused") {
    return "badge-info";
  }

  return "badge-info";
}

export function getAttendanceStatusTone(
  status: string,
): "success" | "danger" | "warning" | "info" {
  return (
    ATTENDANCE_STATUSES.find((item) => item.value === status)?.tone ?? "info"
  );
}

/**
 * Get the client's local time as an ISO-like string WITHOUT the 'Z' suffix.
 *
 * Why: `new Date().toISOString()` converts to UTC (e.g. 1:29 PM UTC+3 → "10:29:22.000Z").
 * External storage used to store this in a `timestamp without time zone` column, which drops the 'Z'.
 * When the frontend later does `new Date("2026-06-08T10:29:22")`, JavaScript treats it as
 * LOCAL time — so it displays 10:29 AM instead of the real 1:29 PM.
 *
 * Sending the local time directly (e.g. "2026-06-08T13:29:22") avoids the UTC round-trip.
 * The database stores "13:29:22", and when retrieved without 'Z' the browser correctly
 * interprets it as 1:29 PM local time.
 */
export function getLocalTimeISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset(); // negative for UTC+ (e.g. -180 for UTC+3)
  const localMs = now.getTime() - offset * 60_000;
  // toISOString() gives "2026-06-08T13:29:22.000Z"; remove the trailing 'Z'
  return new Date(localMs).toISOString().slice(0, -1);
}

/**
 * Format a date/time value (from the database) as a local time string.
 * Handles both strings with and without timezone info:
 *   - "2026-06-08T13:29:22"        → treated as local time → correct
 *   - "2026-06-08T10:29:22.000Z"   → treated as UTC → converted to local → correct
 */
export function formatAttendanceTime(dateValue: string | Date | null): string {
  if (!dateValue) return "";
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  return date.toLocaleTimeString("ar-IQ-u-nu-latn");
}

export function formatAttendanceDate(date: Date): string {
  return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatAttendanceShortDate(date: Date): string {
  return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export function calculateAttendanceRate(input: {
  present: number;
  late: number;
  absent: number;
  excused: number;
}): number {
  const total = input.present + input.late + input.absent + input.excused;

  if (total === 0) {
    return 0;
  }

  const attended = input.present + input.late + input.excused;

  return Math.round((attended / total) * 100);
}

export function canDeleteAttendanceRecord(): {
  allowed: boolean;
  reason?: string;
} {
  return {
    allowed: true,
  };
}
