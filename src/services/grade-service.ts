import { Prisma } from "@/lib/prisma-types";
import { db } from "@/lib/db";
import { getDatabaseUnavailableMessage, isDatabaseStorageEnabled } from "@/lib/storage-mode";
import {
  canDeleteGrade,
  getExamTypeLabel,
  getGradePercentage,
  getGradeRating,
  getGradeRatingClass,
  getTermLabel,
  normalizeGradeInput,
  parseGradeDate,
  validateGradeInput,
  type Grade,
  type GradeDetails,
  type GradeFilter,
  type GradeFormInput,
  type GradeListItem,
} from "@/types/grade";

export type GradeServiceResult<T> = {
  ok: boolean;
  data?: T;
  message: string;
  errors?: Record<string, string>;
};

const gradeListInclude = {
  student: {
    include: {
      section: {
        include: {
          class: true,
        },
      },
    },
  },
  subject: true,
  teacher: true,
} satisfies Prisma.GradeInclude;

type GradeWithRelations = Prisma.GradeGetPayload<{
  include: typeof gradeListInclude;
}>;

/**
 * Build a grade where clause that works with the external data adapter.
 * Nested Prisma-style relation filters are resolved to explicit ID filters
 * using pre-queries since the external data adapter doesn't support them.
 */
async function buildGradeWhere(filter: GradeFilter): Promise<Prisma.GradeWhereInput> {
  const query = filter.query?.trim();
  const where: Prisma.GradeWhereInput = {};

  if (query) {
    // Resolve student and teacher IDs from search query
    const [searchStudentIds, searchTeacherIds] = await Promise.all([
      resolveGradeStudentIdsBySearch(query),
      resolveGradeTeacherIdsBySearch(query),
    ]);

    const orParts: Prisma.GradeWhereInput[] = [
      { title: { contains: query } },
      { notes: { contains: query } },
    ];

    if (searchStudentIds.length > 0) {
      orParts.push({ studentId: { in: searchStudentIds } });
    }
    if (searchTeacherIds.length > 0) {
      orParts.push({ teacherId: { in: searchTeacherIds } });
    }

    where.OR = orParts;
  }

  if (filter.studentId) {
    where.studentId = filter.studentId;
  }

  if (filter.subjectId) {
    where.subjectId = filter.subjectId;
  }

  if (filter.teacherId) {
    where.teacherId = filter.teacherId;
  }

  if (filter.examType) {
    where.examType = filter.examType;
  }

  if (filter.term) {
    where.term = filter.term;
  }

  if (filter.examId) {
    where.examId = filter.examId;
  }

  if (filter.fromDate || filter.toDate) {
    where.date = {};

    if (filter.fromDate) {
      const from = new Date(filter.fromDate);
      if (!Number.isNaN(from.getTime())) {
        where.date.gte = from;
      }
    }

    if (filter.toDate) {
      const to = new Date(filter.toDate);
      if (!Number.isNaN(to.getTime())) {
        where.date.lte = to;
      }
    }
  }

  // Resolve sectionId/classId to studentId filter using pre-queries
  if (filter.sectionId || filter.classId) {
    const resolvedStudentIds = await resolveGradeStudentIds(filter);
    if (resolvedStudentIds !== null) {
      if (where.studentId && typeof where.studentId === "string") {
        // filter.studentId is already set — keep it as it's more specific
      } else {
        where.studentId = { in: resolvedStudentIds };
      }
    }
  }

  return where;
}

/**
 * Resolve student IDs from sectionId/classId filters for grade queries.
 */
async function resolveGradeStudentIds(filter: GradeFilter): Promise<string[] | null> {
  if (!filter.sectionId && !filter.classId) return null;

  if (filter.sectionId && filter.classId) {
    const sections = await db.section.findMany({
      where: { classId: filter.classId, id: filter.sectionId },
      select: { id: true },
    });
    const sectionIds = sections.map((s: any) => s.id);
    if (sectionIds.length === 0) return [];
    const students = await db.student.findMany({
      where: { sectionId: { in: sectionIds } },
      select: { id: true },
    });
    return students.map((s: any) => s.id);
  }

  if (filter.sectionId) {
    const students = await db.student.findMany({
      where: { sectionId: filter.sectionId },
      select: { id: true },
    });
    return students.map((s: any) => s.id);
  }

  if (filter.classId) {
    const sections = await db.section.findMany({
      where: { classId: filter.classId },
      select: { id: true },
    });
    const sectionIds = sections.map((s: any) => s.id);
    if (sectionIds.length === 0) return [];
    const students = await db.student.findMany({
      where: { sectionId: { in: sectionIds } },
      select: { id: true },
    });
    return students.map((s: any) => s.id);
  }

  return null;
}

async function resolveGradeStudentIdsBySearch(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  try {
    const students = await db.student.findMany({
      where: {
        OR: [
          { fullName: { contains: query } },
          { studentCode: { contains: query } },
        ],
      },
      select: { id: true },
    });
    return students.map((s: any) => s.id);
  } catch {
    return [];
  }
}

async function resolveGradeTeacherIdsBySearch(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  try {
    const teachers = await db.teacher.findMany({
      where: { fullName: { contains: query } },
      select: { id: true },
    });
    return teachers.map((t: any) => t.id);
  } catch {
    return [];
  }
}

async function validateGradeRelations(input: {
  studentId: string;
  subjectId: string;
  teacherId?: string;
}): Promise<{
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
}> {
  const errors: Record<string, string> = {};

  const student = await db.student.findUnique({
    where: { id: input.studentId },
  });

  if (!student) {
    errors.studentId = "الطالب غير موجود.";
  } else if (student.status !== "active") {
    errors.studentId = "الطالب غير مستمر. لا يمكن إضافة درجات لطالب غير مستمر.";
  }

  const subject = await db.subject.findUnique({
    where: { id: input.subjectId },
  });

  if (!subject) {
    errors.subjectId = "المادة الدراسية غير موجودة.";
  }

  if (input.teacherId) {
    const teacher = await db.teacher.findUnique({
      where: { id: input.teacherId },
    });

    if (!teacher) {
      errors.teacherId = "المدرس غير موجود.";
    }

    if (teacher && subject) {
      const teacherSubject = await db.teacherSubject.findUnique({
        where: {
          teacherId_subjectId: {
            teacherId: input.teacherId,
            subjectId: input.subjectId,
          },
        },
      });

      if (!teacherSubject) {
        errors.teacherId = "المدرس غير مرتبط بهذه المادة الدراسية. لا يمكن إضافة درجة لهذا المدرس في مادة لا يدرّسها.";
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: "توجد مشكلة في البيانات المرتبطة.",
      errors,
    };
  }

  return {
    ok: true,
    message: "البيانات المرتبطة صحيحة.",
  };
}

function toGradeListItem(grade: GradeWithRelations): GradeListItem {
  const percentage = getGradePercentage(grade.score, grade.maxScore);
  const rating = getGradeRating(percentage);
  const ratingClass = getGradeRatingClass(percentage);

  return {
    id: grade.id,
    title: grade.title,
    score: grade.score,
    maxScore: grade.maxScore,
    percentage,
    rating,
    ratingClass,
    examType: grade.examType,
    examTypeLabel: getExamTypeLabel(grade.examType),
    term: grade.term ?? "first",
    termLabel: getTermLabel(grade.term ?? "first"),
    date: grade.date,
    notes: grade.notes,

    studentId: grade.studentId,
    studentName: grade.student.fullName,
    studentCode: grade.student.studentCode,

    sectionId: grade.student.sectionId,
    sectionName: grade.student.section?.name ?? null,

    classId: grade.student.section?.classId ?? null,
    className: grade.student.section?.class.name ?? null,
    classLevel: grade.student.section?.class.level ?? null,

    subjectId: grade.subjectId,
    subjectName: grade.subject.name,

    teacherId: grade.teacherId,
    teacherName: grade.teacher?.fullName ?? null,
    examId: (grade as any).examId ?? null,

    createdAt: grade.createdAt,
  };
}

export async function getGrades(
  filter: GradeFilter = {},
): Promise<GradeListItem[]> {
  const where = await buildGradeWhere(filter);

  const grades = await db.grade.findMany({
    where,
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
    include: gradeListInclude,
  });

  return grades.map((grade) => toGradeListItem(grade));
}

export async function searchGrades(
  query: string,
): Promise<GradeListItem[]> {
  return getGrades({
    query,
  });
}

export async function getGradeById(id: string): Promise<Grade | null> {
  return db.grade.findUnique({
    where: {
      id,
    },
  });
}

export async function getGradeDetails(
  id: string,
): Promise<GradeDetails | null> {
  const grade = await db.grade.findUnique({
    where: {
      id,
    },
    include: gradeListInclude,
  });

  if (!grade) {
    return null;
  }

  const listItem = toGradeListItem(grade);

  return {
    ...listItem,
    updatedAt: grade.updatedAt,
  };
}

export async function createGrade(
  input: GradeFormInput,
): Promise<GradeServiceResult<Grade>> {
  const validation = validateGradeInput(input);

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

  const data = normalizeGradeInput(input);

  const relationCheck = await validateGradeRelations({
    studentId: data.studentId,
    subjectId: data.subjectId,
    teacherId: data.teacherId,
  });

  if (!relationCheck.ok) {
    return {
      ok: false,
      message: relationCheck.message,
      errors: relationCheck.errors,
    };
  }

  try {
    const grade = await db.grade.create({
      data: {
        title: data.title,
        score: Number(data.score),
        maxScore: Number(data.maxScore),
        examType: data.examType ?? "monthly",
        term: data.term ?? "first",
        date: parseGradeDate(data.date) ?? new Date(),
        notes: data.notes ?? null,
        studentId: data.studentId,
        subjectId: data.subjectId,
        teacherId: data.teacherId ?? null,
        examId: data.examId ?? null,
      },
    });

    return {
      ok: true,
      data: grade,
      message: "تمت إضافة الدرجة بنجاح.",
    };
  } catch {
    return {
      ok: false,
      message: "حدث خطأ أثناء إضافة الدرجة.",
    };
  }
}

export async function updateGrade(
  id: string,
  input: GradeFormInput,
): Promise<GradeServiceResult<Grade>> {
  const validation = validateGradeInput(input);

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

  const existingGrade = await getGradeById(id);

  if (!existingGrade) {
    return {
      ok: false,
      message: "لم يتم العثور على الدرجة.",
    };
  }

  const data = normalizeGradeInput(input);

  const relationCheck = await validateGradeRelations({
    studentId: data.studentId,
    subjectId: data.subjectId,
    teacherId: data.teacherId,
  });

  if (!relationCheck.ok) {
    return {
      ok: false,
      message: relationCheck.message,
      errors: relationCheck.errors,
    };
  }

  try {
    const grade = await db.grade.update({
      where: {
        id,
      },
      data: {
        title: data.title,
        score: Number(data.score),
        maxScore: Number(data.maxScore),
        examType: data.examType ?? "monthly",
        term: data.term ?? "first",
        date: parseGradeDate(data.date) ?? existingGrade.date,
        notes: data.notes ?? null,
        studentId: data.studentId,
        subjectId: data.subjectId,
        teacherId: data.teacherId ?? null,
      },
    });

    return {
      ok: true,
      data: grade,
      message: "تم تحديث الدرجة بنجاح.",
    };
  } catch {
    return {
      ok: false,
      message: "حدث خطأ أثناء تحديث الدرجة.",
    };
  }
}

export async function deleteGrade(
  id: string,
): Promise<GradeServiceResult<null>> {
  const grade = await db.grade.findUnique({
    where: {
      id,
    },
  });

  if (!grade) {
    return {
      ok: false,
      message: "لم يتم العثور على الدرجة.",
    };
  }

  const deleteCheck = canDeleteGrade();

  if (!deleteCheck.allowed) {
    return {
      ok: false,
      message: deleteCheck.reason ?? "لا يمكن حذف الدرجة حاليًا.",
    };
  }

  await db.grade.delete({
    where: {
      id,
    },
  });

  return {
    ok: true,
    data: null,
    message: "تم حذف الدرجة بنجاح.",
  };
}

export async function getGradesCount(): Promise<{
  total: number;
  excellent: number;
  passed: number;
  failed: number;
  averagePercentage: number;
}> {
  const grades = await db.grade.findMany({
    select: {
      score: true,
      maxScore: true,
    },
  });

  const total = grades.length;

  if (total === 0) {
    return {
      total: 0,
      excellent: 0,
      passed: 0,
      failed: 0,
      averagePercentage: 0,
    };
  }

  let excellent = 0;
  let passed = 0;
  let failed = 0;
  let totalPercentage = 0;

  for (const grade of grades) {
    const percentage = getGradePercentage(grade.score, grade.maxScore);
    totalPercentage += percentage;

    if (percentage >= 90) {
      excellent++;
    }

    if (percentage >= 50) {
      passed++;
    } else {
      failed++;
    }
  }

  const averagePercentage = Math.round(totalPercentage / total);

  return {
    total,
    excellent,
    passed,
    failed,
    averagePercentage,
  };
}

export async function getGradesByStudentId(
  studentId: string,
): Promise<GradeListItem[]> {
  return getGrades({
    studentId,
  });
}

export async function getGradesBySubjectId(
  subjectId: string,
): Promise<GradeListItem[]> {
  return getGrades({
    subjectId,
  });
}

export async function getStudentSubjectAverage(
  studentId: string,
  subjectId: string,
): Promise<{
  average: number;
  count: number;
} | null> {
  const grades = await db.grade.findMany({
    where: {
      studentId,
      subjectId,
    },
    select: {
      score: true,
      maxScore: true,
    },
  });

  if (grades.length === 0) {
    return null;
  }

  let totalPercentage = 0;

  for (const grade of grades) {
    totalPercentage += getGradePercentage(grade.score, grade.maxScore);
  }

  return {
    average: Math.round(totalPercentage / grades.length),
    count: grades.length,
  };
}

export async function hasGrades(): Promise<boolean> {
  const count = await db.grade.count();
  return count > 0;
}
