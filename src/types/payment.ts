export type PaymentStatus = "paid" | "partial" | "pending" | "refunded";

export type PaymentMethod =
  | "cash"
  | "zain_cash"
  | "asia_hawala"
  | "bank_transfer"
  | "credit_card"
  | "debit_card"
  | "pos"
  | "cheque"
  | "installment"
  | "mixed"
  | "other";

export type FeeType =
  | "tuition"
  | "transport"
  | "books"
  | "uniform"
  | "activity"
  | "exam"
  | "other";

export type Payment = {
  id: string;
  feeTitle: string;
  feeType: string;
  amount: number;
  originalAmount: number | null;
  discountAmount: number;
  discountPercent: number | null;
  discountReason: string | null;
  finalAmount: number | null;
  status: string;
  method: string;
  academicYear: string | null;
  dueDate: Date | null;
  paidAt: Date | null;
  notes: string | null;
  studentId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentFormInput = {
  feeTitle: string;
  feeType?: string;
  amount: number | string;
  originalAmount?: number | string;
  discountAmount?: number | string;
  discountPercent?: number | string;
  discountReason?: string;
  finalAmount?: number | string;
  paymentMode?: "full" | "installment";
  status?: string;
  method?: string;
  academicYear?: string;
  dueDate?: string | Date;
  paidAt?: string | Date;
  notes?: string;
  studentId: string;
};

export type PaymentListItem = {
  id: string;
  feeTitle: string;
  feeType: string;
  feeTypeLabel: string;
  amount: number;
  formattedAmount: string;
  originalAmount: number | null;
  discountAmount: number;
  discountPercent: number | null;
  discountReason: string | null;
  finalAmount: number | null;
  formattedOriginalAmount: string;
  formattedDiscountAmount: string;
  formattedFinalAmount: string;
  status: string;
  statusLabel: string;
  statusClass: string;
  method: string;
  methodLabel: string;
  academicYear: string | null;
  dueDate: Date | null;
  paidAt: Date | null;
  notes: string | null;
  isOverdue: boolean;
  remainingAmount: number;
  formattedRemainingAmount: string;
  isUniformPaid: boolean;

  studentId: string;
  studentName: string;
  studentCode: string | null;
  guardianName: string | null;
  guardianPhone: string | null;

  sectionId: string | null;
  sectionName: string | null;

  classId: string | null;
  className: string | null;
  classLevel: string | null;

  createdAt: Date;
};

export type PaymentDetails = PaymentListItem & {
  updatedAt: Date;
};

export type PaymentValidationResult = {
  valid: boolean;
  errors: Partial<Record<keyof PaymentFormInput, string>>;
};

export type PaymentFilter = {
  query?: string;
  studentId?: string;
  sectionId?: string;
  classId?: string;
  feeType?: string;
  status?: string;
  method?: string;
  academicYear?: string;
  fromDate?: string;
  toDate?: string;
  dueFromDate?: string;
  dueToDate?: string;
  overdueOnly?: boolean;
};

export const FEE_TYPES: {
  value: FeeType;
  label: string;
}[] = [
  {
    value: "tuition",
    label: "رسوم دراسية",
  },
  {
    value: "transport",
    label: "نقل",
  },
  {
    value: "books",
    label: "كتب",
  },
  {
    value: "uniform",
    label: "زي مدرسي",
  },
  {
    value: "activity",
    label: "نشاط",
  },
  {
    value: "exam",
    label: "امتحان",
  },
  {
    value: "other",
    label: "أخرى",
  },
];

export const PAYMENT_STATUSES: {
  value: PaymentStatus;
  label: string;
  tone: "success" | "warning" | "danger" | "info";
}[] = [
  {
    value: "paid",
    label: "مدفوع",
    tone: "success",
  },
  {
    value: "partial",
    label: "مدفوع جزئيًا",
    tone: "warning",
  },
  {
    value: "pending",
    label: "معلّق",
    tone: "danger",
  },
  {
    value: "refunded",
    label: "مسترجع",
    tone: "info",
  },
];

export const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
}[] = [
  { value: "cash", label: "نقدًا" },
  { value: "zain_cash", label: "زين كاش" },
  { value: "asia_hawala", label: "آسيا حوالة" },
  { value: "bank_transfer", label: "تحويل مصرفي" },
  { value: "credit_card", label: "بطاقة ائتمان" },
  { value: "debit_card", label: "بطاقة خصم" },
  { value: "pos", label: "جهاز POS" },
  { value: "cheque", label: "صك / شيك" },
  { value: "installment", label: "تقسيط" },
  { value: "mixed", label: "دفع مختلط" },
  { value: "other", label: "أخرى" },
];

export function calculateDiscountFromPercent(originalAmount: number, discountPercent: number): number {
  return Math.round((originalAmount * discountPercent) / 100);
}

export function calculateDiscountPercent(originalAmount: number, discountAmount: number): number {
  if (originalAmount <= 0) return 0;
  return Math.round((discountAmount / originalAmount) * 100);
}

export function calculateFinalAmount(originalAmount: number, discountAmount: number): number {
  return Math.max(0, originalAmount - discountAmount);
}

export function resolvePaymentAmounts(input: PaymentFormInput) {
  const originalAmount = Number(input.originalAmount || input.amount || 0);
  const rawDiscountAmount = Number(input.discountAmount || 0);
  const rawDiscountPercent = Number(input.discountPercent || 0);

  let discountAmount = rawDiscountAmount;
  let discountPercent = rawDiscountPercent;

  if (discountPercent > 0 && discountAmount <= 0) {
    discountAmount = calculateDiscountFromPercent(originalAmount, discountPercent);
  }

  if (discountAmount > 0 && discountPercent <= 0) {
    discountPercent = calculateDiscountPercent(originalAmount, discountAmount);
  }

  const finalAmount = calculateFinalAmount(originalAmount, discountAmount);
  const paidAmount = Number(input.amount || 0);

  return {
    originalAmount,
    discountAmount,
    discountPercent,
    finalAmount,
    paidAmount,
  };
}

export function validateDiscount(originalAmount: number, discountAmount: number): { valid: boolean; message?: string } {
  if (discountAmount > originalAmount) {
    return { valid: false, message: "تحذير: قيمة الخصم أكبر من القسط." };
  }
  if (discountAmount < 0) {
    return { valid: false, message: "قيمة الخصم لا يمكن أن تكون سالبة." };
  }
  return { valid: true };
}

export function validateDiscountPercent(percent: number): { valid: boolean; message?: string } {
  if (percent > 100) {
    return { valid: false, message: "نسبة الخصم لا يمكن أن تتجاوز 100%." };
  }
  if (percent < 0) {
    return { valid: false, message: "نسبة الخصم لا يمكن أن تكون سالبة." };
  }
  return { valid: true };
}

export function getEmptyPaymentForm(): PaymentFormInput {
  return {
    feeTitle: "",
    feeType: "tuition",
    amount: "",
    originalAmount: "",
    discountAmount: "0",
    discountPercent: "0",
    discountReason: "",
    finalAmount: "",
    paymentMode: "full",
    status: "paid",
    method: "cash",
    academicYear: getCurrentAcademicYear(),
    dueDate: "",
    paidAt: "",
    notes: "",
    studentId: "",
  };
}

export function normalizePaymentInput(
  input: PaymentFormInput,
): PaymentFormInput {
  return {
    feeTitle: input.feeTitle.trim(),
    feeType: input.feeType?.trim() || "tuition",
    amount:
      typeof input.amount === "string"
        ? Number(input.amount.trim())
        : input.amount,
    originalAmount:
      typeof input.originalAmount === "string"
        ? Number(input.originalAmount.trim())
        : input.originalAmount,
    discountAmount:
      typeof input.discountAmount === "string"
        ? Number(input.discountAmount.trim())
        : input.discountAmount,
    discountPercent:
      typeof input.discountPercent === "string"
        ? Number(input.discountPercent.trim())
        : input.discountPercent,
    discountReason: input.discountReason?.trim() || undefined,
    finalAmount:
      typeof input.finalAmount === "string"
        ? Number(input.finalAmount.trim())
        : input.finalAmount,
    paymentMode: input.paymentMode || "full",
    status: input.status?.trim() || "paid",
    method: input.method?.trim() || "cash",
    academicYear: input.academicYear?.trim() || undefined,
    dueDate: input.dueDate || undefined,
    paidAt: input.paidAt || undefined,
    notes: input.notes?.trim() || undefined,
    studentId: input.studentId.trim(),
  };
}

export function validatePaymentInput(
  input: PaymentFormInput,
): PaymentValidationResult {
  const normalized = normalizePaymentInput(input);
  const resolved = resolvePaymentAmounts(normalized);
  const errors: Partial<Record<keyof PaymentFormInput, string>> = {};

  if (!normalized.feeTitle) {
    errors.feeTitle = "عنوان الرسم مطلوب.";
  }

  if (normalized.feeTitle && normalized.feeTitle.length < 2) {
    errors.feeTitle = "عنوان الرسم قصير جدًا.";
  }

  if (normalized.feeTitle && normalized.feeTitle.length > 120) {
    errors.feeTitle = "عنوان الرسم طويل جدًا.";
  }

  if (Number.isNaN(Number(normalized.amount))) {
    errors.amount = "المبلغ يجب أن يكون رقمًا.";
  }

  if (!Number.isNaN(Number(normalized.amount)) && Number(normalized.amount) <= 0) {
    errors.amount = "المبلغ يجب أن يكون أكبر من صفر.";
  }

  if (normalized.originalAmount !== undefined && Number.isNaN(Number(normalized.originalAmount))) {
    errors.originalAmount = "المبلغ الأصلي يجب أن يكون رقمًا.";
  }

  if (normalized.discountAmount !== undefined && Number.isNaN(Number(normalized.discountAmount))) {
    errors.discountAmount = "قيمة الخصم يجب أن تكون رقمًا.";
  }

  if (normalized.discountPercent !== undefined && Number.isNaN(Number(normalized.discountPercent))) {
    errors.discountPercent = "نسبة الخصم يجب أن تكون رقمًا.";
  }

  if (
    normalized.discountPercent !== undefined &&
    !Number.isNaN(Number(normalized.discountPercent)) &&
    Number(normalized.discountPercent) > 100
  ) {
    errors.discountPercent = "نسبة الخصم لا يمكن أن تتجاوز 100%.";
  }

  if (
    resolved.discountAmount > 0 &&
    resolved.originalAmount > 0 &&
    resolved.discountAmount > resolved.originalAmount
  ) {
    errors.discountAmount = "قيمة الخصم لا يمكن أن تتجاوز أصل المبلغ.";
  }

  if (resolved.finalAmount < 0) {
    errors.finalAmount = "المبلغ النهائي لا يمكن أن يكون سالبًا.";
  }

  const status = normalized.status ?? "paid";

  if (status === "paid" && resolved.paidAmount !== resolved.finalAmount) {
    errors.amount = "المبلغ المدفوع يجب أن يساوي المبلغ النهائي عند الحالة مدفوع.";
  }

  if (status === "partial" && (resolved.paidAmount <= 0 || resolved.paidAmount >= resolved.finalAmount)) {
    errors.amount = "المبلغ المدفوع يجب أن يكون أكبر من صفر وأقل من المبلغ النهائي عند الحالة جزئي.";
  }

  if (status === "pending" && resolved.paidAmount !== 0) {
    errors.amount = "المبلغ المدفوع يجب أن يكون صفر عند الحالة معلّق.";
  }

  if (resolved.paidAmount > resolved.finalAmount) {
    errors.amount = "المبلغ المدفوع لا يمكن أن يتجاوز المبلغ النهائي.";
  }

  if (normalized.finalAmount !== undefined && Number.isNaN(Number(normalized.finalAmount))) {
    errors.finalAmount = "المبلغ النهائي يجب أن يكون رقمًا.";
  }

  if (
    normalized.feeType &&
    !FEE_TYPES.some((item) => item.value === normalized.feeType)
  ) {
    errors.feeType = "نوع الرسم غير صحيح.";
  }

  if (
    normalized.status &&
    !PAYMENT_STATUSES.some((item) => item.value === normalized.status)
  ) {
    errors.status = "حالة الدفع غير صحيحة.";
  }

  if (
    normalized.method &&
    !PAYMENT_METHODS.some((item) => item.value === normalized.method)
  ) {
    errors.method = "طريقة الدفع غير صحيحة.";
  }

  if (normalized.academicYear && normalized.academicYear.length > 20) {
    errors.academicYear = "السنة الدراسية طويلة جدًا.";
  }

  if (normalized.dueDate && !parsePaymentDate(normalized.dueDate)) {
    errors.dueDate = "تاريخ الاستحقاق غير صحيح.";
  }

  if (normalized.paidAt && !parsePaymentDate(normalized.paidAt)) {
    errors.paidAt = "تاريخ الدفع غير صحيح.";
  }

  if (!normalized.studentId) {
    errors.studentId = "الطالب مطلوب.";
  }

  if (normalized.notes && normalized.notes.length > 500) {
    errors.notes = "الملاحظات يجب ألا تتجاوز 500 حرف.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function parsePaymentDate(value?: string | Date): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const date = new Date(trimmed);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function normalizePaymentDate(value?: string | Date): Date | null {
  const parsed = parsePaymentDate(value);

  if (!parsed) {
    return null;
  }

  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    12,
    0,
    0,
    0,
  );
}

export function getPaymentDateRange(value?: string | Date): {
  start: Date;
  end: Date;
} | null {
  const parsed = parsePaymentDate(value);

  if (!parsed) {
    return null;
  }

  const start = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    0,
    0,
    0,
    0,
  );

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    start,
    end,
  };
}

export function getFeeTypeLabel(feeType: string): string {
  return FEE_TYPES.find((item) => item.value === feeType)?.label ?? feeType;
}

export function getPaymentStatusLabel(status: string): string {
  return (
    PAYMENT_STATUSES.find((item) => item.value === status)?.label ?? "غير محدد"
  );
}

export function getPaymentStatusBadgeClass(status: string): string {
  if (status === "paid") {
    return "badge-success";
  }

  if (status === "partial") {
    return "badge-warning";
  }

  if (status === "pending") {
    return "badge-danger";
  }

  if (status === "refunded") {
    return "badge-info";
  }

  return "badge-info";
}

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ar-IQ-u-nu-latn", {
    style: "currency",
    currency: "IQD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPaymentDate(date: Date): string {
  return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatPaymentShortDate(date: Date): string {
  return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isPaymentOverdue(input: {
  status: string;
  dueDate: Date | null;
}): boolean {
  if (!input.dueDate) {
    return false;
  }

  if (input.status === "paid" || input.status === "refunded") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(input.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

export function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (month >= 9) {
    return `${year}-${year + 1}`;
  }

  return `${year - 1}-${year}`;
}

export function canDeletePayment(): {
  allowed: boolean;
  reason?: string;
} {
  return {
    allowed: true,
  };
}
