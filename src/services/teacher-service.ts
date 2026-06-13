import { Prisma } from "@/lib/prisma-types";
import { db } from "@/lib/db";
import { getDatabaseUnavailableMessage, isDatabaseStorageEnabled } from "@/lib/storage-mode";
import {
  getTeacherDeleteAssociations,
  normalizeTeacherInput,
  validateTeacherInput,
  type Teacher,
  type TeacherDetails,
  type TeacherFormInput,
  type TeacherListItem,
} from "@/types/teacher";

export type TeacherServiceResult<T> = {
  ok: boolean;
  data?: T;
  message: string;
  errors?: Record<string, string>;
};

export async function getTeachers(): Promise<TeacherListItem[]> {
  const teachers = await db.teacher.findMany({
    orderBy: [
      {
        isActive: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    include: teacherListInclude,
  });

  return teachers.map((teacher) => toTeacherListItem(teacher));
}

export async function getActiveTeachers(): Promise<Teacher[]> {
  return db.teacher.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      fullName: "asc",
    },
  });
}

export async function getTeacherById(id: string): Promise<Teacher | null> {
  return db.teacher.findUnique({
    where: {
      id,
    },
  });
}

export async function getTeacherDetails(
  id: string,
): Promise<TeacherDetails | null> {
  const teacher = await db.teacher.findUnique({
    where: {
      id,
    },
    include: teacherListInclude,
  });

  if (!teacher) {
    return null;
  }

  return {
    id: teacher.id,
    fullName: teacher.fullName,
    phone: teacher.phone,
    email: teacher.email,
    address: teacher.address,
    specialty: teacher.specialty,
    salary: teacher.salary,
    notes: teacher.notes,
    isActive: teacher.isActive,
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt,
    subjects: teacher.teacherSubjects.map((item) => ({
      id: item.subject.id,
      name: item.subject.name,
    })),
    subjectsCount: teacher._count.teacherSubjects,
    schedulesCount: teacher._count.schedules,
    gradesCount: teacher._count.grades ?? 0,
    examsCount: teacher._count.exams ?? 0,
  };
}

async function findDuplicateTeacherName(fullName: string, excludeId?: string) {
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  return db.teacher.findFirst({
    where: {
      fullName: trimmed,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

async function findDuplicateTeacherPhone(phone: string, excludeId?: string) {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  return db.teacher.findFirst({
    where: {
      phone: trimmed,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, fullName: true },
  });
}

export async function createTeacher(
  input: TeacherFormInput,
): Promise<TeacherServiceResult<Teacher>> {
  const validation = validateTeacherInput(input);

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

  const data = normalizeTeacherInput(input);
  const subjectIds = await getValidSubjectIds(data.subjectIds ?? []);
  const sectionIds = await getValidSectionIds(data.sectionIds ?? []);

  if (subjectIds.length === 0) {
    return {
      ok: false,
      message: "المادة المحددة غير موجودة أو متوقفة. اختر مادة فعّالة ثم حاول مرة أخرى.",
      errors: { subjectIds: "المادة المحددة غير موجودة أو متوقفة." },
    };
  }

  const duplicateName = await findDuplicateTeacherName(data.fullName);
  if (duplicateName) {
    return {
      ok: false,
      message: "اسم المدرس مستخدم مسبقًا.",
      errors: { fullName: "اسم المدرس مستخدم مسبقًا." },
    };
  }

  const duplicatePhone = await findDuplicateTeacherPhone(data.phone);
  if (duplicatePhone) {
    return {
      ok: false,
      message: "رقم الهاتف مستخدم مسبقًا لمدرس آخر.",
      errors: { phone: "رقم الهاتف مستخدم مسبقًا لمدرس آخر." },
    };
  }

  try {
    const teacher = await db.teacher.create({
      data: {
        fullName: data.fullName,
        phone: data.phone ?? null,
        email: null,
        address: null,
        specialty: null,
        salary: null,
        notes: null,
        isActive: true,
        teacherSubjects: {
          create: subjectIds.map((subjectId) => ({
            subjectId,
          })),
        },
        teacherSections: {
          create: sectionIds.map((sectionId) => ({
            sectionId,
          })),
        },
      },
    });

    return {
      ok: true,
      data: teacher,
      message: "تمت إضافة المدرس بنجاح.",
    };
  } catch (error) {
    console.error("[createTeacher] Error:", error);

    if (
      (error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002") ||
      ((error as any)?.code === "P2002")
    ) {
      return {
        ok: false,
        message: "رقم الهاتف مستخدم مسبقًا لمدرس آخر.",
        errors: { phone: "رقم الهاتف مستخدم مسبقًا لمدرس آخر." },
      };
    }

    return {
      ok: false,
      message: "حدث خطأ أثناء إضافة المدرس أو ربطه بالمواد. لم يتم ترك سجل جزئي داخل جدول المدرسين.",
    };
  }
}

export async function updateTeacher(
  id: string,
  input: TeacherFormInput,
): Promise<TeacherServiceResult<Teacher>> {
  const validation = validateTeacherInput(input);

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

  const existingTeacher = await getTeacherById(id);

  if (!existingTeacher) {
    return {
      ok: false,
      message: "لم يتم العثور على المدرس.",
    };
  }

  const data = normalizeTeacherInput(input);
  const subjectIds = await getValidSubjectIds(data.subjectIds ?? []);
  const sectionIds = await getValidSectionIds(data.sectionIds ?? []);

  if (subjectIds.length === 0) {
    return {
      ok: false,
      message: "المادة المحددة غير موجودة أو متوقفة. اختر مادة فعّالة ثم حاول مرة أخرى.",
      errors: { subjectIds: "المادة المحددة غير موجودة أو متوقفة." },
    };
  }

  const duplicateName = await findDuplicateTeacherName(data.fullName, id);
  if (duplicateName) {
    return {
      ok: false,
      message: "اسم المدرس مستخدم مسبقًا.",
      errors: { fullName: "اسم المدرس مستخدم مسبقًا." },
    };
  }

  const duplicatePhone = await findDuplicateTeacherPhone(data.phone, id);
  if (duplicatePhone) {
    return {
      ok: false,
      message: "رقم الهاتف مستخدم مسبقًا لمدرس آخر.",
      errors: { phone: "رقم الهاتف مستخدم مسبقًا لمدرس آخر." },
    };
  }

  try {
    const teacher = await db.$transaction(async (tx) => {
      await tx.teacherSubject.deleteMany({
        where: {
          teacherId: id,
        },
      });
      await tx.teacherSection.deleteMany({
        where: {
          teacherId: id,
        },
      });

      return tx.teacher.update({
        where: {
          id,
        },
        data: {
          fullName: data.fullName,
          phone: data.phone ?? null,
          teacherSubjects: {
            create: subjectIds.map((subjectId) => ({
              subjectId,
            })),
          },
          teacherSections: {
            create: sectionIds.map((sectionId) => ({
              sectionId,
            })),
          },
        },
      });
    });

    return {
      ok: true,
      data: teacher,
      message: "تم تحديث بيانات المدرس بنجاح.",
    };
  } catch (error) {
    console.error("[updateTeacher] Error:", error);

    if (
      (error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002") ||
      ((error as any)?.code === "P2002")
    ) {
      return {
        ok: false,
        message: "رقم الهاتف مستخدم مسبقًا لمدرس آخر.",
        errors: { phone: "رقم الهاتف مستخدم مسبقًا لمدرس آخر." },
      };
    }

    return {
      ok: false,
      message: "حدث خطأ أثناء تحديث بيانات المدرس أو ربطه بالمواد.",
    };
  }
}

export async function deleteTeacher(
  id: string,
): Promise<TeacherServiceResult<null>> {
  const teacher = await db.teacher.findUnique({
    where: { id },
  });

  if (!teacher) {
    return { ok: false, message: "لم يتم العثور على المدرس." };
  }

  try {
    // اجمع المعرفات المرتبطة أولًا، لأن عميل external storage المستخدم هنا لا يدعم
    // الحذف بفلتر علاقة مثل: { schedule: { teacherId: id } } بشكل موثوق.
    const [schedules, exams] = await Promise.all([
      db.schedule.findMany({
        where: { teacherId: id },
        select: { id: true },
      }),
      db.exam.findMany({
        where: { teacherId: id },
        select: { id: true },
      }),
    ]);

    const scheduleIds = schedules.map((schedule) => schedule.id).filter(Boolean);
    const examIds = exams.map((exam) => exam.id).filter(Boolean);

    // Cascade delete in FK-safe order:
    // grades → attendance records → exams → schedules → teacher links → teacher
    if (examIds.length > 0) {
      await db.grade.deleteMany({ where: { examId: { in: examIds } } });
    }

    await db.grade.deleteMany({ where: { teacherId: id } });

    if (scheduleIds.length > 0) {
      await db.attendanceRecord.deleteMany({ where: { scheduleId: { in: scheduleIds } } });
    }

    await db.exam.deleteMany({ where: { teacherId: id } });
    await db.schedule.deleteMany({ where: { teacherId: id } });
    await db.teacherSubject.deleteMany({ where: { teacherId: id } });
    await db.teacherSection.deleteMany({ where: { teacherId: id } });
    await db.teacher.delete({ where: { id } });
  } catch (error) {
    console.error("[deleteTeacher] Error:", error);
    return { ok: false, message: "حدث خطأ أثناء حذف المدرس. حاول مرة أخرى." };
  }

  return { ok: true, data: null, message: "تم حذف المدرس وجميع البيانات المرتبطة به بنجاح." };
}

export async function getTeacherDeleteInfo(
  id: string,
): Promise<TeacherServiceResult<{ associations: { label: string; count: number }[] }>> {
  const teacher = await db.teacher.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          schedules: true,
          teacherSubjects: true,
          teacherSections: true,
          grades: true,
          exams: true,
        },
      },
    },
  });

  if (!teacher) {
    return { ok: false, message: "لم يتم العثور على المدرس." };
  }

  const check = getTeacherDeleteAssociations({
    schedulesCount: teacher._count.schedules,
    teacherSubjectsCount: teacher._count.teacherSubjects,
    teacherSectionsCount: teacher._count.teacherSections,
    gradesCount: teacher._count.grades,
    examsCount: teacher._count.exams,
  });

  return { ok: true, data: { associations: check.associations }, message: "" };
}

export async function toggleTeacherStatus(
  id: string,
): Promise<TeacherServiceResult<Teacher>> {
  const teacher = await getTeacherById(id);

  if (!teacher) {
    return {
      ok: false,
      message: "لم يتم العثور على المدرس.",
    };
  }

  const updatedTeacher = await db.teacher.update({
    where: {
      id,
    },
    data: {
      isActive: !teacher.isActive,
    },
  });

  return {
    ok: true,
    data: updatedTeacher,
    message: updatedTeacher.isActive
      ? "تم تفعيل المدرس."
      : "تم تعطيل المدرس.",
  };
}

export async function searchTeachers(
  query: string,
): Promise<TeacherListItem[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return getTeachers();
  }

  const teachers = await db.teacher.findMany({
    where: {
      OR: [
        {
          fullName: {
            contains: normalizedQuery,
          },
        },
        {
          phone: {
            contains: normalizedQuery,
          },
        },
        {
          email: {
            contains: normalizedQuery,
          },
        },
        {
          specialty: {
            contains: normalizedQuery,
          },
        },
        {
          teacherSubjects: {
            some: {
              subject: {
                name: {
                  contains: normalizedQuery,
                },
              },
            },
          },
        },
      ],
    },
    orderBy: {
      fullName: "asc",
    },
    include: teacherListInclude,
  });

  return teachers.map((teacher) => toTeacherListItem(teacher));
}

export async function getTeachersCount(): Promise<{
  total: number;
  active: number;
  inactive: number;
  withSubjects: number;
  withoutSubjects: number;
}> {
  const [total, active, inactive, withSubjects, withoutSubjects] =
    await Promise.all([
      db.teacher.count(),
      db.teacher.count({
        where: {
          isActive: true,
        },
      }),
      db.teacher.count({
        where: {
          isActive: false,
        },
      }),
      db.teacher.count({
        where: {
          teacherSubjects: {
            some: {},
          },
        },
      }),
      db.teacher.count({
        where: {
          teacherSubjects: {
            none: {},
          },
        },
      }),
    ]);

  return {
    total,
    active,
    inactive,
    withSubjects,
    withoutSubjects,
  };
}

export async function getTeachersBySubjectId(
  subjectId: string,
): Promise<TeacherListItem[]> {
  const teachers = await db.teacher.findMany({
    where: {
      teacherSubjects: {
        some: {
          subjectId,
        },
      },
    },
    orderBy: {
      fullName: "asc",
    },
    include: teacherListInclude,
  });

  return teachers.map((teacher) => toTeacherListItem(teacher));
}

export async function assignSubjectsToTeacher(
  teacherId: string,
  subjectIds: string[],
): Promise<TeacherServiceResult<TeacherDetails>> {
  const teacher = await getTeacherById(teacherId);

  if (!teacher) {
    return {
      ok: false,
      message: "لم يتم العثور على المدرس.",
    };
  }

  const validSubjectIds = await getValidSubjectIds(subjectIds);

  await db.$transaction(async (tx) => {
    await tx.teacherSubject.deleteMany({
      where: {
        teacherId,
      },
    });

    if (validSubjectIds.length > 0) {
      await tx.teacherSubject.createMany({
        data: validSubjectIds.map((subjectId) => ({
          teacherId,
          subjectId,
        })),
      });
    }
  });

  const updatedTeacher = await getTeacherDetails(teacherId);

  return {
    ok: true,
    data: updatedTeacher ?? undefined,
    message: "تم تحديث مواد المدرس بنجاح.",
  };
}

export async function hasTeachers(): Promise<boolean> {
  const count = await db.teacher.count();
  return count > 0;
}

async function getValidSubjectIds(subjectIds: string[]): Promise<string[]> {
  const uniqueIds = Array.from(new Set(subjectIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return [];
  }

  const subjects = await db.subject.findMany({
    where: {
      id: {
        in: uniqueIds,
      },
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  return subjects.map((subject) => subject.id);
}

async function getValidSectionIds(sectionIds: string[]): Promise<string[]> {
  const uniqueIds = Array.from(new Set(sectionIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return [];
  }

  const sections = await db.section.findMany({
    where: {
      id: {
        in: uniqueIds,
      },
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  return sections.map((section) => section.id);
}

const teacherListInclude = {
  teacherSubjects: {
    include: {
      subject: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  },
  teacherSections: {
    include: {
      section: {
        include: {
          class: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  },
  _count: {
    select: {
      teacherSubjects: true,
      schedules: true,
      grades: true,
      exams: true,
    },
  },
} satisfies Prisma.TeacherInclude;

type TeacherWithRelations = Prisma.TeacherGetPayload<{
  include: typeof teacherListInclude;
}>;

function toTeacherListItem(teacher: TeacherWithRelations): TeacherListItem {
  return {
    id: teacher.id,
    fullName: teacher.fullName,
    phone: teacher.phone,
    email: teacher.email,
    specialty: teacher.specialty,
    salary: teacher.salary,
    notes: teacher.notes,
    isActive: teacher.isActive,
    subjects: teacher.teacherSubjects.map((item) => ({
      id: item.subject.id,
      name: item.subject.name,
    })),
    sections: teacher.teacherSections.map((item) => ({
      id: item.section.id,
      name: item.section.name,
      className: item.section.class.name,
    })),
    subjectsCount: teacher._count.teacherSubjects,
    schedulesCount: teacher._count.schedules,
    gradesCount: teacher._count.grades ?? 0,
    examsCount: teacher._count.exams ?? 0,
    createdAt: teacher.createdAt,
  };
}
