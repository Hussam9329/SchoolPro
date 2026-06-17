import { Prisma } from "@/lib/prisma-types";
import { db } from "@/lib/db";
import { getDatabaseUnavailableMessage, isDatabaseStorageEnabled } from "@/lib/storage-mode";
import { getClassDisplayName } from "@/types/class";
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
import { getClassGradeLabel } from "@/lib/class-catalog";

export type ClassServiceResult<T> = {
  ok: boolean;
  data?: T;
  message: string;
  errors?: Record<string, string>;
};

const DELETE_DETAILS_LIMIT = 12;
const CARD_DETAILS_LIMIT = 30;

function compactDetails(values: Array<string | null | undefined>, totalCount = values.length, limit = DELETE_DETAILS_LIMIT): string[] {
  const uniqueValues = Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))),
  );
  const visibleValues = uniqueValues.slice(0, limit);
  const hiddenCount = Math.max(totalCount - visibleValues.length, 0);

  if (hiddenCount > 0) {
    return [...visibleValues, `+ ${hiddenCount} عناصر أخرى`];
  }

  return visibleValues;
}

function uniqueDetails(values: Array<string | null | undefined>, limit = CARD_DETAILS_LIMIT): string[] {
  return compactDetails(values, values.length, limit);
}

function formatTeacher(teacher: any): string | undefined {
  if (!teacher?.fullName) return undefined;
  return teacher.specialty ? `${teacher.fullName} - ${teacher.specialty}` : teacher.fullName;
}

function formatStudent(student: any, sectionName?: string | null): string | undefined {
  if (!student?.fullName) return undefined;
  return sectionName ? `${student.fullName} - شعبة ${sectionName}` : student.fullName;
}

function formatSubject(subject: any): string | undefined {
  return subject?.name || undefined;
}

function formatSchedule(schedule: any, sectionName?: string | null): string | undefined {
  if (!schedule) return undefined;
  const subject = schedule.subject?.name ?? "مادة غير محددة";
  const teacher = schedule.teacher?.fullName ? ` - ${schedule.teacher.fullName}` : "";
  const time = schedule.dayOfWeek ? `${schedule.dayOfWeek} ${schedule.startTime ?? ""}-${schedule.endTime ?? ""}`.trim() : "موعد غير محدد";
  return sectionName ? `${subject} / شعبة ${sectionName} / ${time}${teacher}` : `${subject} / ${time}${teacher}`;
}

function getClassStorageValues(input: ClassFormInput) {
  const data = normalizeClassInput(input);
  return {
    name: data.name ?? "",
    level: data.level ?? null,
    schoolStage: data.schoolStage ?? null,
    gradeLevel: data.gradeLevel ?? null,
    studyTrack: data.studyTrack ?? null,
    description: data.description ?? null,
  };
}

function toSchoolClass(row: any): SchoolClass {
  return {
    id: row.id,
    name: row.name,
    level: row.level ?? null,
    schoolStage: row.schoolStage ?? null,
    gradeLevel: row.gradeLevel ?? null,
    studyTrack: row.studyTrack ?? null,
    description: row.description ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSectionListItem(section: any, fallbackClass?: any): SectionListItem {
  const schoolClass = section.class ?? fallbackClass ?? null;
  const className = schoolClass ? getClassDisplayName(schoolClass) : "صف غير معروف";
  const studentsCount = section._count?.students ?? section.students?.length ?? 0;
  const schedulesCount = section._count?.schedules ?? section.schedules?.length ?? 0;
  const studentDetails = uniqueDetails((section.students ?? []).map((student: any) => formatStudent(student)));
  const teacherDetails = uniqueDetails([
    ...(section.teacherSections ?? []).map((teacherSection: any) => formatTeacher(teacherSection.teacher)),
    ...(section.schedules ?? []).map((schedule: any) => formatTeacher(schedule.teacher)),
  ]);
  const subjectDetails = uniqueDetails((section.schedules ?? []).map((schedule: any) => formatSubject(schedule.subject)));
  const scheduleDetails = uniqueDetails((section.schedules ?? []).map((schedule: any) => formatSchedule(schedule)));
  const deleteCheck = getSectionDeleteAssociations({
    studentsCount,
    schedulesCount,
    studentDetails: compactDetails(studentDetails, studentsCount),
    teacherDetails: compactDetails(teacherDetails, teacherDetails.length),
    subjectDetails: compactDetails(subjectDetails, subjectDetails.length),
    scheduleDetails: compactDetails(scheduleDetails, schedulesCount),
  });

  return {
    id: section.id,
    name: section.name,
    capacity: section.capacity,
    description: section.description,
    isActive: section.isActive,
    classId: section.classId,
    className,
    classLevel: schoolClass?.level ?? null,
    schoolStage: schoolClass?.schoolStage ?? null,
    gradeLevel: schoolClass?.gradeLevel ?? null,
    studyTrack: schoolClass?.studyTrack ?? null,
    studentsCount,
    schedulesCount,
    studentDetails,
    teacherDetails,
    subjectDetails,
    scheduleDetails,
    deleteAssociations: deleteCheck.associations,
    createdAt: section.createdAt,
  };
}

function toClassListItem(schoolClass: any): ClassListItem {
  const sections = schoolClass.sections ?? [];
  const studentsCount = sections.reduce(
    (total: number, section: any) => total + (section._count?.students ?? section.students?.length ?? 0),
    0,
  );
  const schedulesCount = sections.reduce(
    (total: number, section: any) => total + (section._count?.schedules ?? section.schedules?.length ?? 0),
    0,
  );
  const subjectsCount = schoolClass._count?.classSubjects ?? schoolClass.classSubjects?.length ?? 0;
  const teachers = sections.flatMap((section: any) => [
    ...(section.teacherSections ?? []).map((teacherSection: any) => formatTeacher(teacherSection.teacher)),
    ...(section.schedules ?? []).map((schedule: any) => formatTeacher(schedule.teacher)),
  ]);
  const classSubjects = (schoolClass.classSubjects ?? []).map((classSubject: any) => classSubject.subject);
  const scheduleSubjects = sections.flatMap((section: any) => (section.schedules ?? []).map((schedule: any) => schedule.subject));
  const sectionDetails = uniqueDetails(sections.map((section: any) => {
    const count = section._count?.students ?? section.students?.length ?? 0;
    return `شعبة ${section.name} - ${count} طالب`;
  }));
  const studentDetails = uniqueDetails(
    sections.flatMap((section: any) => (section.students ?? []).map((student: any) => formatStudent(student, section.name))),
  );
  const teacherDetails = uniqueDetails(teachers);
  const subjectDetails = uniqueDetails([
    ...classSubjects.map(formatSubject),
    ...scheduleSubjects.map(formatSubject),
  ]);
  const scheduleDetails = uniqueDetails(
    sections.flatMap((section: any) => (section.schedules ?? []).map((schedule: any) => formatSchedule(schedule, section.name))),
  );
  const deleteCheck = getClassDeleteAssociations({
    sectionsCount: schoolClass._count?.sections ?? sections.length,
    studentsCount,
    subjectsCount,
    schedulesCount,
    sectionDetails: compactDetails(sectionDetails, sections.length),
    studentDetails: compactDetails(studentDetails, studentsCount),
    teacherDetails: compactDetails(teacherDetails, teacherDetails.length),
    subjectDetails: compactDetails(subjectDetails, subjectsCount),
    scheduleDetails: compactDetails(scheduleDetails, schedulesCount),
  });

  return {
    id: schoolClass.id,
    name: schoolClass.name,
    level: schoolClass.level ?? null,
    schoolStage: schoolClass.schoolStage ?? null,
    gradeLevel: schoolClass.gradeLevel ?? null,
    studyTrack: schoolClass.studyTrack ?? null,
    description: schoolClass.description,
    isActive: schoolClass.isActive,
    sectionsCount: schoolClass._count?.sections ?? sections.length,
    studentsCount,
    subjectsCount,
    schedulesCount,
    subjectIds: (schoolClass.classSubjects ?? []).map((cs: { subjectId: string }) => cs.subjectId),
    sectionDetails,
    studentDetails,
    teacherDetails,
    subjectDetails,
    scheduleDetails,
    deleteAssociations: deleteCheck.associations,
    createdAt: schoolClass.createdAt,
  };
}

const classListInclude = {
  sections: {
    include: {
      students: {
        orderBy: { fullName: "asc" },
      },
      schedules: {
        include: {
          subject: true,
          teacher: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      teacherSections: {
        include: {
          teacher: true,
        },
      },
      _count: {
        select: {
          students: true,
          schedules: true,
        },
      },
    },
    orderBy: { name: "asc" },
  },
  classSubjects: {
    include: {
      subject: true,
    },
    orderBy: { createdAt: "desc" },
  },
  _count: {
    select: {
      sections: true,
      classSubjects: true,
    },
  },
};

const sectionListInclude = {
  class: true,
  students: {
    orderBy: { fullName: "asc" },
  },
  teacherSections: {
    include: {
      teacher: true,
    },
  },
  schedules: {
    include: {
      subject: true,
      teacher: true,
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  },
  _count: {
    select: {
      students: true,
      schedules: true,
    },
  },
};

export async function getClasses(): Promise<ClassListItem[]> {
  const classes = await db.schoolClass.findMany({
    orderBy: [
      { isActive: "desc" },
      { schoolStage: "asc" },
      { gradeLevel: "asc" },
      { studyTrack: "asc" },
      { createdAt: "desc" },
    ],
    include: classListInclude,
  });

  return classes.map(toClassListItem);
}

export async function getActiveClasses(): Promise<SchoolClass[]> {
  const classes = await db.schoolClass.findMany({
    where: { isActive: true },
    orderBy: [
      { schoolStage: "asc" },
      { gradeLevel: "asc" },
      { studyTrack: "asc" },
      { level: "asc" },
      { name: "asc" },
    ],
  });

  return classes.map(toSchoolClass);
}

export async function getClassById(id: string): Promise<SchoolClass | null> {
  const schoolClass = await db.schoolClass.findUnique({ where: { id } });
  return schoolClass ? toSchoolClass(schoolClass) : null;
}

export async function getClassDetails(id: string): Promise<ClassDetails | null> {
  const schoolClass = await db.schoolClass.findUnique({
    where: { id },
    include: classListInclude,
  });

  if (!schoolClass) return null;

  const classItem = toClassListItem(schoolClass);
  const sections: SectionListItem[] = (schoolClass.sections ?? []).map((section: any) =>
    toSectionListItem(section, schoolClass),
  );

  return {
    id: schoolClass.id,
    name: schoolClass.name,
    level: schoolClass.level ?? null,
    schoolStage: schoolClass.schoolStage ?? null,
    gradeLevel: schoolClass.gradeLevel ?? null,
    studyTrack: schoolClass.studyTrack ?? null,
    description: schoolClass.description,
    isActive: schoolClass.isActive,
    createdAt: schoolClass.createdAt,
    updatedAt: schoolClass.updatedAt,
    sections,
    subjectsCount: classItem.subjectsCount,
    schedulesCount: classItem.schedulesCount,
    studentsCount: classItem.studentsCount,
  };
}

export async function createClass(input: ClassFormInput): Promise<ClassServiceResult<SchoolClass>> {
  const validation = validateClassInput(input);

  if (!validation.valid) {
    return {
      ok: false,
      message: (Object.values(validation.errors).find(Boolean) as string) || "توجد بيانات ناقصة أو غير صحيحة.",
      errors: validation.errors as Record<string, string>,
    };
  }

  if (!isDatabaseStorageEnabled()) {
    return { ok: false, message: getDatabaseUnavailableMessage() };
  }

  const data = getClassStorageValues(input);

  try {
    const schoolClass = await db.schoolClass.create({
      data: {
        name: data.name,
        level: data.level,
        schoolStage: data.schoolStage,
        gradeLevel: data.gradeLevel,
        studyTrack: data.studyTrack,
        description: data.description,
        isActive: true,
      },
    });

    return { ok: true, data: toSchoolClass(schoolClass), message: "تمت إضافة الصف بنجاح." };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "هذا الصف موجود مسبقًا بنفس المرحلة والتخصص.",
        errors: { gradeLevel: "اسم الصف والمرحلة والتخصص مستخدمة مسبقًا." },
      };
    }

    return { ok: false, message: "حدث خطأ أثناء إضافة الصف." };
  }
}

export async function updateClass(id: string, input: ClassFormInput): Promise<ClassServiceResult<SchoolClass>> {
  const validation = validateClassInput(input);

  if (!validation.valid) {
    return {
      ok: false,
      message: (Object.values(validation.errors).find(Boolean) as string) || "توجد بيانات ناقصة أو غير صحيحة.",
      errors: validation.errors as Record<string, string>,
    };
  }

  if (!isDatabaseStorageEnabled()) {
    return { ok: false, message: getDatabaseUnavailableMessage() };
  }

  const existingClass = await getClassById(id);
  if (!existingClass) {
    return { ok: false, message: "لم يتم العثور على الصف." };
  }

  const data = getClassStorageValues(input);

  try {
    const schoolClass = await db.schoolClass.update({
      where: { id },
      data: {
        name: data.name,
        level: data.level,
        schoolStage: data.schoolStage,
        gradeLevel: data.gradeLevel,
        studyTrack: data.studyTrack,
        description: data.description,
        isActive: true,
      },
    });

    return { ok: true, data: toSchoolClass(schoolClass), message: "تم تحديث بيانات الصف بنجاح." };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "يوجد صف آخر بنفس الاسم والمرحلة والتخصص.",
        errors: { gradeLevel: "اسم الصف والمرحلة والتخصص مستخدمة مسبقًا." },
      };
    }

    return { ok: false, message: "حدث خطأ أثناء تحديث الصف." };
  }
}

export async function deleteClass(id: string): Promise<ClassServiceResult<null>> {
  const schoolClass = await db.schoolClass.findUnique({ where: { id } });

  if (!schoolClass) {
    return { ok: false, message: "لم يتم العثور على الصف." };
  }

  try {
    const sections = await db.section.findMany({ where: { classId: id }, select: { id: true } });
    const sectionIds = sections.map((s: any) => s.id);

    const students = await db.student.findMany({ where: { sectionId: { in: sectionIds } }, select: { id: true } });
    const studentIds = students.map((s: any) => s.id);

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
): Promise<ClassServiceResult<{ associations: { label: string; count: number; details?: string[] }[] }>> {
  const schoolClass = await db.schoolClass.findUnique({ where: { id }, include: classListInclude });

  if (!schoolClass) {
    return { ok: false, message: "لم يتم العثور على الصف." };
  }

  const item = toClassListItem(schoolClass);
  return { ok: true, data: { associations: item.deleteAssociations }, message: "" };
}

export async function searchClasses(query: string): Promise<ClassListItem[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) return getClasses();

  const classes = await db.schoolClass.findMany({
    where: {
      OR: [
        { name: { contains: normalizedQuery } },
        { level: { contains: normalizedQuery } },
        { schoolStage: { contains: normalizedQuery } },
        { gradeLevel: { contains: normalizedQuery } },
        { studyTrack: { contains: normalizedQuery } },
        { description: { contains: normalizedQuery } },
      ],
    },
    orderBy: [{ schoolStage: "asc" }, { gradeLevel: "asc" }, { studyTrack: "asc" }, { name: "asc" }],
    include: classListInclude,
  });

  return classes.map(toClassListItem);
}

export async function getClassesCount(): Promise<{ total: number; active: number; inactive: number; sections: number }> {
  const [total, active, sections] = await Promise.all([
    db.schoolClass.count(),
    db.schoolClass.count({ where: { isActive: true } }),
    db.section.count(),
  ]);

  return { total, active, inactive: Math.max(total - active, 0), sections };
}

export async function hasClasses(): Promise<boolean> {
  const count = await db.schoolClass.count();
  return count > 0;
}

export async function getSections(): Promise<SectionListItem[]> {
  const sections = await db.section.findMany({
    orderBy: [{ classId: "asc" }, { name: "asc" }],
    include: sectionListInclude,
  });

  return sections
    .map((section: any) => toSectionListItem(section))
    .sort((a, b) => {
      const classCompare = a.className.localeCompare(b.className, "ar");
      return classCompare !== 0 ? classCompare : a.name.localeCompare(b.name, "ar");
    });
}

export async function getOrCreateDefaultSectionForClass(classId: string): Promise<ClassServiceResult<Section>> {
  const normalizedClassId = classId.trim();

  if (!normalizedClassId) {
    return { ok: false, message: "يجب اختيار الصف." };
  }

  if (!isDatabaseStorageEnabled()) {
    return { ok: false, message: getDatabaseUnavailableMessage() };
  }

  const schoolClass = await getClassById(normalizedClassId);
  if (!schoolClass) {
    return { ok: false, message: "لم يتم العثور على الصف المحدد." };
  }

  const existingSection = await db.section.findFirst({
    where: { classId: normalizedClassId },
    orderBy: { name: "asc" },
  });

  if (existingSection) {
    return { ok: true, data: existingSection, message: "تم اختيار شعبة موجودة داخل الصف." };
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

    return { ok: true, data: section, message: "تم إنشاء شعبة عامة للصف." };
  } catch (error) {
    const fallbackSection = await db.section.findFirst({
      where: { classId: normalizedClassId },
      orderBy: { name: "asc" },
    });

    if (fallbackSection) {
      return { ok: true, data: fallbackSection, message: "تم اختيار شعبة موجودة داخل الصف." };
    }

    console.error("[getOrCreateDefaultSectionForClass] Error:", error);
    return { ok: false, message: "تعذر تجهيز شعبة داخل الصف المحدد." };
  }
}

export async function getSectionsByClassId(classId: string): Promise<SectionListItem[]> {
  const sections = await db.section.findMany({
    where: { classId },
    orderBy: { name: "asc" },
    include: sectionListInclude,
  });

  return sections.map((section: any) => toSectionListItem(section));
}

export async function getActiveSectionsByClassId(classId: string): Promise<Section[]> {
  return db.section.findMany({ where: { classId, isActive: true }, orderBy: { name: "asc" } });
}

export async function getSectionById(id: string): Promise<Section | null> {
  return db.section.findUnique({ where: { id } });
}

export async function createSection(input: SectionFormInput): Promise<ClassServiceResult<Section>> {
  const validation = validateSectionInput(input);

  if (!validation.valid) {
    return {
      ok: false,
      message: (Object.values(validation.errors).find(Boolean) as string) || "توجد بيانات ناقصة أو غير صحيحة.",
      errors: validation.errors as Record<string, string>,
    };
  }

  if (!isDatabaseStorageEnabled()) {
    return { ok: false, message: getDatabaseUnavailableMessage() };
  }

  const data = normalizeSectionInput(input);
  const schoolClass = await getClassById(data.classId);

  if (!schoolClass) {
    return { ok: false, message: "لم يتم العثور على الصف المرتبط بهذه الشعبة." };
  }

  try {
    const section = await db.section.create({
      data: {
        name: data.name,
        capacity: data.capacity === undefined ? null : Number(data.capacity),
        description: data.description ?? null,
        isActive: true,
        classId: data.classId,
      },
    });

    return { ok: true, data: section, message: "تمت إضافة الشعبة بنجاح." };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "هذه الشعبة موجودة مسبقًا داخل نفس الصف.",
        errors: { name: "اسم الشعبة مستخدم مسبقًا داخل هذا الصف." },
      };
    }

    return { ok: false, message: "حدث خطأ أثناء إضافة الشعبة." };
  }
}

export async function updateSection(id: string, input: SectionFormInput): Promise<ClassServiceResult<Section>> {
  const validation = validateSectionInput(input);

  if (!validation.valid) {
    return {
      ok: false,
      message: (Object.values(validation.errors).find(Boolean) as string) || "توجد بيانات ناقصة أو غير صحيحة.",
      errors: validation.errors as Record<string, string>,
    };
  }

  if (!isDatabaseStorageEnabled()) {
    return { ok: false, message: getDatabaseUnavailableMessage() };
  }

  const existingSection = await getSectionById(id);
  if (!existingSection) {
    return { ok: false, message: "لم يتم العثور على الشعبة." };
  }

  const data = normalizeSectionInput(input);

  try {
    const section = await db.section.update({
      where: { id },
      data: {
        name: data.name,
        capacity: data.capacity === undefined ? null : Number(data.capacity),
        description: data.description ?? null,
        isActive: true,
        classId: data.classId,
      },
    });

    return { ok: true, data: section, message: "تم تحديث بيانات الشعبة بنجاح." };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "توجد شعبة أخرى بنفس الاسم داخل هذا الصف.",
        errors: { name: "اسم الشعبة مستخدم مسبقًا داخل هذا الصف." },
      };
    }

    return { ok: false, message: "حدث خطأ أثناء تحديث الشعبة." };
  }
}

export async function deleteSection(id: string): Promise<ClassServiceResult<null>> {
  const section = await db.section.findUnique({ where: { id } });

  if (!section) {
    return { ok: false, message: "لم يتم العثور على الشعبة." };
  }

  try {
    const students = await db.student.findMany({ where: { sectionId: id }, select: { id: true } });
    const studentIds = students.map((s: any) => s.id);

    if (studentIds.length > 0) {
      await db.grade.deleteMany({ where: { studentId: { in: studentIds } } });
      await db.attendanceRecord.deleteMany({ where: { studentId: { in: studentIds } } });
      await db.payment.deleteMany({ where: { studentId: { in: studentIds } } });
    }

    await db.schedule.deleteMany({ where: { sectionId: id } });
    await db.exam.deleteMany({ where: { sectionId: id } });
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
): Promise<ClassServiceResult<{ associations: { label: string; count: number; details?: string[] }[] }>> {
  const section = await db.section.findUnique({ where: { id }, include: sectionListInclude });

  if (!section) {
    return { ok: false, message: "لم يتم العثور على الشعبة." };
  }

  const item = toSectionListItem(section);
  return { ok: true, data: { associations: item.deleteAssociations }, message: "" };
}

function subjectMatchesClass(subject: any, schoolClass: SchoolClass | null): boolean {
  if (!schoolClass) return false;

  if (schoolClass.schoolStage && subject.schoolStage && schoolClass.schoolStage !== subject.schoolStage) {
    return false;
  }

  if (schoolClass.gradeLevel && subject.gradeLevel && schoolClass.gradeLevel !== subject.gradeLevel) {
    return false;
  }

  if (schoolClass.studyTrack && subject.studyTrack && schoolClass.studyTrack !== subject.studyTrack) {
    return false;
  }

  return true;
}

export function filterSubjectsForClass<T extends { schoolStage?: string | null; gradeLevel?: string | null; studyTrack?: string | null }>(
  subjects: T[],
  schoolClass: Pick<SchoolClass, "schoolStage" | "gradeLevel" | "studyTrack"> | null,
): T[] {
  if (!schoolClass?.schoolStage && !schoolClass?.gradeLevel && !schoolClass?.studyTrack) {
    return subjects;
  }

  return subjects.filter((subject) => subjectMatchesClass(subject, schoolClass as SchoolClass));
}

export async function assignSubjectsToClass(classId: string, subjectIds: string[]) {
  const uniqueSubjectIds = Array.from(new Set(subjectIds.filter(Boolean)));
  const schoolClass = await db.schoolClass.findUnique({ where: { id: classId } });

  if (!schoolClass) {
    return { ok: false as const, message: "لم يتم العثور على الصف." };
  }

  const validSubjects = await db.subject.findMany({
    where: { id: { in: uniqueSubjectIds } },
  });
  const matchingSubjects = filterSubjectsForClass(validSubjects, toSchoolClass(schoolClass));

  await db.$transaction(async (tx: any) => {
    await tx.classSubject.deleteMany({ where: { classId } });

    if (matchingSubjects.length > 0) {
      await tx.classSubject.createMany({
        data: matchingSubjects.map((subject: any) => ({ classId, subjectId: subject.id })),
      });
    }
  });

  return { ok: true as const, message: "تم تحديث مواد الصف بنجاح." };
}

export async function getClassSubjectIds(classId: string) {
  const rows = await db.classSubject.findMany({ where: { classId }, select: { subjectId: true } });
  return rows.map((row: any) => row.subjectId);
}

export function getClassGradeReadableLabel(schoolClass: Pick<SchoolClass, "schoolStage" | "gradeLevel">): string {
  return getClassGradeLabel(schoolClass.schoolStage, schoolClass.gradeLevel);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") ||
    ((error as any)?.code === "P2002")
  );
}
