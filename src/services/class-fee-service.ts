import { db } from "@/lib/db";
import { Prisma } from "@/lib/prisma-types";
import { getCurrentAcademicYear } from "@/types/payment";

export type ClassFeeSettingInput = {
  classId: string;
  tuitionAmount: number;
  uniformAmount: number;
  academicYear?: string;
  notes?: string;
};

export type StudentFeePlan = {
  studentId: string;
  studentName: string;
  classId: string | null;
  className: string | null;
  classLevel: string | null;
  sectionName: string | null;
  academicYear: string;
  tuitionAmount: number;
  uniformAmount: number;
  tuitionPaid: number;
  tuitionDiscount: number;
  tuitionRemaining: number;
  uniformPaid: boolean;
  uniformPaidAmount: number;
  feeSettingId: string | null;
};

function readUniformAmount(setting: any): number {
  return Number(setting?.uniformAmount ?? setting?.uniform_amount ?? 0) || 0;
}

function normalizeYear(academicYear?: string | null) {
  return academicYear?.trim() || getCurrentAcademicYear();
}

export async function getClassFeeSettings(academicYear?: string) {
  const year = academicYear?.trim();
  const where: Prisma.ClassFeeSettingWhereInput = {};
  if (year) where.academicYear = year;

  return db.classFeeSetting.findMany({
    where,
    include: { class: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClassFeeSetting(classId: string, academicYear?: string) {
  const year = normalizeYear(academicYear);

  return db.classFeeSetting.findFirst({
    where: { classId, academicYear: year },
  });
}

export async function upsertClassFeeSetting(input: ClassFeeSettingInput) {
  const academicYear = normalizeYear(input.academicYear);
  const tuitionAmount = Math.max(0, Number(input.tuitionAmount) || 0);
  const uniformAmount = Math.max(0, Number(input.uniformAmount) || 0);

  const existing = await db.classFeeSetting.findFirst({
    where: { classId: input.classId, academicYear },
  });

  const data = {
    classId: input.classId,
    tuitionAmount,
    uniformAmount,
    academicYear,
    notes: input.notes?.trim() || null,
  };

  if (existing) {
    return db.classFeeSetting.update({
      where: { id: existing.id },
      data,
    });
  }

  return db.classFeeSetting.create({ data });
}

export async function getStudentFeePlans(
  academicYear?: string,
): Promise<StudentFeePlan[]> {
  const year = normalizeYear(academicYear);

  const [students, settings, payments] = await Promise.all([
    db.student.findMany({
      where: { status: "active" },
      orderBy: { fullName: "asc" },
      include: { section: { include: { class: true } } },
    }),
    db.classFeeSetting.findMany({ where: { academicYear: year } }),
    db.payment.findMany({
      where: {
        academicYear: year,
        status: { in: ["paid", "partial"] },
      },
      select: {
        studentId: true,
        feeType: true,
        amount: true,
        discountAmount: true,
        status: true,
      },
    }),
  ]);

  const settingByClassId = new Map<string, any>();
  for (const setting of settings) {
    settingByClassId.set(setting.classId, setting);
  }

  const paymentsByStudent = new Map<string, any[]>();
  for (const payment of payments) {
    const list = paymentsByStudent.get(payment.studentId) ?? [];
    list.push(payment);
    paymentsByStudent.set(payment.studentId, list);
  }

  return students.map((student: any) => {
    const classId = student.section?.classId ?? null;
    const setting = classId ? settingByClassId.get(classId) : null;
    const studentPayments = paymentsByStudent.get(student.id) ?? [];
    const tuitionPayments = studentPayments.filter((p) => p.feeType === "tuition");
    const uniformPayments = studentPayments.filter((p) => p.feeType === "uniform");

    const tuitionPaid = tuitionPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const tuitionDiscount = tuitionPayments.reduce((sum, p) => sum + Number(p.discountAmount || 0), 0);
    const tuitionAmount = Number(setting?.tuitionAmount ?? setting?.amount ?? 0) || 0;
    const uniformAmount = readUniformAmount(setting);
    const uniformPaidAmount = uniformPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return {
      studentId: student.id,
      studentName: student.fullName,
      classId,
      className: student.section?.class?.name ?? null,
      classLevel: student.section?.class?.level ?? null,
      sectionName: student.section?.name ?? null,
      academicYear: year,
      tuitionAmount,
      uniformAmount,
      tuitionPaid,
      tuitionDiscount,
      tuitionRemaining: Math.max(0, tuitionAmount - tuitionDiscount - tuitionPaid),
      uniformPaid: uniformPayments.some((p) => Number(p.amount || 0) > 0) || (uniformAmount > 0 && uniformPaidAmount >= uniformAmount),
      uniformPaidAmount,
      feeSettingId: setting?.id ?? null,
    };
  });
}

export async function getStudentFeePlan(
  studentId: string,
  academicYear?: string,
): Promise<
  | { ok: false; message: string }
  | {
      ok: true;
      data: StudentFeePlan & {
        fullAmount: number;
        totalDiscount: number;
        totalPaid: number;
        remaining: number;
      };
    }
> {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { section: { include: { class: true } } },
  });

  if (!student || !student.section) {
    return { ok: false, message: "الطالب غير موجود أو غير مرتبط بشعبة." };
  }

  const year = normalizeYear(academicYear);
  const feeSetting = await getClassFeeSetting(student.section.classId, year);

  if (!feeSetting) {
    return { ok: false, message: "لم يتم تحديد رسوم لهذا الصف بعد." };
  }

  const payments = await db.payment.findMany({
    where: {
      studentId,
      academicYear: year,
      status: { in: ["paid", "partial"] },
    },
  });

  const tuitionPayments = payments.filter((payment) => payment.feeType === "tuition");
  const uniformPayments = payments.filter((payment) => payment.feeType === "uniform");
  const totalPaid = tuitionPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalDiscount = tuitionPayments.reduce((sum, p) => sum + (p.discountAmount || 0), 0);
  const fullAmount = Number(feeSetting.tuitionAmount ?? (feeSetting as any).amount ?? 0) || 0;
  const remaining = Math.max(0, fullAmount - totalDiscount - totalPaid);
  const uniformAmount = readUniformAmount(feeSetting);
  const uniformPaidAmount = uniformPayments.reduce((sum, p) => sum + p.amount, 0);

  return {
    ok: true,
    data: {
      studentId: student.id,
      studentName: student.fullName,
      classId: student.section.classId,
      className: student.section.class?.name ?? null,
      classLevel: student.section.class?.level ?? null,
      sectionName: student.section.name,
      academicYear: year,
      tuitionAmount: fullAmount,
      uniformAmount,
      tuitionPaid: totalPaid,
      tuitionDiscount: totalDiscount,
      tuitionRemaining: remaining,
      uniformPaid: uniformPayments.some((p) => p.amount > 0) || (uniformAmount > 0 && uniformPaidAmount >= uniformAmount),
      uniformPaidAmount,
      feeSettingId: feeSetting.id,
      fullAmount,
      totalDiscount,
      totalPaid,
      remaining,
    },
  };
}
