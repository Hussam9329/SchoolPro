export type Schedule = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
  notes: string | null;
  isActive: boolean;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ScheduleFormInput = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string;
  notes?: string;
  isActive?: boolean;
  sectionId: string;
  subjectId: string;
  teacherId: string;
};

export type ScheduleListItem = {
  id: string;
  dayOfWeek: string;
  dayLabel: string;
  startTime: string;
  endTime: string;
  room: string | null;
  notes: string | null;
  isActive: boolean;

  sectionId: string;
  sectionName: string;

  classId: string;
  className: string;
  classLevel: string | null;

  subjectId: string;
  subjectName: string;

  teacherId: string;
  teacherName: string;
  teacherPhone: string | null;

  createdAt: Date;
};

export type ScheduleDetails = ScheduleListItem & {
  updatedAt: Date;
};

export type ScheduleValidationResult = {
  valid: boolean;
  errors: Partial<Record<keyof ScheduleFormInput, string>>;
};

export type ScheduleFilter = {
  query?: string;
  dayOfWeek?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  teacherId?: string;
  isActive?: boolean;
};

export type ScheduleConflict = {
  id: string;
  type: "teacher" | "section";
  message: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  sectionName?: string;
  teacherName?: string;
};

export const WEEK_DAYS = [
  {
    value: "saturday",
    label: "السبت",
    order: 1,
  },
  {
    value: "sunday",
    label: "الأحد",
    order: 2,
  },
  {
    value: "monday",
    label: "الاثنين",
    order: 3,
  },
  {
    value: "tuesday",
    label: "الثلاثاء",
    order: 4,
  },
  {
    value: "wednesday",
    label: "الأربعاء",
    order: 5,
  },
  {
    value: "thursday",
    label: "الخميس",
    order: 6,
  },
  {
    value: "friday",
    label: "الجمعة",
    order: 7,
  },
] as const;

export type WeekDayValue = (typeof WEEK_DAYS)[number]["value"];

export function getEmptyScheduleForm(): ScheduleFormInput {
  return {
    dayOfWeek: "saturday",
    startTime: "",
    endTime: "",
    room: "",
    notes: "",
    isActive: true,
    sectionId: "",
    subjectId: "",
    teacherId: "",
  };
}

export function normalizeScheduleInput(
  input: ScheduleFormInput,
): ScheduleFormInput {
  return {
    dayOfWeek: input.dayOfWeek.trim(),
    startTime: input.startTime.trim(),
    endTime: input.endTime.trim(),
    room: input.room?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    isActive: input.isActive ?? true,
    sectionId: input.sectionId.trim(),
    subjectId: input.subjectId.trim(),
    teacherId: input.teacherId.trim(),
  };
}

export function validateScheduleInput(
  input: ScheduleFormInput,
): ScheduleValidationResult {
  const normalized = normalizeScheduleInput(input);
  const errors: Partial<Record<keyof ScheduleFormInput, string>> = {};

  if (!normalized.dayOfWeek) {
    errors.dayOfWeek = "اليوم مطلوب.";
  }

  if (
    normalized.dayOfWeek &&
    !WEEK_DAYS.some((day) => day.value === normalized.dayOfWeek)
  ) {
    errors.dayOfWeek = "اليوم غير صحيح.";
  }

  if (!normalized.startTime) {
    errors.startTime = "وقت البداية مطلوب.";
  }

  if (!normalized.endTime) {
    errors.endTime = "وقت النهاية مطلوب.";
  }

  if (normalized.startTime && !isValidTime(normalized.startTime)) {
    errors.startTime = "وقت البداية غير صحيح.";
  }

  if (normalized.endTime && !isValidTime(normalized.endTime)) {
    errors.endTime = "وقت النهاية غير صحيح.";
  }

  if (
    normalized.startTime &&
    normalized.endTime &&
    isValidTime(normalized.startTime) &&
    isValidTime(normalized.endTime) &&
    normalized.startTime >= normalized.endTime
  ) {
    errors.endTime = "وقت النهاية يجب أن يكون بعد وقت البداية.";
  }

  if (!normalized.sectionId) {
    errors.sectionId = "الشعبة مطلوبة.";
  }

  if (!normalized.subjectId) {
    errors.subjectId = "المادة مطلوبة.";
  }

  if (!normalized.teacherId) {
    errors.teacherId = "المدرس مطلوب.";
  }

  if (normalized.room && normalized.room.length > 80) {
    errors.room = "اسم القاعة طويل جدًا.";
  }

  if (normalized.notes && normalized.notes.length > 500) {
    errors.notes = "الملاحظات يجب ألا تتجاوز 500 حرف.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function getDayLabel(dayOfWeek: string): string {
  return WEEK_DAYS.find((day) => day.value === dayOfWeek)?.label ?? dayOfWeek;
}

export function getDayOrder(dayOfWeek: string): number {
  return WEEK_DAYS.find((day) => day.value === dayOfWeek)?.order ?? 99;
}

export function getScheduleStatusLabel(isActive: boolean): string {
  return isActive ? "فعّال" : "متوقف";
}

export function getScheduleStatusBadgeClass(isActive: boolean): string {
  return isActive ? "badge-success" : "badge-warning";
}

export function formatScheduleTime(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}

export function getScheduleDisplayName(input: {
  subjectName: string;
  teacherName: string;
  sectionName: string;
  className: string;
}): string {
  return `${input.subjectName} / ${input.className} - شعبة ${input.sectionName} / ${input.teacherName}`;
}

export function sortSchedulesByDayAndTime<T extends {
  dayOfWeek: string;
  startTime: string;
}>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const dayDifference = getDayOrder(a.dayOfWeek) - getDayOrder(b.dayOfWeek);

    if (dayDifference !== 0) {
      return dayDifference;
    }

    return a.startTime.localeCompare(b.startTime);
  });
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
