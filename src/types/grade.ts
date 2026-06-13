export type Grade = {
  id: string;
  title: string;
  score: number;
  maxScore: number;
  examType: string;
  term: string;
  date: Date;
  notes: string | null;
  studentId: string;
  subjectId: string;
  teacherId: string | null;
  examId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type GradeFormInput = {
  title: string;
  score: number | string;
  maxScore: number | string;
  examType?: string;
  term?: string;
  date?: string | Date;
  notes?: string;
  studentId: string;
  subjectId: string;
  teacherId?: string;
  examId?: string;
};

export type GradeListItem = {
  id: string;
  title: string;
  score: number;
  maxScore: number;
  percentage: number;
  rating: string;
  ratingClass: string;
  examType: string;
  examTypeLabel: string;
  term: string;
  termLabel: string;
  date: Date;
  notes: string | null;

  studentId: string;
  studentName: string;
  studentCode: string | null;

  sectionId: string | null;
  sectionName: string | null;

  classId: string | null;
  className: string | null;
  classLevel: string | null;

  subjectId: string;
  subjectName: string;

  teacherId: string | null;
  teacherName: string | null;
  examId?: string | null;

  createdAt: Date;
};

export type GradeDetails = GradeListItem & {
  updatedAt: Date;
};

export type GradeValidationResult = {
  valid: boolean;
  errors: Partial<Record<keyof GradeFormInput, string>>;
};

export type GradeFilter = {
  query?: string;
  studentId?: string;
  subjectId?: string;
  teacherId?: string;
  sectionId?: string;
  classId?: string;
  examType?: string;
  term?: string;
  examId?: string;
  fromDate?: string;
  toDate?: string;
};

export const EXAM_TYPES = [
  { value: "daily", label: "يومي" },
  { value: "monthly", label: "شهري" },
  { value: "midyear", label: "نصف سنة" },
  { value: "final", label: "فاينل" },
  { value: "cumulative", label: "تراكمي" },
  { value: "homework", label: "واجب" },
  { value: "oral", label: "شفهي" },
  { value: "written", label: "تحريري" },
  { value: "midterm", label: "نصف السنة" },
  { value: "project", label: "مشروع" },
] as const;

export const TERMS = [
  {
    value: "first",
    label: "الفصل الأول",
  },
  {
    value: "second",
    label: "الفصل الثاني",
  },
  {
    value: "annual",
    label: "السعي السنوي",
  },
] as const;

export type ExamTypeValue = (typeof EXAM_TYPES)[number]["value"];
export type TermValue = (typeof TERMS)[number]["value"];

export function getEmptyGradeForm(): GradeFormInput {
  return {
    title: "",
    score: "",
    maxScore: 100,
    examType: "monthly",
    term: "first",
    date: "",
    notes: "",
    studentId: "",
    subjectId: "",
    teacherId: "",
  };
}

export function normalizeGradeInput(input: GradeFormInput): GradeFormInput {
  return {
    title: input.title.trim(),
    score:
      typeof input.score === "string" ? Number(input.score.trim()) : input.score,
    maxScore:
      typeof input.maxScore === "string"
        ? Number(input.maxScore.trim())
        : input.maxScore,
    examType: input.examType?.trim() || "monthly",
    term: input.term?.trim() || "first",
    date: input.date || undefined,
    notes: input.notes?.trim() || undefined,
    studentId: input.studentId.trim(),
    subjectId: input.subjectId.trim(),
    teacherId: input.teacherId?.trim() || undefined,
    examId: input.examId?.trim() || undefined,
  };
}

export function validateGradeInput(input: GradeFormInput): GradeValidationResult {
  const normalized = normalizeGradeInput(input);
  const errors: Partial<Record<keyof GradeFormInput, string>> = {};

  if (!normalized.title) {
    errors.title = "عنوان الدرجة مطلوب.";
  }

  if (normalized.title && normalized.title.length < 2) {
    errors.title = "عنوان الدرجة قصير جدًا.";
  }

  if (normalized.title && normalized.title.length > 120) {
    errors.title = "عنوان الدرجة طويل جدًا.";
  }

  if (Number.isNaN(Number(normalized.score))) {
    errors.score = "درجة الطالب يجب أن تكون رقمًا.";
  }

  if (Number.isNaN(Number(normalized.maxScore))) {
    errors.maxScore = "الدرجة الكلية يجب أن تكون رقمًا.";
  }

  if (!Number.isNaN(Number(normalized.score)) && Number(normalized.score) < 0) {
    errors.score = "درجة الطالب لا يمكن أن تكون سالبة.";
  }

  if (
    !Number.isNaN(Number(normalized.maxScore)) &&
    Number(normalized.maxScore) <= 0
  ) {
    errors.maxScore = "الدرجة الكلية يجب أن تكون أكبر من صفر.";
  }

  if (
    !Number.isNaN(Number(normalized.score)) &&
    !Number.isNaN(Number(normalized.maxScore)) &&
    Number(normalized.score) > Number(normalized.maxScore)
  ) {
    errors.score = "درجة الطالب لا يمكن أن تكون أكبر من الدرجة الكلية.";
  }

  if (
    normalized.examType &&
    !EXAM_TYPES.some((item) => item.value === normalized.examType)
  ) {
    errors.examType = "نوع الامتحان غير صحيح.";
  }

  if (normalized.term && !TERMS.some((item) => item.value === normalized.term)) {
    errors.term = "الفصل غير صحيح.";
  }

  if (normalized.date && !parseGradeDate(normalized.date)) {
    errors.date = "تاريخ الدرجة غير صحيح.";
  }

  if (!normalized.studentId) {
    errors.studentId = "الطالب مطلوب.";
  }

  if (!normalized.subjectId) {
    errors.subjectId = "المادة مطلوبة.";
  }

  if (normalized.notes && normalized.notes.length > 500) {
    errors.notes = "الملاحظات يجب ألا تتجاوز 500 حرف.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function parseGradeDate(value?: string | Date): Date | undefined {
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

export function getGradePercentage(score: number, maxScore: number): number {
  if (!maxScore || maxScore <= 0) {
    return 0;
  }

  return Math.round((score / maxScore) * 100);
}

export function calculateGradePercentage(score: number, maxScore: number): number {
  if (!maxScore || maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 100);
}

export function getGradeLevelLabel(percentage: number): string {
  if (percentage >= 90) return "ممتاز";
  if (percentage >= 80) return "جيد جدًا";
  if (percentage >= 70) return "جيد";
  if (percentage >= 60) return "متوسط";
  if (percentage >= 50) return "مقبول";
  return "راسب";
}

export function getGradeWarning(percentage: number): string | null {
  if (percentage < 50) return "تحذير: الطالب راسب ويحتاج متابعة.";
  if (percentage < 60) return "تنبيه: الطالب قريب من الرسوب.";
  if (percentage < 80) return "جيد، يمكن تحسين المستوى.";
  return "مستوى ممتاز.";
}

export function suggestGradeReview(score: number, maxScore: number): string | null {
  const percentage = calculateGradePercentage(score, maxScore);
  if (percentage < 50) return "راجع الدرجات المنخفضة قبل اعتمادها.";
  return null;
}

export function getGradeRating(percentage: number): string {
  if (percentage >= 90) {
    return "ممتاز";
  }

  if (percentage >= 80) {
    return "جيد جدًا";
  }

  if (percentage >= 70) {
    return "جيد";
  }

  if (percentage >= 60) {
    return "متوسط";
  }

  if (percentage >= 50) {
    return "مقبول";
  }

  return "راسب";
}

export function getGradeRatingClass(percentage: number): string {
  if (percentage >= 90) {
    return "badge-success";
  }

  if (percentage >= 80) {
    return "badge-info";
  }

  if (percentage >= 70) {
    return "badge-info";
  }

  if (percentage >= 60) {
    return "badge-warning";
  }

  if (percentage >= 50) {
    return "badge-warning";
  }

  return "badge-danger";
}

export function getExamTypeLabel(examType: string): string {
  return EXAM_TYPES.find((item) => item.value === examType)?.label ?? examType;
}

export function getTermLabel(term: string): string {
  return TERMS.find((item) => item.value === term)?.label ?? term;
}

export function formatGradeDate(date: Date): string {
  return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatGradeShortDate(date: Date): string {
  return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function canDeleteGrade(): {
  allowed: boolean;
  reason?: string;
} {
  return {
    allowed: true,
  };
}
