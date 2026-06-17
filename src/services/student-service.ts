import { Prisma } from "@/lib/prisma-types";
import { db } from "@/lib/db";
import { getDatabaseUnavailableMessage, isDatabaseStorageEnabled } from "@/lib/storage-mode";
import {
  getStudentDeleteAssociations,
  normalizeStudentInput,
  parseOptionalDate,
  validateStudentInput,
  type Student,
  type StudentDetails,
  type StudentFormInput,
  type StudentListItem,
  type StudentsFilter,
} from "@/types/student";

const STUDENT_CODE_PREFIX = "MarSch-";

async function generateNextStudentCode(): Promise<string> {
  const lastStudent = await db.student.findFirst({
    where: {
      studentCode: {
        startsWith: STUDENT_CODE_PREFIX,
      },
    },
    orderBy: {
      studentCode: "desc",
    },
    select: {
      studentCode: true,
    },
  });

  const lastNumber = lastStudent?.studentCode
    ? Number(lastStudent.studentCode.replace(STUDENT_CODE_PREFIX, ""))
    : 0;

  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;

  return `${STUDENT_CODE_PREFIX}${String(nextNumber).padStart(4, "0")}`;
}

export type StudentServiceResult<T> = {
  ok: boolean;
  data?: T;
  message: string;
  errors?: Record<string, string>;
};

export async function getStudents(
  filter: StudentsFilter = {},
): Promise<StudentListItem[]> {
  const where = buildStudentWhere(filter);

  // Handle classId filter by pre-fetching sectionIds for that class
  if (filter.classId) {
    const sections = await db.section.findMany({
      where: { classId: filter.classId },
      select: { id: true },
    });
    const sectionIds = sections.map((s: any) => s.id);
    where.sectionId = { in: sectionIds };
  }

  const students = await db.student.findMany({
    where,
    orderBy: [
      {
        status: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
    include: {
      section: {
        include: {
          class: true,
        },
      },
      grades: {
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { subject: true, exam: true },
      },
      attendanceRecords: {
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { schedule: { include: { subject: true, teacher: true } } },
      },
      payments: {
        take: 6,
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          grades: true,
          attendanceRecords: true,
          payments: true,
        },
      },
    },
  });

  return students.map((student) => toStudentListItem(student));
}

export async function searchStudents(
  query: string,
): Promise<StudentListItem[]> {
  return getStudents({
    query,
  });
}

export async function getStudentById(id: string): Promise<Student | null> {
  return db.student.findUnique({
    where: {
      id,
    },
  });
}

export async function getStudentDetails(
  id: string,
): Promise<StudentDetails | null> {
  const student = await db.student.findUnique({
    where: {
      id,
    },
    include: {
      section: {
        include: {
          class: true,
        },
      },
      _count: {
        select: {
          grades: true,
          attendanceRecords: true,
          payments: true,
        },
      },
    },
  });

  if (!student) {
    return null;
  }

  return {
    id: student.id,
    fullName: student.fullName,
    studentCode: student.studentCode,
    gender: student.gender,
    birthDate: student.birthDate,
    phone: student.phone,
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    address: student.address,
    enrollmentDate: student.enrollmentDate,
    status: student.status,
    notes: student.notes,
    sectionId: student.sectionId,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
    sectionName: student.section?.name ?? null,
    classId: student.section?.classId ?? null,
    className: student.section?.class.name ?? null,
    classLevel: student.section?.class.level ?? null,
    gradesCount: student._count.grades,
    attendanceCount: student._count.attendanceRecords,
    feesCount: student._count.payments,
  };
}

async function findDuplicateStudentPhone(input: StudentFormInput, excludeId?: string) {
  const data = normalizeStudentInput(input);
  const checks = [
    { field: "phone" as const, value: data.phone, label: "رقم هاتف الطالب" },
    { field: "guardianPhone" as const, value: data.guardianPhone, label: "رقم هاتف ولي الأمر" },
  ].filter((item) => Boolean(item.value));

  for (const check of checks) {
    const duplicate = await db.student.findFirst({
      where: {
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: [
          { phone: check.value },
          { guardianPhone: check.value },
        ],
      },
      select: { id: true, fullName: true },
    });

    if (duplicate) {
      return {
        field: check.field,
        message: `${check.label} مستخدم مسبقًا لطالب آخر.`,
      };
    }
  }

  return null;
}

export async function createStudent(
  input: StudentFormInput,
): Promise<StudentServiceResult<Student>> {
  const validation = validateStudentInput(input);

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

  const data = normalizeStudentInput(input);

  const sectionCheck = await validateSectionIfProvided(data.sectionId);

  if (!sectionCheck.ok) {
    return {
      ok: false,
      message: sectionCheck.message,
      errors: {
        sectionId: sectionCheck.message,
      },
    };
  }

  const duplicatePhone = await findDuplicateStudentPhone(data);
  if (duplicatePhone) {
    return {
      ok: false,
      message: duplicatePhone.message,
      errors: { [duplicatePhone.field]: duplicatePhone.message },
    };
  }

  try {
    let studentCode = await generateNextStudentCode();
    let student;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        student = await db.student.create({
          data: {
            fullName: data.fullName,
            studentCode,
            gender: "female",
            birthDate: parseOptionalDate(data.birthDate) ?? null,
            phone: data.phone ?? null,
            guardianName: null,
            guardianPhone: data.guardianPhone ?? null,
            address: null,
            enrollmentDate: new Date(),
            status: "active",
            notes: null,
            sectionId: data.sectionId || null,
          },
        });
        break;
      } catch (error) {
        if (isUniqueConstraintError(error) && attempt < 2) {
          studentCode = await generateNextStudentCode();
          continue;
        }
        if (isUniqueConstraintError(error)) {
          return {
            ok: false,
            message: "رقم الطالب مستخدم مسبقًا.",
            errors: { studentCode: "رقم الطالب مستخدم مسبقًا." },
          };
        }
        return {
          ok: false,
          message: "حدث خطأ أثناء إضافة الطالب.",
        };
      }
    }

    return {
      ok: true,
      data: student!,
      message: "تمت إضافة الطالب بنجاح.",
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "رقم الطالب مستخدم مسبقًا.",
        errors: {
          studentCode: "رقم الطالب مستخدم مسبقًا.",
        },
      };
    }

    return {
      ok: false,
      message: "حدث خطأ أثناء إضافة الطالب.",
    };
  }
}

export async function updateStudent(
  id: string,
  input: StudentFormInput,
): Promise<StudentServiceResult<Student>> {
  const validation = validateStudentInput(input);

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

  const existingStudent = await getStudentById(id);

  if (!existingStudent) {
    return {
      ok: false,
      message: "لم يتم العثور على الطالب.",
    };
  }

  const data = normalizeStudentInput(input);

  const sectionCheck = await validateSectionIfProvided(data.sectionId);

  if (!sectionCheck.ok) {
    return {
      ok: false,
      message: sectionCheck.message,
      errors: {
        sectionId: sectionCheck.message,
      },
    };
  }

  const duplicatePhone = await findDuplicateStudentPhone(data, id);
  if (duplicatePhone) {
    return {
      ok: false,
      message: duplicatePhone.message,
      errors: { [duplicatePhone.field]: duplicatePhone.message },
    };
  }

  try {
    const student = await db.student.update({
      where: {
        id,
      },
      data: {
        fullName: data.fullName,
        birthDate: parseOptionalDate(data.birthDate) ?? null,
        phone: data.phone ?? null,
        guardianPhone: data.guardianPhone ?? null,
        sectionId: data.sectionId || null,
      },
    });

    return {
      ok: true,
      data: student,
      message: "تم تحديث بيانات الطالب بنجاح.",
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "رقم الطالب مستخدم مسبقًا.",
        errors: {
          studentCode: "رقم الطالب مستخدم مسبقًا.",
        },
      };
    }

    return {
      ok: false,
      message: "حدث خطأ أثناء تحديث بيانات الطالب.",
    };
  }
}

export async function deleteStudent(
  id: string,
): Promise<StudentServiceResult<null>> {
  const student = await db.student.findUnique({
    where: {
      id,
    },
    include: {
      grades: { take: 10, orderBy: { createdAt: "desc" }, include: { subject: true, exam: true } },
      attendanceRecords: { take: 10, orderBy: { createdAt: "desc" }, include: { schedule: { include: { subject: true } } } },
      payments: { take: 10, orderBy: { createdAt: "desc" } },
      _count: {
        select: {
          grades: true,
          attendanceRecords: true,
          payments: true,
        },
      },
    },
  });

  if (!student) {
    return {
      ok: false,
      message: "لم يتم العثور على الطالب.",
    };
  }

  try {
    // Cascade delete: grades → attendance → payments → student
    await db.grade.deleteMany({ where: { studentId: id } });
    await db.attendanceRecord.deleteMany({ where: { studentId: id } });
    await db.payment.deleteMany({ where: { studentId: id } });
    await db.student.delete({ where: { id } });
  } catch (error) {
    console.error("[deleteStudent] Error:", error);
    return {
      ok: false,
      message: "حدث خطأ أثناء حذف الطالب. حاول مرة أخرى.",
    };
  }

  return {
    ok: true,
    data: null,
    message: "تم حذف الطالب وجميع البيانات المرتبطة به بنجاح.",
  };
}

export async function getStudentDeleteInfo(
  id: string,
): Promise<StudentServiceResult<{ associations: { label: string; count: number; details?: string[] }[] }>> {
  const student = await db.student.findUnique({
    where: { id },
    include: {
      grades: { take: 10, orderBy: { createdAt: "desc" }, include: { subject: true, exam: true } },
      attendanceRecords: { take: 10, orderBy: { createdAt: "desc" }, include: { schedule: { include: { subject: true } } } },
      payments: { take: 10, orderBy: { createdAt: "desc" } },
      _count: {
        select: {
          grades: true,
          attendanceRecords: true,
          payments: true,
        },
      },
    },
  });

  if (!student) {
    return { ok: false, message: "لم يتم العثور على الطالب." };
  }

  const check = getStudentDeleteAssociations({
    gradesCount: student._count.grades,
    attendanceCount: student._count.attendanceRecords,
    feesCount: student._count.payments,
    gradeDetails: (student.grades ?? []).map((grade: any) => {
      const subjectName = grade.subject?.name ?? "مادة غير محددة";
      const examTitle = grade.exam?.title ? ` / ${grade.exam.title}` : "";
      return `${subjectName}${examTitle}: ${Number(grade.score ?? 0)} من ${Number(grade.maxScore ?? 0)}`;
    }),
    attendanceDetails: (student.attendanceRecords ?? []).map((record: any) => {
      const dateLabel = record.date ? new Date(record.date).toLocaleDateString("ar-IQ-u-nu-latn") : "تاريخ غير محدد";
      const subjectName = record.schedule?.subject?.name ? ` / ${record.schedule.subject.name}` : "";
      return `${dateLabel}${subjectName}: ${record.status}`;
    }),
    feeDetails: (student.payments ?? []).map((payment: any) => {
      const dateLabel = payment.createdAt ? new Date(payment.createdAt).toLocaleDateString("ar-IQ-u-nu-latn") : "تاريخ غير محدد";
      return `${payment.feeTitle ?? "قسط"}: ${Number(payment.amount ?? 0).toLocaleString("ar-IQ-u-nu-latn")} د.ع / ${dateLabel}`;
    }),
  });

  return { ok: true, data: { associations: check.associations }, message: "" };
}

export async function updateStudentStatus(
  id: string,
  status: string,
): Promise<StudentServiceResult<Student>> {
  if (!["active", "inactive", "graduated", "transferred"].includes(status)) {
    return {
      ok: false,
      message: "حالة الطالب غير صحيحة.",
    };
  }

  const student = await getStudentById(id);

  if (!student) {
    return {
      ok: false,
      message: "لم يتم العثور على الطالب.",
    };
  }

  const updatedStudent = await db.student.update({
    where: {
      id,
    },
    data: {
      status,
    },
  });

  return {
    ok: true,
    data: updatedStudent,
    message: "تم تحديث حالة الطالب بنجاح.",
  };
}

export async function moveStudentToSection(
  studentId: string,
  sectionId: string | null,
): Promise<StudentServiceResult<Student>> {
  const student = await getStudentById(studentId);

  if (!student) {
    return {
      ok: false,
      message: "لم يتم العثور على الطالب.",
    };
  }

  const sectionCheck = await validateSectionIfProvided(sectionId ?? undefined);

  if (!sectionCheck.ok) {
    return {
      ok: false,
      message: sectionCheck.message,
    };
  }

  const updatedStudent = await db.student.update({
    where: {
      id: studentId,
    },
    data: {
      sectionId,
    },
  });

  return {
    ok: true,
    data: updatedStudent,
    message: sectionId
      ? "تم نقل الطالب إلى الشعبة المحددة."
      : "تم إزالة ارتباط الطالب بالشعبة.",
  };
}

export async function getStudentsCount(): Promise<{
  total: number;
  active: number;
  inactive: number;
  graduated: number;
  transferred: number;
  withoutSection: number;
}> {
  const [total, active, inactive, graduated, transferred, withoutSection] =
    await Promise.all([
      db.student.count(),
      db.student.count({
        where: {
          status: "active",
        },
      }),
      db.student.count({
        where: {
          status: "inactive",
        },
      }),
      db.student.count({
        where: {
          status: "graduated",
        },
      }),
      db.student.count({
        where: {
          status: "transferred",
        },
      }),
      db.student.count({
        where: {
          sectionId: null,
        },
      }),
    ]);

  return {
    total,
    active,
    inactive,
    graduated,
    transferred,
    withoutSection,
  };
}

export async function getStudentsBySectionId(
  sectionId: string,
): Promise<StudentListItem[]> {
  return getStudents({
    sectionId,
  });
}

export async function getActiveStudentsBySectionId(
  sectionId: string,
): Promise<Student[]> {
  return db.student.findMany({
    where: {
      sectionId,
      status: "active",
    },
    orderBy: {
      fullName: "asc",
    },
  });
}

export async function getActiveStudents(): Promise<Student[]> {
  return db.student.findMany({
    where: {
      status: "active",
    },
    orderBy: {
      fullName: "asc",
    },
  });
}

export async function hasStudents(): Promise<boolean> {
  const count = await db.student.count();
  return count > 0;
}

function buildStudentWhere(filter: StudentsFilter): Prisma.StudentWhereInput {
  const query = filter.query?.trim();

  const where: Prisma.StudentWhereInput = {};

  if (query) {
    where.OR = [
      {
        fullName: {
          contains: query,
        },
      },
      {
        studentCode: {
          contains: query,
        },
      },
      {
        phone: {
          contains: query,
        },
      },
      {
        guardianName: {
          contains: query,
        },
      },
      {
        guardianPhone: {
          contains: query,
        },
      },
    ];
  }

  if (filter.sectionId) {
    where.sectionId = filter.sectionId;
  }

  // Note: classId filter handled in getStudents() via pre-fetching sectionIds

  if (filter.status) {
    where.status = filter.status;
  }

  return where;
}

async function validateSectionIfProvided(
  sectionId?: string,
): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!sectionId) {
    return {
      ok: true,
      message: "لا توجد شعبة محددة.",
    };
  }

  const section = await db.section.findUnique({
    where: {
      id: sectionId,
    },
    include: {
      class: true,
    },
  });

  if (!section) {
    return {
      ok: false,
      message: "الشعبة المحددة غير موجودة.",
    };
  }

  return {
    ok: true,
    message: "الشعبة صالحة.",
  };
}

type StudentWithRelations = Prisma.StudentGetPayload<{
  include: {
    section: {
      include: {
        class: true;
      };
    };
    grades: {
      include: {
        subject: true;
        exam: true;
      };
    };
    attendanceRecords: {
      include: {
        schedule: {
          include: {
            subject: true;
            teacher: true;
          };
        };
      };
    };
    payments: true;
    _count: {
      select: {
        grades: true;
        attendanceRecords: true;
        payments: true;
      };
    };
  };
}>;

function toStudentListItem(student: StudentWithRelations): StudentListItem {
  return {
    id: student.id,
    fullName: student.fullName,
    studentCode: student.studentCode,
    gender: student.gender,
    birthDate: student.birthDate,
    phone: student.phone,
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    status: student.status,
    sectionId: student.sectionId,
    sectionName: student.section?.name ?? null,
    classId: student.section?.classId ?? null,
    className: student.section?.class.name ?? null,
    classLevel: student.section?.class.level ?? null,
    gradesCount: student._count.grades,
    attendanceCount: student._count.attendanceRecords,
    feesCount: student._count.payments,
    gradeDetails: (student.grades ?? []).map((grade: any) => {
      const subjectName = grade.subject?.name ?? "مادة غير محددة";
      const examTitle = grade.exam?.title ? ` / ${grade.exam.title}` : "";
      return `${subjectName}${examTitle}: ${Number(grade.score ?? 0)} من ${Number(grade.maxScore ?? 0)}`;
    }),
    attendanceDetails: (student.attendanceRecords ?? []).map((record: any) => {
      const dateLabel = record.date ? new Date(record.date).toLocaleDateString("ar-IQ-u-nu-latn") : "تاريخ غير محدد";
      const subjectName = record.schedule?.subject?.name ? ` / ${record.schedule.subject.name}` : "";
      return `${dateLabel}${subjectName}: ${record.status}`;
    }),
    feeDetails: (student.payments ?? []).map((payment: any) => {
      const dateLabel = payment.createdAt ? new Date(payment.createdAt).toLocaleDateString("ar-IQ-u-nu-latn") : "تاريخ غير محدد";
      return `${payment.feeTitle ?? "قسط"}: ${Number(payment.amount ?? 0).toLocaleString("ar-IQ-u-nu-latn")} د.ع / ${dateLabel}`;
    }),
    enrollmentDate: student.enrollmentDate,
    createdAt: student.createdAt,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002") ||
    ((error as any)?.code === "P2002")
  );
}
