import { Prisma } from "@/lib/prisma-types";
import { db } from "@/lib/db";
import { getDatabaseUnavailableMessage, isDatabaseStorageEnabled } from "@/lib/storage-mode";
import { getPreviousConfiguredSchoolDay } from "@/services/school-settings-service";
import {
  ATTENDANCE_STATUSES,
  canDeleteAttendanceRecord,
  getAttendanceStatusLabel,
  normalizeAttendanceInput,
  normalizeDateOnly,
  validateAttendanceInput,
  type AttendanceBatchInput,
  type AttendanceDetails,
  type AttendanceFilter,
  type AttendanceFormInput,
  type AttendanceListItem,
  type AttendanceRecord,
  type AttendanceStudentTotal,
  type AttendanceSummary,
  type AttendanceScanInput,
  type AttendanceScanResult,
} from "@/types/attendance";

export type AttendanceServiceResult<T> = {
  ok: boolean;
  data?: T;
  message: string;
  errors?: Record<string, string>;
};

// ─── Include & Mapper ───────────────────────────────────────────

const attendanceListInclude = {
  student: {
    include: {
      section: {
        include: {
          class: true,
        },
      },
    },
  },
  schedule: {
    include: {
      section: {
        include: {
          class: true,
        },
      },
      subject: true,
      teacher: true,
    },
  },
} satisfies Prisma.AttendanceRecordInclude;

const attendanceFullInclude = {
  ...attendanceListInclude,
} satisfies Prisma.AttendanceRecordInclude;

type AttendanceWithRelations = Prisma.AttendanceRecordGetPayload<{
  include: typeof attendanceFullInclude;
}>;

function toAttendanceListItem(
  record: AttendanceWithRelations,
): AttendanceListItem {
  return {
    id: record.id,
    date: record.date,
    mode: record.mode,
    status: record.status,
    statusLabel: getAttendanceStatusLabel(record.status),
    notes: record.notes ?? null,
    checkInAt: record.checkInAt ?? null,
    checkOutAt: record.checkOutAt ?? null,
    source: record.source ?? null,

    studentId: record.studentId,
    studentName: record.student.fullName,
    studentCode: record.student.studentCode ?? null,

    sectionId: record.student.sectionId ?? record.schedule?.sectionId ?? null,
    sectionName:
      record.student.section?.name ?? record.schedule?.section.name ?? null,

    classId:
      record.student.section?.classId ??
      record.schedule?.section.classId ??
      null,
    className:
      record.student.section?.class.name ??
      record.schedule?.section.class.name ??
      null,
    classLevel:
      record.student.section?.class.level ??
      record.schedule?.section.class.level ??
      null,

    scheduleId: record.scheduleId ?? null,
    dayOfWeek: record.schedule?.dayOfWeek ?? null,
    startTime: record.schedule?.startTime ?? null,
    endTime: record.schedule?.endTime ?? null,

    subjectId: record.schedule?.subjectId ?? null,
    subjectName: record.schedule?.subject.name ?? null,

    teacherId: record.schedule?.teacherId ?? null,
    teacherName: record.schedule?.teacher.fullName ?? null,

    createdAt: record.createdAt,
  };
}

// ─── Where Builder ───────────────────────────────────────────────

async function buildAttendanceWhere(
  filter: AttendanceFilter,
): Promise<Prisma.AttendanceRecordWhereInput> {
  const where: Prisma.AttendanceRecordWhereInput = {};

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.studentId) {
    where.studentId = filter.studentId;
  }

  if (filter.scheduleId) {
    where.scheduleId = filter.scheduleId;
  }

  if (filter.date) {
    const parsed = normalizeDateOnly(filter.date);
    if (parsed) {
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
      where.date = {
        gte: start,
        lt: end,
      };
    }
  }

  if (filter.fromDate || filter.toDate) {
    const dateFilter: Prisma.DateTimeFilter = {};

    if (filter.fromDate) {
      const from = normalizeDateOnly(filter.fromDate);
      if (from) {
        dateFilter.gte = new Date(
          from.getFullYear(),
          from.getMonth(),
          from.getDate(),
          0,
          0,
          0,
          0,
        );
      }
    }

    if (filter.toDate) {
      const to = normalizeDateOnly(filter.toDate);
      if (to) {
        const toEnd = new Date(
          to.getFullYear(),
          to.getMonth(),
          to.getDate() + 1,
          0,
          0,
          0,
          0,
        );
        dateFilter.lt = toEnd;
      }
    }

    where.date = {
      ...(typeof where.date === "object" && where.date !== null
        ? (where.date as Prisma.DateTimeFilter)
        : {}),
      ...dateFilter,
    };
  }

  if (filter.source) {
    where.source = filter.source;
  }

  if (filter.hasCheckIn === "yes") {
    where.checkInAt = { not: null };
  } else if (filter.hasCheckIn === "no") {
    where.checkInAt = null;
  }

  if (filter.hasCheckOut === "yes") {
    where.checkOutAt = { not: null };
  } else if (filter.hasCheckOut === "no") {
    where.checkOutAt = null;
  }

  if (filter.missingCheckOut === "yes") {
    where.checkInAt = { not: null };
    where.checkOutAt = null;
  }

  return where;
}

function normalizeSearchText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function matchesAttendanceListFilter(
  record: AttendanceListItem,
  filter: AttendanceFilter,
): boolean {
  const query = normalizeSearchText(filter.query);

  if (query) {
    const haystack = [
      record.studentName,
      record.studentCode,
      record.className,
      record.sectionName,
      record.subjectName,
      record.teacherName,
      record.notes,
    ]
      .map(normalizeSearchText)
      .join(" ");

    if (!haystack.includes(query)) {
      return false;
    }
  }

  if (filter.classId && record.classId !== filter.classId) {
    return false;
  }

  if (filter.sectionId && record.sectionId !== filter.sectionId) {
    return false;
  }

  if (filter.subjectId && record.subjectId !== filter.subjectId) {
    return false;
  }

  if (filter.teacherId && record.teacherId !== filter.teacherId) {
    return false;
  }

  return true;
}

function buildAttendanceSummary(
  records: AttendanceListItem[],
): AttendanceSummary {
  const present = records.filter((record) => record.status === "present").length;
  const absent = records.filter((record) => record.status === "absent").length;
  const late = records.filter((record) => record.status === "late").length;
  const excused = records.filter((record) => record.status === "excused").length;
  const checkedIn = records.filter((record) => Boolean(record.checkInAt)).length;
  const checkedOut = records.filter((record) => Boolean(record.checkOutAt)).length;
  const missingCheckOut = records.filter(
    (record) => Boolean(record.checkInAt) && !record.checkOutAt,
  ).length;
  const total = records.length;
  const attendanceBase = present + late + excused;
  const attendanceRate = total > 0 ? Math.round((attendanceBase / total) * 100) : 0;

  return {
    total,
    present,
    absent,
    late,
    excused,
    checkedIn,
    checkedOut,
    missingCheckOut,
    attendanceRate,
  };
}

export function summarizeAttendanceRecords(
  records: AttendanceListItem[],
): AttendanceSummary {
  return buildAttendanceSummary(records);
}

// ─── Validation Helpers ──────────────────────────────────────────

async function validateAttendanceRelations(
  input: AttendanceFormInput,
): Promise<{
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
}> {
  const student = await db.student.findUnique({
    where: {
      id: input.studentId,
    },
  });

  if (!student) {
    return {
      ok: false,
      message: "الطالب المحدد غير موجود.",
      errors: {
        studentId: "الطالب المحدد غير موجود.",
      },
    };
  }

  if (student.status !== "active") {
    return {
      ok: false,
      message: "لا يمكن تسجيل الحضور لطالب غير مستمر.",
      errors: {
        studentId: "حالة الطالب ليست مستمر.",
      },
    };
  }

  return {
    ok: true,
    message: "العلاقات صحيحة.",
  };
}

async function findDuplicateAttendanceRecord(
  input: AttendanceFormInput,
  excludeId?: string,
): Promise<boolean> {
  const dateValue = normalizeDateOnly(input.date);
  if (!dateValue) return false;

  const start = new Date(
    dateValue.getFullYear(),
    dateValue.getMonth(),
    dateValue.getDate(),
    0,
    0,
    0,
    0,
  );
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const where: Prisma.AttendanceRecordWhereInput = {
    date: {
      gte: start,
      lt: end,
    },
    studentId: input.studentId,
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const existing = await db.attendanceRecord.findFirst({ where });
  return existing !== null;
}

// ─── Read Operations ─────────────────────────────────────────────

export async function getAttendanceRecords(
  filter: AttendanceFilter = {},
): Promise<AttendanceListItem[]> {
  const where = await buildAttendanceWhere(filter);

  const records = await db.attendanceRecord.findMany({
    where,
    include: attendanceFullInclude,
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  });

  let result = records
    .map((record) => toAttendanceListItem(record))
    .filter((record) => matchesAttendanceListFilter(record, filter));

  // Add computed absences for active students without records when a date filter is present
  const shouldComputeAbsences =
    (filter.date || filter.fromDate) &&
    (!filter.status || filter.status === "absent");

  if (shouldComputeAbsences) {
    const computed = await computeAbsentStudents(filter, result);
    result = [...result, ...computed];
  }

  return result;
}

export async function searchAttendanceRecords(
  query: string,
): Promise<AttendanceListItem[]> {
  return getAttendanceRecords({
    query,
  });
}

export async function getAttendanceRecordById(
  id: string,
): Promise<AttendanceRecord | null> {
  const record = await db.attendanceRecord.findUnique({
    where: {
      id,
    },
  });

  if (!record) return null;

  return {
    id: record.id,
    date: record.date,
    mode: record.mode,
    status: record.status,
    notes: record.notes,
    checkInAt: record.checkInAt,
    checkOutAt: record.checkOutAt,
    source: record.source,
    studentId: record.studentId,
    scheduleId: record.scheduleId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function getAttendanceDetails(
  id: string,
): Promise<AttendanceDetails | null> {
  const record = await db.attendanceRecord.findUnique({
    where: {
      id,
    },
    include: attendanceFullInclude,
  });

  if (!record) return null;

  const item = toAttendanceListItem(record);

  return {
    ...item,
    updatedAt: record.updatedAt,
  };
}

// ─── Write Operations ────────────────────────────────────────────

export async function createAttendanceRecord(
  input: AttendanceFormInput,
): Promise<AttendanceServiceResult<AttendanceRecord>> {
  const validation = validateAttendanceInput(input);

  if (!validation.valid) {
    return {
      ok: false,
      message: (Object.values(validation.errors).find(Boolean) as string) || "توجد بيانات ناقصة أو غير صحيحة.",
      errors: validation.errors as Record<string, string>,
    };
  }

  if (!isDatabaseStorageEnabled()) {
    return {
      ok: false,
      message: getDatabaseUnavailableMessage(),
    };
  }

  const data = normalizeAttendanceInput(input);

  const relationsCheck = await validateAttendanceRelations(data);

  if (!relationsCheck.ok) {
    return {
      ok: false,
      message: relationsCheck.message,
      errors: relationsCheck.errors,
    };
  }

  const isDuplicate = await findDuplicateAttendanceRecord(data);

  if (isDuplicate) {
    return {
      ok: false,
      message: "تم تسجيل هذه الحركة مسبقًا لهذا الطالب في نفس اليوم.",
      errors: {
        studentId: "سجل الحضور موجود مسبقًا لهذا الطالب.",
      },
    };
  }

  try {
    const dateValue = normalizeDateOnly(data.date);
    const mode = data.mode || "check-in";

    const record = await db.attendanceRecord.create({
      data: {
        date: dateValue ?? new Date(),
        status: data.status,
        notes: data.notes ?? null,
        mode,
        scheduleId: data.scheduleId || null,
        studentId: data.studentId,
        source: "manual",
      },
    });

    return {
      ok: true,
      data: {
        id: record.id,
        date: record.date,
        mode: record.mode,
        status: record.status,
        notes: record.notes,
        checkInAt: record.checkInAt,
        checkOutAt: record.checkOutAt,
        source: record.source,
        studentId: record.studentId,
        scheduleId: record.scheduleId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      message: "تم تسجيل الحضور بنجاح.",
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "تم تسجيل هذه الحركة مسبقًا لهذا الطالب في نفس اليوم.",
        errors: {
          studentId: "سجل الحضور موجود مسبقًا لهذا الطالب.",
        },
      };
    }

    return {
      ok: false,
      message: "حدث خطأ أثناء تسجيل الحضور.",
    };
  }
}

export async function updateAttendanceRecord(
  id: string,
  input: AttendanceFormInput,
): Promise<AttendanceServiceResult<AttendanceRecord>> {
  const validation = validateAttendanceInput(input);

  if (!validation.valid) {
    return {
      ok: false,
      message: (Object.values(validation.errors).find(Boolean) as string) || "توجد بيانات ناقصة أو غير صحيحة.",
      errors: validation.errors as Record<string, string>,
    };
  }

  if (!isDatabaseStorageEnabled()) {
    return {
      ok: false,
      message: getDatabaseUnavailableMessage(),
    };
  }

  const existing = await db.attendanceRecord.findUnique({
    where: { id },
  });

  if (!existing) {
    return {
      ok: false,
      message: "لم يتم العثور على سجل الحضور.",
    };
  }

  const data = normalizeAttendanceInput(input);

  const relationsCheck = await validateAttendanceRelations(data);

  if (!relationsCheck.ok) {
    return {
      ok: false,
      message: relationsCheck.message,
      errors: relationsCheck.errors,
    };
  }

  const isDuplicate = await findDuplicateAttendanceRecord(data, id);

  if (isDuplicate) {
    return {
      ok: false,
      message: "تم تسجيل هذه الحركة مسبقًا لهذا الطالب في نفس اليوم.",
      errors: {
        studentId: "سجل الحضور موجود مسبقًا لهذا الطالب.",
      },
    };
  }

  try {
    const dateValue = normalizeDateOnly(data.date);
    const mode = data.mode || "check-in";

    const record = await db.attendanceRecord.update({
      where: { id },
      data: {
        date: dateValue ?? existing.date,
        status: data.status,
        notes: data.notes ?? null,
        mode,
        scheduleId: data.scheduleId || null,
        studentId: data.studentId,
      },
    });

    return {
      ok: true,
      data: {
        id: record.id,
        date: record.date,
        mode: record.mode,
        status: record.status,
        notes: record.notes,
        checkInAt: record.checkInAt,
        checkOutAt: record.checkOutAt,
        source: record.source,
        studentId: record.studentId,
        scheduleId: record.scheduleId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      message: "تم تحديث سجل الحضور بنجاح.",
    };
  } catch {
    return {
      ok: false,
      message: "حدث خطأ أثناء تحديث سجل الحضور.",
    };
  }
}

export async function deleteAttendanceRecord(
  id: string,
): Promise<AttendanceServiceResult<null>> {
  const record = await db.attendanceRecord.findUnique({
    where: { id },
  });

  if (!record) {
    return {
      ok: false,
      message: "لم يتم العثور على سجل الحضور.",
    };
  }

  const deleteCheck = canDeleteAttendanceRecord();

  if (!deleteCheck.allowed) {
    return {
      ok: false,
      message: deleteCheck.reason ?? "لا يمكن حذف سجل الحضور حاليًا.",
    };
  }

  try {
    await db.attendanceRecord.delete({
      where: { id },
    });
  } catch (error) {
    console.error("[deleteAttendanceRecord] Error:", error);
    return {
      ok: false,
      message: "حدث خطأ أثناء حذف سجل الحضور.",
    };
  }

  return {
    ok: true,
    data: null,
    message: "تم حذف سجل الحضور بنجاح.",
  };
}

// ─── Batch Operations ────────────────────────────────────────────

export async function markAttendanceBatch(
  input: AttendanceBatchInput,
): Promise<AttendanceServiceResult<{ created: number; updated: number }>> {
  if (!input.records || input.records.length === 0) {
    return {
      ok: false,
      message: "لا توجد سجلات حضور لإضافتها.",
    };
  }

  const dateValue = normalizeDateOnly(input.date);

  if (!dateValue) {
    return {
      ok: false,
      message: "تاريخ الحضور غير صحيح.",
      errors: {
        date: "تاريخ الحضور غير صحيح.",
      },
    };
  }

  const start = new Date(
    dateValue.getFullYear(),
    dateValue.getMonth(),
    dateValue.getDate(),
    0,
    0,
    0,
    0,
  );
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  let created = 0;
  let updated = 0;

  for (const entry of input.records) {
    const statusValue = String(entry.status || "present").trim();

    if (!ATTENDANCE_STATUSES.some((s) => s.value === statusValue)) {
      continue;
    }

    const existing = await db.attendanceRecord.findFirst({
      where: {
        date: {
          gte: start,
          lt: end,
        },
        studentId: entry.studentId,
        scheduleId: input.scheduleId || null,
      },
    });

    if (existing) {
      await db.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          status: statusValue,
          notes: entry.notes?.trim() || null,
          scheduleId: input.scheduleId || null,
        },
      });
      updated++;
    } else {
      await db.attendanceRecord.create({
        data: {
          date: dateValue,
          status: statusValue,
          notes: entry.notes?.trim() || null,
          scheduleId: input.scheduleId || null,
          studentId: entry.studentId,
          source: "manual",
        },
      });
      created++;
    }
  }

  return {
    ok: true,
    data: { created, updated },
    message: `تم تسجيل الحضور: ${created} جديد، ${updated} محدّث.`,
  };
}


async function getPreviousAttendanceMessage(studentId: string, today: Date): Promise<string> {
  const previousDay = await getPreviousConfiguredSchoolDay(today);
  const previousEnd = new Date(previousDay);
  previousEnd.setDate(previousEnd.getDate() + 1);

  const previousRecord = await db.attendanceRecord.findFirst({
    where: {
      studentId,
      date: { gte: previousDay, lt: previousEnd },
    },
  });

  const formattedDay = previousDay.toLocaleDateString("ar-IQ-u-nu-latn");

  if (!previousRecord || previousRecord.status === "absent") {
    return ` تنبيه: الطالب محسوب غائبًا في آخر يوم دوام سابق (${formattedDay}).`;
  }

  return ` آخر يوم دوام سابق (${formattedDay}): ${getAttendanceStatusLabel(previousRecord.status)}.`;
}

// ─── Unified Daily Student Attendance ───────────────────────────

async function registerDailyStudentAttendance(input: {
  student: {
    id: string;
    fullName: string;
    studentCode: string | null;
    status: string;
  };
  mode: "check-in" | "check-out";
  source: "qr" | "manual-code" | "manual-name";
  /** ISO string from the client's device clock */
  clientTime?: string;
  scheduleId?: string;
}): Promise<AttendanceScanResult> {
  const { student, mode, source, clientTime, scheduleId } = input;
  const studentCode = student.studentCode ?? "";

  if (student.status !== "active") {
    return {
      ok: false,
      studentId: student.id,
      studentName: student.fullName,
      studentCode,
      status: student.status,
      checkInAt: null,
      checkOutAt: null,
      message: "لا يمكن تسجيل الحضور لطالب غير مستمر.",
    };
  }

  // Use the client's local time for determining "today" so the date matches the client's calendar
  const today = normalizeDateOnly(clientTime ? new Date(clientTime) : new Date());

  if (!today) {
    return {
      ok: false,
      studentId: student.id,
      studentName: student.fullName,
      studentCode,
      status: "",
      checkInAt: null,
      checkOutAt: null,
      message: "خطأ في تحديد تاريخ اليوم.",
    };
  }

  const dayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    0,
    0,
    0,
    0,
  );

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const existingRecord = await db.attendanceRecord.findFirst({
    where: {
      studentId: student.id,
      scheduleId: scheduleId || null,
      date: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
  });

  // Use the client's local time if provided, otherwise fall back to server time
  const now = clientTime ? new Date(clientTime) : new Date();
  const previousAttendanceMessage = mode === "check-in"
    ? await getPreviousAttendanceMessage(student.id, today)
    : "";

  if (mode === "check-in") {
    if (existingRecord?.checkInAt) {
      return {
        ok: false,
        studentId: student.id,
        studentName: student.fullName,
        studentCode,
        status: existingRecord.status,
        checkInAt: existingRecord.checkInAt,
        checkOutAt: existingRecord.checkOutAt,
        message: "تم تسجيل دخول الطالب مسبقًا اليوم.",
      };
    }

    if (existingRecord) {
      const updated = await db.attendanceRecord.update({
        where: { id: existingRecord.id },
        data: {
          checkInAt: now,
          status: "present",
          source,
        },
      });

      return {
        ok: true,
        studentId: student.id,
        studentName: student.fullName,
        studentCode,
        status: updated.status,
        checkInAt: updated.checkInAt,
        checkOutAt: updated.checkOutAt,
        message: `تم تسجيل دخول الطالب بنجاح.${previousAttendanceMessage}`,
      };
    }

    const created = await db.attendanceRecord.create({
      data: {
        date: today,
        studentId: student.id,
        status: "present",
        mode: "check-in",
        checkInAt: now,
        source,
        scheduleId: scheduleId || null,
      },
    });

    return {
      ok: true,
      studentId: student.id,
      studentName: student.fullName,
      studentCode,
      status: created.status,
      checkInAt: created.checkInAt,
      checkOutAt: created.checkOutAt,
      message: `تم تسجيل دخول الطالب بنجاح.${previousAttendanceMessage}`,
    };
  }

  if (!existingRecord?.checkInAt) {
    return {
      ok: false,
      studentId: student.id,
      studentName: student.fullName,
      studentCode,
      status: existingRecord?.status ?? "",
      checkInAt: existingRecord?.checkInAt ?? null,
      checkOutAt: existingRecord?.checkOutAt ?? null,
      message: "لا يمكن تسجيل الانصراف قبل تسجيل حضور الطالب.",
    };
  }

  if (existingRecord?.checkOutAt) {
    return {
      ok: false,
      studentId: student.id,
      studentName: student.fullName,
      studentCode,
      status: existingRecord.status,
      checkInAt: existingRecord.checkInAt,
      checkOutAt: existingRecord.checkOutAt,
      message: "تم تسجيل انصراف الطالب مسبقًا اليوم.",
    };
  }

  const checkoutData = {
    checkOutAt: now,
    mode: "check-out",
    source,
    status: existingRecord?.status || "present",
  };

  const updated = existingRecord
    ? await db.attendanceRecord.update({
        where: { id: existingRecord.id },
        data: checkoutData,
      })
    : await db.attendanceRecord.create({
        data: {
          date: today,
          studentId: student.id,
          scheduleId: scheduleId || null,
          ...checkoutData,
        },
      });

  return {
    ok: true,
    studentId: student.id,
    studentName: student.fullName,
    studentCode,
    status: updated.status,
    checkInAt: updated.checkInAt,
    checkOutAt: updated.checkOutAt,
    message: existingRecord?.checkInAt
      ? "تم تسجيل انصراف الطالب بنجاح."
      : "تم تسجيل انصراف الطالب بدون تسجيل دخول صباحي لهذا اليوم.",
  };
}

export async function scanAttendanceByStudentCode(
  input: AttendanceScanInput,
): Promise<AttendanceScanResult> {
  const studentCode = input.studentCode?.trim();
  const mode = input.mode;
  const source = input.source ?? "qr";

  if (!studentCode || !studentCode.startsWith("MarSch-")) {
    return {
      ok: false,
      studentId: "",
      studentName: "",
      studentCode: studentCode ?? "",
      status: "",
      checkInAt: null,
      checkOutAt: null,
      message: "الرمز غير صالح. يجب أن يبدأ بـ MarSch-",
    };
  }

  const student = await db.student.findUnique({
    where: { studentCode },
  });

  if (!student) {
    return {
      ok: false,
      studentId: "",
      studentName: "",
      studentCode,
      status: "",
      checkInAt: null,
      checkOutAt: null,
      message: "لم يتم العثور على طالب بهذا الرمز.",
    };
  }

  return registerDailyStudentAttendance({
    student,
    mode,
    source,
    clientTime: input.clientTime,
    scheduleId: input.scheduleId,
  });
}

export async function scanAttendanceByStudentId(input: {
  studentId: string;
  mode: "check-in" | "check-out";
  source: "manual-name";
  /** ISO string from the client's device clock */
  clientTime?: string;
  scheduleId?: string;
}): Promise<AttendanceScanResult> {
  const { studentId, mode, source, clientTime, scheduleId } = input;

  const student = await db.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    return {
      ok: false,
      studentId: "",
      studentName: "",
      studentCode: "",
      status: "",
      checkInAt: null,
      checkOutAt: null,
      message: "لم يتم العثور على الطالب.",
    };
  }

  return registerDailyStudentAttendance({
    student,
    mode,
    source,
    clientTime,
    scheduleId,
  });
}

// ─── Counts & Aggregations ───────────────────────────────────────

export async function getAttendanceCounts(
  filter: AttendanceFilter = {},
): Promise<AttendanceSummary> {
  const records = await getAttendanceRecords(filter);
  return buildAttendanceSummary(records);
}

export async function getDailyAttendanceSummary(
  dateInput: string | Date,
): Promise<AttendanceSummary> {
  const date = normalizeDateOnly(dateInput);

  if (!date) {
    return {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      checkedIn: 0,
      checkedOut: 0,
      missingCheckOut: 0,
      attendanceRate: 0,
    };
  }

  const dayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [records, activeStudents] = await Promise.all([
    db.attendanceRecord.findMany({
      where: {
        date: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      select: {
        studentId: true,
        status: true,
        checkInAt: true,
        checkOutAt: true,
      },
    }),
    db.student.findMany({
      where: { status: "active" },
      select: { id: true },
    }),
  ]);

  const studentsWithRecord = new Set(
    records.map((record: { studentId: string }) => record.studentId),
  );
  const computedAbsent = activeStudents.filter(
    (student: { id: string }) => !studentsWithRecord.has(student.id),
  ).length;

  const present = records.filter((record: { status: string }) => record.status === "present").length;
  const explicitAbsent = records.filter((record: { status: string }) => record.status === "absent").length;
  const late = records.filter((record: { status: string }) => record.status === "late").length;
  const excused = records.filter((record: { status: string }) => record.status === "excused").length;
  const checkedIn = records.filter((record: { checkInAt: Date | null }) => Boolean(record.checkInAt)).length;
  const checkedOut = records.filter((record: { checkOutAt: Date | null }) => Boolean(record.checkOutAt)).length;
  const missingCheckOut = records.filter(
    (record: { checkInAt: Date | null; checkOutAt: Date | null }) => Boolean(record.checkInAt) && !record.checkOutAt,
  ).length;
  const absent = explicitAbsent + computedAbsent;
  const total = records.length + computedAbsent;
  const attendanceBase = present + late + excused;
  const attendanceRate = total > 0 ? Math.round((attendanceBase / total) * 100) : 0;

  return {
    total,
    present,
    absent,
    late,
    excused,
    checkedIn,
    checkedOut,
    missingCheckOut,
    attendanceRate,
  };
}

export async function getAttendanceStudentTotals(
  filter: AttendanceFilter = {},
  preloadedRecords?: AttendanceListItem[],
): Promise<AttendanceStudentTotal[]> {
  const studentWhere: Prisma.StudentWhereInput = {};

  if (filter.studentId) {
    studentWhere.id = filter.studentId;
  }

  if (filter.sectionId) {
    studentWhere.sectionId = filter.sectionId;
  }

  if (filter.classId) {
    const sections = await db.section.findMany({
      where: { classId: filter.classId },
      select: { id: true },
    });
    const sectionIds = sections.map((section: { id: string }) => section.id);
    studentWhere.sectionId = { in: sectionIds };
  }

  const [students, records] = await Promise.all([
    db.student.findMany({
      where: studentWhere,
      include: {
        section: {
          include: {
            class: true,
          },
        },
      },
      orderBy: [
        { status: "asc" },
        { fullName: "asc" },
      ],
    }),
    preloadedRecords ? Promise.resolve(preloadedRecords) : getAttendanceRecords(filter),
  ]);

  const recordsByStudent = new Map<string, AttendanceListItem[]>();
  for (const record of records) {
    const existing = recordsByStudent.get(record.studentId) ?? [];
    existing.push(record);
    recordsByStudent.set(record.studentId, existing);
  }

  const query = normalizeSearchText(filter.query);

  return students
    .map((student: any): AttendanceStudentTotal => {
      const studentRecords = recordsByStudent.get(student.id) ?? [];
      const summary = buildAttendanceSummary(studentRecords);
      const lastRecord = studentRecords
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      return {
        studentId: student.id,
        studentName: student.fullName,
        studentCode: student.studentCode ?? null,
        classId: student.section?.classId ?? null,
        className: student.section?.class?.name ?? null,
        sectionId: student.sectionId ?? null,
        sectionName: student.section?.name ?? null,
        totalRecords: summary.total,
        present: summary.present,
        absent: summary.absent,
        late: summary.late,
        excused: summary.excused,
        checkedIn: summary.checkedIn,
        checkedOut: summary.checkedOut,
        missingCheckOut: summary.missingCheckOut,
        attendanceRate: summary.attendanceRate,
        lastStatus: lastRecord?.status ?? null,
        lastStatusLabel: lastRecord?.statusLabel ?? null,
        lastDate: lastRecord?.date ?? null,
      };
    })
    .filter((row) => {
      if (!query) return true;

      const studentHaystack = [
        row.studentName,
        row.studentCode,
        row.className,
        row.sectionName,
      ]
        .map(normalizeSearchText)
        .join(" ");

      return studentHaystack.includes(query) || recordsByStudent.has(row.studentId);
    })
    .sort((a, b) => {
      if (b.absent !== a.absent) return b.absent - a.absent;
      if (b.late !== a.late) return b.late - a.late;
      return a.studentName.localeCompare(b.studentName, "ar");
    });
}

// ─── Query by Relations ──────────────────────────────────────────

export async function getAttendanceByStudentId(
  studentId: string,
): Promise<AttendanceListItem[]> {
  return getAttendanceRecords({
    studentId,
  });
}

export async function getAttendanceByScheduleId(
  scheduleId: string,
): Promise<AttendanceListItem[]> {
  return getAttendanceRecords({
    scheduleId,
  });
}

export async function getTodayAttendance(): Promise<AttendanceListItem[]> {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  return getAttendanceRecords({
    date: dateStr,
  });
}

export async function hasAttendanceRecords(): Promise<boolean> {
  const count = await db.attendanceRecord.count();
  return count > 0;
}

// ─── Internal Helpers ────────────────────────────────────────────

function isUniqueConstraintError(error: unknown): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002") ||
    ((error as any)?.code === "P2002")
  );
}

// ─── Computed Absence Logic ──────────────────────────────────────

/**
 * Compute virtual "absent" records for active students who have no
 * attendance record for the date(s) specified in the filter.
 *
 * This is only called when a date or date-range filter is active and
 * the status filter is either absent or not set — because a student
 * with no record is effectively absent on that day.
 */
async function computeAbsentStudents(
  filter: AttendanceFilter,
  _existingRecords: AttendanceListItem[],
): Promise<AttendanceListItem[]> {
  // Build student filter (only active students)
  const studentWhere: Prisma.StudentWhereInput = { status: "active" };

  if (filter.studentId) {
    studentWhere.id = filter.studentId;
  }
  if (filter.sectionId) {
    studentWhere.sectionId = filter.sectionId;
  }

  // Pre-compute section IDs for class filter in parallel with other work
  let classSectionIds: string[] | null = null;
  if (filter.classId) {
    // Fetch section IDs for the class — this runs in parallel below
    classSectionIds = (await db.section.findMany({
      where: { classId: filter.classId },
      select: { id: true },
    })).map((s: { id: string }) => s.id);

    if (classSectionIds.length === 0) return []; // No sections = no students
    studentWhere.sectionId = { in: classSectionIds };
  }

  // Determine the dates for which we need to check absences FIRST
  // (so we can run the student query and date check in parallel)
  let dates: Date[] = [];

  if (filter.date) {
    const parsed = normalizeDateOnly(filter.date);
    if (parsed) dates = [parsed];
  } else if (filter.fromDate) {
    const from = normalizeDateOnly(filter.fromDate);
    const to = filter.toDate ? normalizeDateOnly(filter.toDate) : normalizeDateOnly(new Date());
    if (from && to) {
      const current = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      const toMidnight = new Date(to.getFullYear(), to.getMonth(), to.getDate());
      // Cap at 31 days to avoid huge ranges
      let safety = 0;
      while (current <= toMidnight && safety < 31) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
        safety++;
      }
    }
  }

  if (dates.length === 0) return [];

  // Run student fetch and attendance record fetch in PARALLEL
  const [students, allDateRecords] = await Promise.all([
    db.student.findMany({
      where: studentWhere,
      include: {
        section: {
          include: {
            class: true,
          },
        },
      },
    }),
    // Fetch attendance records for ALL students in the date range at once
    // instead of using buildAttendanceWhere which adds unnecessary complexity
    db.attendanceRecord.findMany({
      where: {
        ...((() => {
          const where: Prisma.AttendanceRecordWhereInput = {};
          if (dates.length === 1) {
            const start = dates[0];
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            where.date = { gte: start, lt: end };
          } else {
            const fromDate = dates[0];
            const toDate = new Date(dates[dates.length - 1]);
            toDate.setDate(toDate.getDate() + 1);
            where.date = { gte: fromDate, lt: toDate };
          }
          return where;
        })()),
        // If we have section IDs from class filter, limit attendance records too
        ...(classSectionIds
          ? { student: { sectionId: { in: classSectionIds } } }
          : {}),
        ...(filter.studentId ? { studentId: filter.studentId } : {}),
        ...(filter.sectionId ? { student: { sectionId: filter.sectionId } } : {}),
      },
      select: {
        studentId: true,
        date: true,
      },
    }),
  ]);

  if (students.length === 0) return [];

  // Build a Set of "studentId|dateStr" for quick lookup
  const existingKeys = new Set(
    allDateRecords.map((r: { studentId: string; date: Date }) => {
      const d = new Date(r.date);
      const key = `${r.studentId}|${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return key;
    }),
  );

  // Also track student IDs that have at least one record (for query text filtering)
  const studentsWithAnyRecord = new Set(allDateRecords.map((r: { studentId: string }) => r.studentId));

  // For each student × date without a record, create a computed absence
  const computed: AttendanceListItem[] = [];

  for (const student of students) {
    for (const date of dates) {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const key = `${student.id}|${dateStr}`;

      if (existingKeys.has(key)) continue; // Student already has a record for this date

      computed.push({
        id: `computed-absent-${student.id}-${dateStr}`,
        date,
        mode: "daily",
        status: "absent",
        statusLabel: "غائب",
        notes: "غياب محسوب — لا يوجد سجل حضور",
        checkInAt: null,
        checkOutAt: null,
        source: null,
        isComputedAbsence: true,
        studentId: student.id,
        studentName: student.fullName,
        studentCode: student.studentCode ?? null,
        sectionId: student.sectionId ?? null,
        sectionName: student.section?.name ?? null,
        classId: student.section?.classId ?? null,
        className: student.section?.class?.name ?? null,
        classLevel: student.section?.class?.level ?? null,
        scheduleId: null,
        dayOfWeek: null,
        startTime: null,
        endTime: null,
        subjectId: null,
        subjectName: null,
        teacherId: null,
        teacherName: null,
        createdAt: date,
      });
    }
  }

  // Apply text search filter to computed absences too
  const query = normalizeSearchText(filter.query);

  if (!query) return computed;

  return computed.filter((item) => {
    const haystack = [item.studentName, item.studentCode, item.className, item.sectionName]
      .map(normalizeSearchText)
      .join(" ");
    return haystack.includes(query) || studentsWithAnyRecord.has(item.studentId);
  });
}

// ─── Student Search for Attendance ──────────────────────────────

export async function findStudentForAttendance(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const students = await db.student.findMany({
    where: {
      status: "active",
      OR: [
        { fullName: { contains: trimmed } },
        { studentCode: { contains: trimmed } },
        { guardianPhone: { contains: trimmed } },
      ],
    },
    include: {
      section: {
        include: {
          class: true,
        },
      },
    },
    take: 20,
    orderBy: { fullName: "asc" },
  });

  return students.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    studentCode: s.studentCode,
    sectionName: s.section?.name ?? null,
    className: s.section?.class?.name ?? null,
    status: s.status,
  }));
}
