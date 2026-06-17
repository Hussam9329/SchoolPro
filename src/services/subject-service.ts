import { Prisma } from "@/lib/prisma-types";
import { db } from "@/lib/db";
import { getDatabaseUnavailableMessage, isDatabaseStorageEnabled } from "@/lib/storage-mode";
import {
  getSubjectDeleteAssociations,
  normalizeSubjectInput,
  validateSubjectInput,
  type Subject,
  type SubjectFormInput,
  type SubjectListItem,
} from "@/types/subject";

export type SubjectServiceResult<T> = {
  ok: boolean;
  data?: T;
  message: string;
  errors?: Record<string, string>;
};

const DELETE_DETAILS_LIMIT = 8;

function compactDeleteDetails(values: Array<string | null | undefined>, totalCount: number): string[] {
  const uniqueValues = Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))),
  );
  const visibleValues = uniqueValues.slice(0, DELETE_DETAILS_LIMIT);
  const hiddenCount = Math.max(totalCount - visibleValues.length, 0);

  if (hiddenCount > 0) {
    return [...visibleValues, `+ ${hiddenCount} عناصر أخرى`];
  }

  return visibleValues;
}

function formatClassDeleteDetail(schoolClass: { name?: string | null; level?: string | null } | null | undefined): string | undefined {
  if (!schoolClass?.name) return undefined;
  return schoolClass.level ? `${schoolClass.name} - ${schoolClass.level}` : schoolClass.name;
}

function toSubjectListItem(subject: any): SubjectListItem {
  const teachersCount = subject._count?.teacherSubjects ?? 0;
  const classesCount = subject._count?.classSubjects ?? 0;
  const gradesCount = subject._count?.grades ?? 0;
  const schedulesCount = subject._count?.schedules ?? 0;
  const examsCount = subject._count?.exams ?? 0;

  const teacherDetails = compactDeleteDetails(
    (subject.teacherSubjects ?? []).map((teacherSubject: any) => {
      const teacher = teacherSubject.teacher;
      if (!teacher?.fullName) return undefined;
      return teacher.specialty ? `${teacher.fullName} - ${teacher.specialty}` : teacher.fullName;
    }),
    teachersCount,
  );

  const classDetails = compactDeleteDetails(
    (subject.classSubjects ?? []).map((classSubject: any) => formatClassDeleteDetail(classSubject.class)),
    classesCount,
  );

  const deleteCheck = getSubjectDeleteAssociations({
    teachersCount,
    classesCount,
    gradesCount,
    schedulesCount,
    examsCount,
    teacherDetails,
    classDetails,
  });

  return {
    id: subject.id,
    name: subject.name,
    description: subject.description,
    isActive: subject.isActive,
    teachersCount,
    classesCount,
    gradesCount,
    schedulesCount,
    examsCount,
    deleteAssociations: deleteCheck.associations,
    createdAt: subject.createdAt,
  };
}

export async function getSubjects(): Promise<SubjectListItem[]> {
  const subjects = await db.subject.findMany({
    orderBy: [
      {
        isActive: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    include: {
      teacherSubjects: {
        include: {
          teacher: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      classSubjects: {
        include: {
          class: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      _count: {
        select: {
          teacherSubjects: true,
          classSubjects: true,
          grades: true,
          schedules: true,
          exams: true,
        },
      },
    },
  });

  return subjects.map(toSubjectListItem);
}


export async function getActiveSubjects(): Promise<Subject[]> {
  return db.subject.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export async function getSubjectById(id: string): Promise<Subject | null> {
  return db.subject.findUnique({
    where: {
      id,
    },
  });
}

export async function getSubjectDetails(id: string) {
  return db.subject.findUnique({
    where: {
      id,
    },
    include: {
      teacherSubjects: {
        include: {
          teacher: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      classSubjects: {
        include: {
          class: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      _count: {
        select: {
          grades: true,
          schedules: true,
        },
      },
    },
  });
}

export async function createSubject(
  input: SubjectFormInput,
): Promise<SubjectServiceResult<Subject>> {
  const validation = validateSubjectInput(input);

  if (!validation.valid) {
    const firstError = Object.values(validation.errors).find(Boolean) || "توجد بيانات ناقصة أو غير صحيحة.";
    return {
      ok: false,
      message: firstError as string,
      errors: validation.errors as Record<string, string>,
    };
  }

  if (!isDatabaseStorageEnabled()) {
    return {
      ok: false,
      message: getDatabaseUnavailableMessage(),
    };
  }

  const data = normalizeSubjectInput(input);

  try {
    const subject = await db.subject.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        isActive: true,
      },
    });

    return {
      ok: true,
      data: subject,
      message: "تمت إضافة المادة الدراسية بنجاح.",
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "هذه المادة موجودة مسبقًا.",
        errors: {
          name: "اسم المادة مستخدم مسبقًا.",
        },
      };
    }

    return {
      ok: false,
      message: "حدث خطأ أثناء إضافة المادة الدراسية.",
    };
  }
}

export async function updateSubject(
  id: string,
  input: SubjectFormInput,
): Promise<SubjectServiceResult<Subject>> {
  const validation = validateSubjectInput(input);

  if (!validation.valid) {
    const firstError = Object.values(validation.errors).find(Boolean) || "توجد بيانات ناقصة أو غير صحيحة.";
    return {
      ok: false,
      message: firstError as string,
      errors: validation.errors as Record<string, string>,
    };
  }

  if (!isDatabaseStorageEnabled()) {
    return {
      ok: false,
      message: getDatabaseUnavailableMessage(),
    };
  }

  const data = normalizeSubjectInput(input);

  const existingSubject = await getSubjectById(id);

  if (!existingSubject) {
    return {
      ok: false,
      message: "لم يتم العثور على المادة الدراسية.",
    };
  }

  try {
    const subject = await db.subject.update({
      where: {
        id,
      },
      data: {
        name: data.name,
        description: data.description ?? null,
        isActive: true,
      },
    });

    return {
      ok: true,
      data: subject,
      message: "تم تحديث المادة الدراسية بنجاح.",
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "هذه المادة موجودة مسبقًا.",
        errors: {
          name: "اسم المادة مستخدم مسبقًا.",
        },
      };
    }

    return {
      ok: false,
      message: "حدث خطأ أثناء تحديث المادة الدراسية.",
    };
  }
}

export async function deleteSubject(
  id: string,
): Promise<SubjectServiceResult<null>> {
  const subject = await db.subject.findUnique({ where: { id } });

  if (!subject) {
    return { ok: false, message: "لم يتم العثور على المادة الدراسية." };
  }

  try {
    // Cascade delete: grades → schedules → exams → teacherSubjects → classSubjects → subject
    await db.grade.deleteMany({ where: { subjectId: id } });
    await db.schedule.deleteMany({ where: { subjectId: id } });
    await db.exam.deleteMany({ where: { subjectId: id } });
    await db.teacherSubject.deleteMany({ where: { subjectId: id } });
    await db.classSubject.deleteMany({ where: { subjectId: id } });
    await db.subject.delete({ where: { id } });
  } catch (error) {
    console.error("[deleteSubject] Error:", error);
    return { ok: false, message: "حدث خطأ أثناء حذف المادة الدراسية. حاول مرة أخرى." };
  }

  return { ok: true, data: null, message: "تم حذف المادة الدراسية وجميع البيانات المرتبطة بها بنجاح." };
}

export async function getSubjectDeleteInfo(
  id: string,
): Promise<SubjectServiceResult<{ associations: { label: string; count: number; details?: string[] }[] }>> {
  const subject = await db.subject.findUnique({
    where: { id },
    include: {
      teacherSubjects: {
        include: {
          teacher: true,
        },
      },
      classSubjects: {
        include: {
          class: true,
        },
      },
      _count: {
        select: {
          teacherSubjects: true,
          classSubjects: true,
          grades: true,
          schedules: true,
          exams: true,
        },
      },
    },
  });

  if (!subject) {
    return { ok: false, message: "لم يتم العثور على المادة الدراسية." };
  }

  const item = toSubjectListItem(subject);

  return { ok: true, data: { associations: item.deleteAssociations }, message: "" };
}

export async function searchSubjects(query: string): Promise<SubjectListItem[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return getSubjects();
  }

  const subjects = await db.subject.findMany({
    where: {
      OR: [
        {
          name: {
            contains: normalizedQuery,
          },
        },
        {
          description: {
            contains: normalizedQuery,
          },
        },
      ],
    },
    orderBy: {
      name: "asc",
    },
    include: {
      teacherSubjects: {
        include: {
          teacher: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      classSubjects: {
        include: {
          class: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      _count: {
        select: {
          teacherSubjects: true,
          classSubjects: true,
          grades: true,
          schedules: true,
          exams: true,
        },
      },
    },
  });

  return subjects.map(toSubjectListItem);
}


export async function getSubjectsCount(): Promise<{
  total: number;
  active: number;
  inactive: number;
}> {
  const total = await db.subject.count();

  return {
    total,
    active: total,
    inactive: 0,
  };
}

export async function hasSubjects(): Promise<boolean> {
  const count = await db.subject.count();
  return count > 0;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002") ||
    ((error as any)?.code === "P2002")
  );
}
