import { db } from "@/lib/db";
import { getDatabaseUnavailableMessage, isDatabaseStorageEnabled } from "@/lib/storage-mode";
import { Prisma } from "@/lib/prisma-types";

export type ExamServiceResult<T> = {
  ok: boolean;
  data?: T;
  message: string;
  errors?: Record<string, string>;
};

export async function createExam(input: {
  name: string;
  type: string;
  date?: string | Date;
  maxScore?: number;
  passScore?: number;
  failScore?: number;
  notes?: string;
  subjectId: string;
  sectionId: string;
  teacherId: string;
}): Promise<ExamServiceResult<Prisma.ExamGetPayload<{ include: { subject: true; teacher: true; section: { include: { class: true } } } }>>> {
  if (!isDatabaseStorageEnabled()) {
    return {
      ok: false,
      message: getDatabaseUnavailableMessage(),
    };
  }

  // Validate subject exists
  const subject = await db.subject.findUnique({ where: { id: input.subjectId } });
  if (!subject) return { ok: false, message: "المادة غير موجودة." };

  // Validate section exists
  const section = await db.section.findUnique({ where: { id: input.sectionId } });
  if (!section) return { ok: false, message: "الشعبة غير موجودة." };

  if (!input.teacherId) return { ok: false, message: "يجب اختيار مدرس للامتحان." };

  const teacher = await db.teacher.findUnique({ where: { id: input.teacherId } });
  if (!teacher) return { ok: false, message: "المدرس غير موجود." };

  const teacherSubject = await db.teacherSubject.findFirst({
    where: { teacherId: input.teacherId, subjectId: input.subjectId },
  });
  if (!teacherSubject) return { ok: false, message: "هذا المدرس غير مرتبط بمادة الامتحان." };

  const teacherSection = await db.teacherSection.findFirst({
    where: { teacherId: input.teacherId, sectionId: input.sectionId },
  });
  if (!teacherSection) return { ok: false, message: "هذا المدرس غير مرتبط بشعبة الامتحان." };

  try {
    const exam = await db.exam.create({
      data: {
        name: input.name.trim(),
        type: input.type,
        date: input.date ? new Date(input.date) : new Date(),
        maxScore: input.maxScore ?? 100,
        passScore: input.passScore ?? 50,
        failScore: input.failScore,
        notes: input.notes?.trim() || null,
        subjectId: input.subjectId,
        sectionId: input.sectionId,
        teacherId: input.teacherId,
      },
      include: {
        subject: true,
        teacher: true,
        section: { include: { class: true } },
      },
    });
    return { ok: true, data: exam, message: "تم إنشاء الامتحان بنجاح." };
  } catch {
    return { ok: false, message: "حدث خطأ أثناء إنشاء الامتحان." };
  }
}

export async function saveExamGrades(
  examId: string,
  grades: { studentId: string; score: number; notes?: string }[],
): Promise<ExamServiceResult<{ created: number; updated: number }>> {
  // Get exam with passScore
  const exam = await db.exam.findUnique({ where: { id: examId } });
  if (!exam) return { ok: false, message: "الامتحان غير موجود." };

  let created = 0;
  let updated = 0;

  for (const grade of grades) {
    if (!Number.isFinite(grade.score) || grade.score < 0 || grade.score > exam.maxScore) {
      return { ok: false, message: "توجد درجة غير صحيحة أو أكبر من الدرجة الكلية." };
    }

    const existing = await db.grade.findFirst({
      where: { examId, studentId: grade.studentId },
    });

    if (existing) {
      await db.grade.update({
        where: { id: existing.id },
        data: {
          score: grade.score,
          maxScore: exam.maxScore,
          notes: grade.notes?.trim() || null,
        },
      });
      updated++;
    } else {
      await db.grade.create({
        data: {
          title: exam.name,
          score: grade.score,
          maxScore: exam.maxScore,
          examType: exam.type,
          subjectId: exam.subjectId,
          teacherId: (exam as any).teacherId ?? null,
          term: exam.type === "midyear" ? "first" : exam.type === "final" ? "annual" : "first",
          date: exam.date ?? new Date(),
          studentId: grade.studentId,
          examId: examId,
          notes: grade.notes?.trim() || null,
        },
      });
      created++;
    }
  }

  return {
    ok: true,
    data: { created, updated },
    message: `تم حفظ الدرجات: ${created} جديد، ${updated} محدّث.`,
  };
}

export async function getExams(filter?: { subjectId?: string; sectionId?: string; teacherId?: string; type?: string }) {
  const where: Prisma.ExamWhereInput = {};
  if (filter?.subjectId) where.subjectId = filter.subjectId;
  if (filter?.sectionId) where.sectionId = filter.sectionId;
  if (filter?.teacherId) (where as any).teacherId = filter.teacherId;
  if (filter?.type) where.type = filter.type;

  return db.exam.findMany({
    where,
    include: {
      subject: true,
      teacher: true,
      section: { include: { class: true } },
      _count: { select: { grades: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getExamById(id: string) {
  return db.exam.findUnique({
    where: { id },
    include: {
      subject: true,
      teacher: true,
      section: {
        include: {
          class: true,
          students: {
            where: { status: "active" },
            orderBy: { fullName: "asc" },
          },
        },
      },
      grades: { include: { student: true } },
    },
  });
}

export async function deleteExam(id: string): Promise<ExamServiceResult<null>> {
  const exam = await db.exam.findUnique({ where: { id } });
  if (!exam) return { ok: false, message: "الامتحان غير موجود." };

  await db.grade.deleteMany({ where: { examId: id } });
  await db.exam.delete({ where: { id } });
  return { ok: true, data: null, message: "تم حذف الامتحان ودرجاته." };
}
