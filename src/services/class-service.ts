import { Prisma } from "@/lib/prisma-types";
import { db } from "@/lib/db";
import { getDatabaseUnavailableMessage, isDatabaseStorageEnabled } from "@/lib/storage-mode";
import {
  getClassDeleteAssociations,
  getSectionDeleteAssociations,
  normalizeClassInput,
  normalizeSectionInput,
  validateClassInput,
  validateSectionInput,
  type ClassDetails,
  type ClassFormInput,
  type ClassListItem,
  type SchoolClass,
  type Section,
  type SectionFormInput,
  type SectionListItem,
} from "@/types/class";

export type ClassServiceResult<T> = {
  ok: boolean;
  data?: T;
  message: string;
  errors?: Record<string, string>;
};

export async function getClasses(): Promise<ClassListItem[]> {
  const classes = await db.schoolClass.findMany({
    orderBy: [
      {
        isActive: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    include: {
      sections: {
        include: {
          _count: {
            select: {
              students: true,
              schedules: true,
            },
          },
        },
      },
      classSubjects: {
        select: {
          subjectId: true,
        },
      },
      _count: {
        select: {
          sections: true,
          classSubjects: true,
        },
      },
    },
  });

  return classes.map((schoolClass) => {
    const studentsCount = schoolClass.sections.reduce(
      (total, section) => total + section._count.students,
      0,
    );
    const schedulesCount = schoolClass.sections.reduce(
      (total, section) => total + section._count.schedules,
      0,
    );

    return {
      id: schoolClass.id,
      name: schoolClass.name,
      level: schoolClass.level,
      description: schoolClass.description,
      isActive: schoolClass.isActive,
      sectionsCount: schoolClass._count.sections,
      studentsCount,
      subjectsCount: schoolClass._count.classSubjects,
      schedulesCount,
      subjectIds: schoolClass.classSubjects.map((cs: { subjectId: string }) => cs.subjectId),
      createdAt: schoolClass.createdAt,
    };
  });
}

export async function getActiveClasses(): Promise<SchoolClass[]> {
  return db.schoolClass.findMany({
    orderBy: [
      {
        level: "asc",
      },
      {
        name: "asc",
      },
    ],
  });
}

export async function getClassById(id: string): Promise<SchoolClass | null> {
  return db.schoolClass.findUnique({
    where: {
      id,
    },
  });
}

export async function getClassDetails(
  id: string,
): Promise<ClassDetails | null> {
  const schoolClass = await db.schoolClass.findUnique({
    where: {
      id,
    },
    include: {
      sections: {
        include: {
          _count: {
            select: {
              students: true,
              schedules: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      },
      _count: {
        select: {
          classSubjects: true,
        },
      },
    },
  });

  if (!schoolClass) {
    return null;
  }

  const sections: SectionListItem[] = schoolClass.sections.map((section) => ({
    id: section.id,
    name: section.name,
    capacity: section.capacity,
    description: section.description,
    isActive: section.isActive,
    classId: section.classId,
    className: schoolClass.name,
    studentsCount: section._count.students,
    schedulesCount: section._count.schedules,
    createdAt: section.createdAt,
  }));

  const studentsCount = sections.reduce(
    (total, section) => total + section.studentsCount,
    0,
  );
  const schedulesCount = sections.reduce(
    (total, section) => total + section.schedulesCount,
    0,
  );

  return {
    id: schoolClass.id,
    name: schoolClass.name,
    level: schoolClass.level,
    description: schoolClass.description,
    isActive: schoolClass.isActive,
    createdAt: schoolClass.createdAt,
    updatedAt: schoolClass.updatedAt,
    sections,
    subjectsCount: schoolClass._count.classSubjects,
    schedulesCount,
    studentsCount,
  };
}

export async function createClass(
  input: ClassFormInput,
): Promise<ClassServiceResult<SchoolClass>> {
  const validation = validateClassInput(input);

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

  const data = normalizeClassInput(input);

  try {
    const schoolClass = await db.schoolClass.create({
      data: {
        name: data.name,
        level: data.level ?? null,
        description: data.description ?? null,
        isActive: true,
      },
    });

    return {
      ok: true,
      data: schoolClass,
      message: "تمت إضافة الصف بنجاح.",
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "هذا الصف موجود مسبقًا بنفس المرحلة.",
        errors: {
          name: "اسم الصف والمرحلة مستخدمان مسبقًا.",
        },
      };
    }

    return {
      ok: false,
      message: "حدث خطأ أثناء إضافة الصف.",
    };
  }
}

export async function updateClass(
  id: string,
  input: ClassFormInput,
): Promise<ClassServiceResult<SchoolClass>> {
  const validation = validateClassInput(input);

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

  const existingClass = await getClassById(id);

  if (!existingClass) {
    return {
      ok: false,
      message: "لم يتم العثور على الصف.",
    };
  }

  const data = normalizeClassInput(input);

  try {
    const schoolClass = await db.schoolClass.update({
      where: {
        id,
      },
      data: {
        name: data.name,
        level: data.level ?? null,
        description: data.description ?? null,
        isActive: true,
      },
    });

    return {
      ok: true,
      data: schoolClass,
      message: "تم تحديث بيانات الصف بنجاح.",
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "يوجد صف آخر بنفس الاسم والمرحلة.",
        errors: {
          name: "اسم الصف والمرحلة مستخدمان مسبقًا.",
        },
      };
    }

    return {
      ok: false,
      message: "حدث خطأ أثناء تحديث الصف.",
    };
  }
}

export async function deleteClass(
  id: string,
): Promise<ClassServiceResult<null>> {
  const schoolClass = await db.schoolClass.findUnique({ where: { id } });

  if (!schoolClass) {
    return { ok: false, message: "لم يتم العثور على الصف." };
  }

  try {
    // Get all section IDs for this class
    const sections = await db.section.findMany({
      where: { classId: id },
      select: { id: true },
    });
    const sectionIds = sections.map((s) => s.id);

    // Get all student IDs in those sections
    const students = await db.student.findMany({
      where: { sectionId: { in: sectionIds } },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);

    // Cascade delete in correct order
    if (studentIds.length > 0) {
      await db.grade.deleteMany({ where: { studentId: { in: studentIds } } });
      await db.attendanceRecord.deleteMany({ where: { studentId: { in: studentIds } } });
      await db.payment.deleteMany({ where: { studentId: { in: studentIds } } });
    }
    await db.schedule.deleteMany({ where: { sectionId: { in: sectionIds } } });
    await db.exam.deleteMany({ where: { sectionId: { in: sectionIds } } });
    await db.teacherSection.deleteMany({ where: { sectionId: { in: sectionIds } } });
    await db.classSubject.deleteMany({ where: { classId: id } });
    await db.classFeeSetting.deleteMany({ where: { classId: id } });
    await db.student.deleteMany({ where: { sectionId: { in: sectionIds } } });
    await db.section.deleteMany({ where: { classId: id } });
    await db.schoolClass.delete({ where: { id } });
  } catch (error) {
    console.error("[deleteClass] Error:", error);
    return { ok: false, message: "حدث خطأ أثناء حذف الصف. حاول مرة أخرى." };
  }

  return { ok: true, data: null, message: "تم حذف الصف وجميع البيانات المرتبطة به بنجاح." };
}

export async function getClassDeleteInfo(
  id: string,
): Promise<ClassServiceResult<{ associations: { label: string; count: number }[] }>> {
  const schoolClass = await db.schoolClass.findUnique({
    where: { id },
    include: {
      sections: {
        include: {
          _count: { select: { students: true, schedules: true } },
        },
      },
      _count: { select: { sections: true, classSubjects: true } },
    },
  });

  if (!schoolClass) {
    return { ok: false, message: "لم يتم العثور على الصف." };
  }

  const studentsCount = schoolClass.sections.reduce(
    (total, section) => total + section._count.students, 0,
  );
  const schedulesCount = schoolClass.sections.reduce(
    (total, section) => total + section._count.schedules, 0,
  );

  const check = getClassDeleteAssociations({
    sectionsCount: schoolClass._count.sections,
    studentsCount,
    subjectsCount: schoolClass._count.classSubjects,
    schedulesCount,
  });

  return { ok: true, data: { associations: check.associations }, message: "" };
}

export async function searchClasses(query: string): Promise<ClassListItem[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return getClasses();
  }

  const classes = await db.schoolClass.findMany({
    where: {
      OR: [
        {
          name: {
            contains: normalizedQuery,
          },
        },
        {
          level: {
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
      sections: {
        include: {
          _count: {
            select: {
              students: true,
              schedules: true,
            },
          },
        },
      },
      classSubjects: {
        select: {
          subjectId: true,
        },
      },
      _count: {
        select: {
          sections: true,
          classSubjects: true,
        },
      },
    },
  });

  return classes.map((schoolClass) => {
    const studentsCount = schoolClass.sections.reduce(
      (total, section) => total + section._count.students,
      0,
    );
    const schedulesCount = schoolClass.sections.reduce(
      (total, section) => total + section._count.schedules,
      0,
    );

    return {
      id: schoolClass.id,
      name: schoolClass.name,
      level: schoolClass.level,
      description: schoolClass.description,
      isActive: schoolClass.isActive,
      sectionsCount: schoolClass._count.sections,
      studentsCount,
      subjectsCount: schoolClass._count.classSubjects,
      schedulesCount,
      subjectIds: schoolClass.classSubjects.map((cs: { subjectId: string }) => cs.subjectId),
      createdAt: schoolClass.createdAt,
    };
  });
}

export async function getClassesCount(): Promise<{
  total: number;
  active: number;
  inactive: number;
  sections: number;
}> {
  const [total, sections] = await Promise.all([
    db.schoolClass.count(),
    db.section.count(),
  ]);

  return {
    total,
    active: total,
    inactive: 0,
    sections,
  };
}

export async function hasClasses(): Promise<boolean> {
  const count = await db.schoolClass.count();
  return count > 0;
}

export async function getSections(): Promise<SectionListItem[]> {
  const sections = await db.section.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      class: true,
      _count: {
        select: {
          students: true,
          schedules: true,
        },
      },
    },
  });

  return sections
    .map((section) => ({
      id: section.id,
      name: section.name,
      capacity: section.capacity,
      description: section.description,
      isActive: section.isActive,
      classId: section.classId,
      className: section.class?.name ?? "صف غير معروف",
      studentsCount: section._count?.students ?? 0,
      schedulesCount: section._count?.schedules ?? 0,
      createdAt: section.createdAt,
    }))
    .sort((a, b) => {
      const classCompare = a.className.localeCompare(b.className, "ar");
      return classCompare !== 0 ? classCompare : a.name.localeCompare(b.name, "ar");
    });
}

export async function getOrCreateDefaultSectionForClass(
  classId: string,
): Promise<ClassServiceResult<Section>> {
  const normalizedClassId = classId.trim();

  if (!normalizedClassId) {
    return {
      ok: false,
      message: "يجب اختيار الصف.",
    };
  }

  if (!isDatabaseStorageEnabled()) {
    return {
      ok: false,
      message: getDatabaseUnavailableMessage(),
    };
  }

  const schoolClass = await getClassById(normalizedClassId);

  if (!schoolClass) {
    return {
      ok: false,
      message: "لم يتم العثور على الصف المحدد.",
    };
  }

  const existingSection = await db.section.findFirst({
    where: {
      classId: normalizedClassId,
    },
    orderBy: {
      name: "asc",
    },
  });

  if (existingSection) {
    return {
      ok: true,
      data: existingSection,
      message: "تم اختيار شعبة موجودة داخل الصف.",
    };
  }

  try {
    const section = await db.section.create({
      data: {
        name: "عام",
        capacity: null,
        description: "شعبة تلقائية أُنشئت عند إضافة طالب إلى صف بدون شُعب.",
        isActive: true,
        classId: normalizedClassId,
      },
    });

    return {
      ok: true,
      data: section,
      message: "تم إنشاء شعبة عامة للصف.",
    };
  } catch (error) {
    const fallbackSection = await db.section.findFirst({
      where: {
        classId: normalizedClassId,
      },
      orderBy: {
        name: "asc",
      },
    });

    if (fallbackSection) {
      return {
        ok: true,
        data: fallbackSection,
        message: "تم اختيار شعبة موجودة داخل الصف.",
      };
    }

    console.error("[getOrCreateDefaultSectionForClass] Error:", error);
    return {
      ok: false,
      message: "تعذر تجهيز شعبة داخل الصف المحدد.",
    };
  }
}

export async function getSectionsByClassId(
  classId: string,
): Promise<SectionListItem[]> {
  const sections = await db.section.findMany({
    where: {
      classId,
    },
    orderBy: {
      name: "asc",
    },
    include: {
      class: true,
      _count: {
        select: {
          students: true,
          schedules: true,
        },
      },
    },
  });

  return sections.map((section) => ({
    id: section.id,
    name: section.name,
    capacity: section.capacity,
    description: section.description,
    isActive: section.isActive,
    classId: section.classId,
    className: section.class.name,
    studentsCount: section._count.students,
    schedulesCount: section._count.schedules,
    createdAt: section.createdAt,
  }));
}

export async function getActiveSectionsByClassId(
  classId: string,
): Promise<Section[]> {
  return db.section.findMany({
    where: {
      classId,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getSectionById(id: string): Promise<Section | null> {
  return db.section.findUnique({
    where: {
      id,
    },
  });
}

export async function createSection(
  input: SectionFormInput,
): Promise<ClassServiceResult<Section>> {
  const validation = validateSectionInput(input);

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

  const data = normalizeSectionInput(input);

  const schoolClass = await getClassById(data.classId);

  if (!schoolClass) {
    return {
      ok: false,
      message: "لم يتم العثور على الصف المرتبط بهذه الشعبة.",
    };
  }

  try {
    const section = await db.section.create({
      data: {
        name: data.name,
        capacity:
          data.capacity === undefined ? null : Number(data.capacity),
        description: data.description ?? null,
        isActive: true,
        classId: data.classId,
      },
    });

    return {
      ok: true,
      data: section,
      message: "تمت إضافة الشعبة بنجاح.",
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "هذه الشعبة موجودة مسبقًا داخل نفس الصف.",
        errors: {
          name: "اسم الشعبة مستخدم مسبقًا داخل هذا الصف.",
        },
      };
    }

    return {
      ok: false,
      message: "حدث خطأ أثناء إضافة الشعبة.",
    };
  }
}

export async function updateSection(
  id: string,
  input: SectionFormInput,
): Promise<ClassServiceResult<Section>> {
  const validation = validateSectionInput(input);

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

  const existingSection = await getSectionById(id);

  if (!existingSection) {
    return {
      ok: false,
      message: "لم يتم العثور على الشعبة.",
    };
  }

  const data = normalizeSectionInput(input);

  try {
    const section = await db.section.update({
      where: {
        id,
      },
      data: {
        name: data.name,
        capacity:
          data.capacity === undefined ? null : Number(data.capacity),
        description: data.description ?? null,
        isActive: true,
        classId: data.classId,
      },
    });

    return {
      ok: true,
      data: section,
      message: "تم تحديث بيانات الشعبة بنجاح.",
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "توجد شعبة أخرى بنفس الاسم داخل هذا الصف.",
        errors: {
          name: "اسم الشعبة مستخدم مسبقًا داخل هذا الصف.",
        },
      };
    }

    return {
      ok: false,
      message: "حدث خطأ أثناء تحديث الشعبة.",
    };
  }
}

export async function deleteSection(
  id: string,
): Promise<ClassServiceResult<null>> {
  const section = await db.section.findUnique({ where: { id } });

  if (!section) {
    return { ok: false, message: "لم يتم العثور على الشعبة." };
  }

  try {
    // Get all student IDs in this section
    const students = await db.student.findMany({
      where: { sectionId: id },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);

    // Cascade delete in correct order
    if (studentIds.length > 0) {
      await db.grade.deleteMany({ where: { studentId: { in: studentIds } } });
      await db.attendanceRecord.deleteMany({ where: { studentId: { in: studentIds } } });
      await db.payment.deleteMany({ where: { studentId: { in: studentIds } } });
    }
    await db.schedule.deleteMany({ where: { sectionId: id } });
    await db.teacherSection.deleteMany({ where: { sectionId: id } });
    await db.student.deleteMany({ where: { sectionId: id } });
    await db.section.delete({ where: { id } });
  } catch (error) {
    console.error("[deleteSection] Error:", error);
    return { ok: false, message: "حدث خطأ أثناء حذف الشعبة. حاول مرة أخرى." };
  }

  return { ok: true, data: null, message: "تم حذف الشعبة وجميع البيانات المرتبطة بها بنجاح." };
}

export async function getSectionDeleteInfo(
  id: string,
): Promise<ClassServiceResult<{ associations: { label: string; count: number }[] }>> {
  const section = await db.section.findUnique({
    where: { id },
    include: {
      _count: { select: { students: true, schedules: true } },
    },
  });

  if (!section) {
    return { ok: false, message: "لم يتم العثور على الشعبة." };
  }

  const check = getSectionDeleteAssociations({
    studentsCount: section._count.students,
    schedulesCount: section._count.schedules,
  });

  return { ok: true, data: { associations: check.associations }, message: "" };
}

export async function assignSubjectsToClass(classId: string, subjectIds: string[]) {
  const uniqueSubjectIds = Array.from(new Set(subjectIds.filter(Boolean)));

  const schoolClass = await db.schoolClass.findUnique({
    where: { id: classId },
    select: { id: true },
  });

  if (!schoolClass) {
    return { ok: false as const, message: "لم يتم العثور على الصف." };
  }

  const validSubjects = await db.subject.findMany({
    where: {
      id: { in: uniqueSubjectIds },
    },
    select: { id: true },
  });

  await db.$transaction(async (tx) => {
    await tx.classSubject.deleteMany({ where: { classId } });

    if (validSubjects.length > 0) {
      await tx.classSubject.createMany({
        data: validSubjects.map((subject) => ({
          classId,
          subjectId: subject.id,
        })),
      });
    }
  });

  return { ok: true as const, message: "تم تحديث مواد الصف بنجاح." };
}

export async function getClassSubjectIds(classId: string) {
  const rows = await db.classSubject.findMany({
    where: { classId },
    select: { subjectId: true },
  });

  return rows.map((row) => row.subjectId);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002") ||
    ((error as any)?.code === "P2002")
  );
}
