import { db } from "@/lib/db";
import { Prisma } from "@/lib/prisma-types";
import { getCurrentAcademicYear } from "@/types/payment";

export type ClassFeeSettingInput = {
  classId: string;
  tuitionAmount: number;
  uniformAmount: number;
  customFeeTitle?: string;
  customFeeAmount?: number;
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
  customFeeTitle: string | null;
  customFeeAmount: number;
  tuitionPaid: number;
  tuitionDiscount: number;
  tuitionRemaining: number;
  uniformPaid: boolean;
  uniformPaidAmount: number;
  customPaid: number;
  customRemaining: number;
  packageTotalAmount: number;
  packagePaidAmount: number;
  packageRemainingAmount: number;
  feeSettingId: string | null;
};

function readUniformAmount(setting: any): number {
  return Number(setting?.uniformAmount ?? setting?.uniform_amount ?? 0) || 0;
}

function readCustomFeeAmount(setting: any): number {
  return Number(setting?.customFeeAmount ?? setting?.custom_fee_amount ?? 0) || 0;
}

function readCustomFeeTitle(setting: any): string | null {
  const value = String(setting?.customFeeTitle ?? setting?.custom_fee_title ?? "").trim();
  return value || null;
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
  const customFeeAmount = Math.max(0, Number(input.customFeeAmount) || 0);
  const customFeeTitle = input.customFeeTitle?.trim() || null;

  const existing = await db.classFeeSetting.findFirst({
    where: { classId: input.classId, academicYear },
  });

  const data = {
    classId: input.classId,
    tuitionAmount,
    uniformAmount,
    customFeeTitle,
    customFeeAmount,
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

function buildStudentPlan(input: {
  student: any;
  setting: any;
  payments: any[];
  academicYear: string;
}): StudentFeePlan {
  const { student, setting, payments, academicYear } = input;
  const classId = student.section?.classId ?? null;
  const tuitionPayments = payments.filter((p) => p.feeType === "tuition");
  const uniformPayments = payments.filter((p) => p.feeType === "uniform");
  const customPayments = payments.filter((p) => p.feeType === "custom");
  const totalPayments = payments.filter((p) => p.feeType === "total");

  const tuitionAmount = Number(setting?.tuitionAmount ?? setting?.amount ?? 0) || 0;
  const uniformAmount = readUniformAmount(setting);
  const customFeeAmount = readCustomFeeAmount(setting);
  const customFeeTitle = readCustomFeeTitle(setting);

  const tuitionPaid = tuitionPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const tuitionDiscount = tuitionPayments.reduce((sum, p) => sum + Number(p.discountAmount || 0), 0);
  const uniformPaidAmount = uniformPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const customPaid = customPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalPaid = totalPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const packagePaidAmount = tuitionPaid + uniformPaidAmount + customPaid + totalPaid;
  const packageTotalAmount = tuitionAmount + uniformAmount + customFeeAmount;
  const packageRemainingAmount = Math.max(0, packageTotalAmount - tuitionDiscount - packagePaidAmount);

  return {
    studentId: student.id,
    studentName: student.fullName,
    classId,
    className: student.section?.class?.name ?? null,
    classLevel: student.section?.class?.level ?? null,
    sectionName: student.section?.name ?? null,
    academicYear,
    tuitionAmount,
    uniformAmount,
    customFeeTitle,
    customFeeAmount,
    tuitionPaid,
    tuitionDiscount,
    tuitionRemaining: Math.max(0, tuitionAmount - tuitionDiscount - tuitionPaid - totalPaid),
    uniformPaid: uniformAmount > 0 && (uniformPaidAmount >= uniformAmount || packageRemainingAmount === 0),
    uniformPaidAmount,
    customPaid,
    customRemaining: Math.max(0, customFeeAmount - customPaid - totalPaid),
    packageTotalAmount,
    packagePaidAmount,
    packageRemainingAmount,
    feeSettingId: setting?.id ?? null,
  };
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

  return students.map((student: any) => buildStudentPlan({
    student,
    setting: student.section?.classId ? settingByClassId.get(student.section.classId) : null,
    payments: paymentsByStudent.get(student.id) ?? [],
    academicYear: year,
  }));
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

  const plan = buildStudentPlan({ student, setting: feeSetting, payments, academicYear: year });

  return {
    ok: true,
    data: {
      ...plan,
      fullAmount: plan.packageTotalAmount,
      totalDiscount: plan.tuitionDiscount,
      totalPaid: plan.packagePaidAmount,
      remaining: plan.packageRemainingAmount,
    },
  };
}
