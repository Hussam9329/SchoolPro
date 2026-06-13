import { Prisma } from "@/lib/prisma-types";
import { db } from "@/lib/db";
import { getDatabaseUnavailableMessage, isDatabaseStorageEnabled } from "@/lib/storage-mode";
import {
  canDeletePayment,
  normalizePaymentDate,
  normalizePaymentInput,
  validatePaymentInput,
  formatMoney,
  getFeeTypeLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getPaymentStatusBadgeClass,
  isPaymentOverdue,
  type Payment,
  type PaymentDetails,
  type PaymentFilter,
  type PaymentFormInput,
  type PaymentListItem,
} from "@/types/payment";

export type PaymentServiceResult<T> = {
  ok: boolean;
  data?: T;
  message: string;
  errors?: Record<string, string>;
};

const paymentListInclude = {
  student: {
    include: {
      section: {
        include: {
          class: true,
        },
      },
    },
  },
} satisfies Prisma.PaymentInclude;

type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: typeof paymentListInclude;
}>;

function toPaymentListItem(payment: PaymentWithRelations): PaymentListItem {
  const overdue = isPaymentOverdue({
    status: payment.status,
    dueDate: payment.dueDate,
  });
  const dueAmount = Number(payment.finalAmount ?? payment.originalAmount ?? payment.amount ?? 0);
  const remainingAmount = Math.max(0, dueAmount - Number(payment.amount || 0));
  const isUniformPaid = payment.feeType === "uniform" && ["paid", "partial"].includes(payment.status) && Number(payment.amount || 0) > 0;

  return {
    id: payment.id,
    feeTitle: payment.feeTitle,
    feeType: payment.feeType,
    feeTypeLabel: getFeeTypeLabel(payment.feeType),
    amount: payment.amount,
    formattedAmount: formatMoney(payment.amount),
    originalAmount: payment.originalAmount,
    discountAmount: payment.discountAmount,
    discountPercent: payment.discountPercent,
    discountReason: payment.discountReason,
    finalAmount: payment.finalAmount,
    formattedOriginalAmount: payment.originalAmount != null ? formatMoney(payment.originalAmount) : "",
    formattedDiscountAmount: formatMoney(payment.discountAmount),
    formattedFinalAmount: payment.finalAmount != null ? formatMoney(payment.finalAmount) : "",
    status: payment.status,
    statusLabel: getPaymentStatusLabel(payment.status),
    statusClass: getPaymentStatusBadgeClass(payment.status),
    method: payment.method,
    methodLabel: getPaymentMethodLabel(payment.method),
    academicYear: payment.academicYear,
    dueDate: payment.dueDate,
    paidAt: payment.paidAt,
    notes: payment.notes,
    isOverdue: overdue,
    remainingAmount,
    formattedRemainingAmount: formatMoney(remainingAmount),
    isUniformPaid,

    studentId: payment.studentId,
    studentName: payment.student.fullName,
    studentCode: payment.student.studentCode,
    guardianName: payment.student.guardianName,
    guardianPhone: payment.student.guardianPhone,

    sectionId: payment.student.sectionId,
    sectionName: payment.student.section?.name ?? null,

    classId: payment.student.section?.classId ?? null,
    className: payment.student.section?.class.name ?? null,
    classLevel: payment.student.section?.class.level ?? null,

    createdAt: payment.createdAt,
  };
}

/**
 * Build a payment where clause that works with the external data adapter.
 * Nested Prisma-style relation filters (e.g., { student: { section: { classId } } })
 * are NOT supported by the external data adapter.
 * Instead, we resolve them to explicit studentId filters using pre-queries.
 */
async function buildPaymentWhere(filter: PaymentFilter): Promise<Prisma.PaymentWhereInput> {
  const query = filter.query?.trim();
  const where: Prisma.PaymentWhereInput = {};

  // Collect student IDs from relation filters
  const resolvedStudentIds = await resolveStudentIds(filter);

  if (query) {
    // For search queries, we also need to find matching student IDs
    const searchStudentIds = await resolveStudentIdsBySearch(query);

    where.OR = [
      {
        feeTitle: {
          contains: query,
        },
      },
      ...(searchStudentIds.length > 0 ? [{
        studentId: { in: searchStudentIds },
      }] : []),
      {
        notes: {
          contains: query,
        },
      },
    ];
  }

  if (filter.studentId) {
    where.studentId = filter.studentId;
  }

  // Apply resolved student ID filters from sectionId/classId
  if (resolvedStudentIds !== null) {
    // Combine with existing studentId filter if any
    if (where.studentId) {
      // If filter.studentId is also set, just keep it (it's more specific)
    } else {
      where.studentId = { in: resolvedStudentIds };
    }
  }

  if (filter.feeType) {
    where.feeType = filter.feeType;
  }

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.method) {
    where.method = filter.method;
  }

  if (filter.academicYear) {
    where.academicYear = filter.academicYear;
  }

  if (filter.fromDate || filter.toDate) {
    where.createdAt = {};

    if (filter.fromDate) {
      const from = new Date(filter.fromDate);
      if (!Number.isNaN(from.getTime())) {
        where.createdAt.gte = from;
      }
    }

    if (filter.toDate) {
      const to = new Date(filter.toDate);
      if (!Number.isNaN(to.getTime())) {
        to.setDate(to.getDate() + 1);
        where.createdAt.lt = to;
      }
    }
  }

  if (filter.dueFromDate || filter.dueToDate) {
    where.dueDate = {};

    if (filter.dueFromDate) {
      const from = new Date(filter.dueFromDate);
      if (!Number.isNaN(from.getTime())) {
        where.dueDate.gte = from;
      }
    }

    if (filter.dueToDate) {
      const to = new Date(filter.dueToDate);
      if (!Number.isNaN(to.getTime())) {
        to.setDate(to.getDate() + 1);
        where.dueDate.lt = to;
      }
    }
  }

  if (filter.overdueOnly) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        status: {
          in: ["pending", "partial"],
        },
        dueDate: {
          lt: today,
        },
      },
    ];
  }

  return where;
}

/**
 * Resolve student IDs from sectionId/classId filters.
 * Returns null if no relation filters are active (no filtering needed).
 * Returns an array of student IDs if sectionId or classId filtering is needed.
 */
async function resolveStudentIds(filter: PaymentFilter): Promise<string[] | null> {
  if (!filter.sectionId && !filter.classId) return null;

  if (filter.sectionId && filter.classId) {
    // Both filters: find sections that match classId, then students in those sections
    const sections = await db.section.findMany({
      where: { classId: filter.classId, id: filter.sectionId },
      select: { id: true },
    });
    const sectionIds = sections.map((s: any) => s.id);
    if (sectionIds.length === 0) return [];
    const students = await db.student.findMany({
      where: { sectionId: { in: sectionIds }, status: "active" },
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
    // Find sections for this class, then students in those sections
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

/**
 * Find student IDs that match a search query on fullName, studentCode, or guardianName.
 */
async function resolveStudentIdsBySearch(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  try {
    const students = await db.student.findMany({
      where: {
        OR: [
          { fullName: { contains: query } },
          { studentCode: { contains: query } },
          { guardianName: { contains: query } },
        ],
      },
      select: { id: true },
    });
    return students.map((s: any) => s.id);
  } catch {
    return [];
  }
}

async function validatePaymentRelations(input: PaymentFormInput): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!input.studentId) {
    return {
      ok: false,
      message: "الطالب مطلوب.",
    };
  }

  const student = await db.student.findUnique({
    where: {
      id: input.studentId,
    },
  });

  if (!student) {
    return {
      ok: false,
      message: "الطالب المحدد غير موجود.",
    };
  }

  return {
    ok: true,
    message: "العلاقات صالحة.",
  };
}

export async function getPayments(
  filter: PaymentFilter = {},
): Promise<PaymentListItem[]> {
  const where = await buildPaymentWhere(filter);

  const payments = await db.payment.findMany({
    where,
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
    include: paymentListInclude,
  });

  return payments.map((payment) => toPaymentListItem(payment));
}

export async function searchPayments(
  query: string,
): Promise<PaymentListItem[]> {
  return getPayments({
    query,
  });
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  return db.payment.findUnique({
    where: {
      id,
    },
  });
}

export async function getPaymentDetails(
  id: string,
): Promise<PaymentDetails | null> {
  const payment = await db.payment.findUnique({
    where: {
      id,
    },
    include: paymentListInclude,
  });

  if (!payment) {
    return null;
  }

  const listItem = toPaymentListItem(payment);

  return {
    ...listItem,
    updatedAt: payment.updatedAt,
  };
}

export async function createPayment(
  input: PaymentFormInput,
): Promise<PaymentServiceResult<Payment>> {
  const validation = validatePaymentInput(input);

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

  const data = normalizePaymentInput(input);

  const relationsCheck = await validatePaymentRelations(data);

  if (!relationsCheck.ok) {
    return {
      ok: false,
      message: relationsCheck.message,
      errors: {
        studentId: relationsCheck.message,
      },
    };
  }

  try {
    const payment = await db.payment.create({
      data: {
        feeTitle: data.feeTitle,
        feeType: data.feeType ?? "tuition",
        amount: Number(data.amount),
        originalAmount: data.originalAmount != null ? Number(data.originalAmount) : null,
        discountAmount: data.discountAmount != null ? Number(data.discountAmount) : 0,
        discountPercent: data.discountPercent != null ? Number(data.discountPercent) : null,
        discountReason: data.discountReason ?? null,
        finalAmount: data.finalAmount != null ? Number(data.finalAmount) : null,
        status: data.status ?? "paid",
        method: data.method ?? "cash",
        academicYear: data.academicYear ?? null,
        dueDate: normalizePaymentDate(data.dueDate),
        paidAt: normalizePaymentDate(data.paidAt),
        notes: data.notes ?? null,
        studentId: data.studentId,
      },
    });

    return {
      ok: true,
      data: payment,
      message: "تمت إضافة الدفعة بنجاح.",
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "توجد دفعة مكررة.",
      };
    }

    return {
      ok: false,
      message: "حدث خطأ أثناء إضافة الدفعة.",
    };
  }
}

export async function updatePayment(
  id: string,
  input: PaymentFormInput,
): Promise<PaymentServiceResult<Payment>> {
  const validation = validatePaymentInput(input);

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

  const existingPayment = await getPaymentById(id);

  if (!existingPayment) {
    return {
      ok: false,
      message: "لم يتم العثور على الدفعة.",
    };
  }

  const data = normalizePaymentInput(input);

  const relationsCheck = await validatePaymentRelations(data);

  if (!relationsCheck.ok) {
    return {
      ok: false,
      message: relationsCheck.message,
      errors: {
        studentId: relationsCheck.message,
      },
    };
  }

  try {
    const payment = await db.payment.update({
      where: {
        id,
      },
      data: {
        feeTitle: data.feeTitle,
        feeType: data.feeType ?? "tuition",
        amount: Number(data.amount),
        originalAmount: data.originalAmount != null ? Number(data.originalAmount) : null,
        discountAmount: data.discountAmount != null ? Number(data.discountAmount) : 0,
        discountPercent: data.discountPercent != null ? Number(data.discountPercent) : null,
        discountReason: data.discountReason ?? null,
        finalAmount: data.finalAmount != null ? Number(data.finalAmount) : null,
        status: data.status ?? "paid",
        method: data.method ?? "cash",
        academicYear: data.academicYear ?? null,
        dueDate: normalizePaymentDate(data.dueDate),
        paidAt: normalizePaymentDate(data.paidAt),
        notes: data.notes ?? null,
        studentId: data.studentId,
      },
    });

    return {
      ok: true,
      data: payment,
      message: "تم تحديث بيانات الدفعة بنجاح.",
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "توجد دفعة مكررة.",
      };
    }

    return {
      ok: false,
      message: "حدث خطأ أثناء تحديث بيانات الدفعة.",
    };
  }
}

export async function deletePayment(
  id: string,
): Promise<PaymentServiceResult<null>> {
  const payment = await db.payment.findUnique({
    where: {
      id,
    },
  });

  if (!payment) {
    return {
      ok: false,
      message: "لم يتم العثور على الدفعة.",
    };
  }

  const deleteCheck = canDeletePayment();

  if (!deleteCheck.allowed) {
    return {
      ok: false,
      message: deleteCheck.reason ?? "لا يمكن حذف الدفعة حاليًا.",
    };
  }

  try {
    await db.payment.delete({
      where: {
        id,
      },
    });
  } catch (error) {
    console.error("[deletePayment] Error:", error);
    return {
      ok: false,
      message: "حدث خطأ أثناء حذف الدفعة.",
    };
  }

  return {
    ok: true,
    data: null,
    message: "تم حذف الدفعة بنجاح.",
  };
}

export async function getPaymentsCount(): Promise<{
  total: number;
  paid: number;
  partial: number;
  pending: number;
  refunded: number;
  overdue: number;
  totalPaid: number;
  totalPending: number;
  totalRefunded: number;
}> {
  const [total, paid, partial, pending, refunded] = await Promise.all([
    db.payment.count(),
    db.payment.count({ where: { status: "paid" } }),
    db.payment.count({ where: { status: "partial" } }),
    db.payment.count({ where: { status: "pending" } }),
    db.payment.count({ where: { status: "refunded" } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = await db.payment.count({
    where: {
      status: { in: ["pending", "partial"] },
      dueDate: { lt: today },
    },
  });

  const paymentAmounts = await db.payment.findMany({
    select: {
      amount: true,
      finalAmount: true,
      originalAmount: true,
      status: true,
    },
  });

  const totalPaid = paymentAmounts
    .filter((p) => p.status === "paid" || p.status === "partial")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = paymentAmounts
    .filter((p) => p.status === "pending" || p.status === "partial")
    .reduce((sum, p) => {
      const due = p.finalAmount ?? p.originalAmount ?? p.amount;
      return sum + Math.max(0, due - p.amount);
    }, 0);

  const totalRefunded = paymentAmounts
    .filter((p) => p.status === "refunded")
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    total,
    paid,
    partial,
    pending,
    refunded,
    overdue,
    totalPaid,
    totalPending,
    totalRefunded,
  };
}

export async function getPaymentsByStudentId(
  studentId: string,
): Promise<PaymentListItem[]> {
  return getPayments({
    studentId,
  });
}

export async function getStudentPaymentSummary(
  studentId: string,
): Promise<{
  totalPaid: number;
  totalPending: number;
  totalRefunded: number;
  paymentsCount: number;
}> {
  const [paidAggregate, pendingAggregate, refundedAggregate, paymentsCount] =
    await Promise.all([
      db.payment.aggregate({
        where: {
          studentId,
          status: "paid",
        },
        _sum: {
          amount: true,
        },
      }),
      db.payment.aggregate({
        where: {
          studentId,
          status: {
            in: ["pending", "partial"],
          },
        },
        _sum: {
          amount: true,
        },
      }),
      db.payment.aggregate({
        where: {
          studentId,
          status: "refunded",
        },
        _sum: {
          amount: true,
        },
      }),
      db.payment.count({
        where: {
          studentId,
        },
      }),
    ]);

  return {
    totalPaid: paidAggregate._sum.amount ?? 0,
    totalPending: pendingAggregate._sum.amount ?? 0,
    totalRefunded: refundedAggregate._sum.amount ?? 0,
    paymentsCount,
  };
}

export async function hasPayments(): Promise<boolean> {
  const count = await db.payment.count();
  return count > 0;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002") ||
    ((error as any)?.code === "P2002")
  );
}
