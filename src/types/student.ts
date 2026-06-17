import { IRAQI_PHONE_REGEX, validateQuadrupleName } from "@/lib/validators";

export type Student = {
  id: string;
  fullName: string;
  studentCode: string | null;
  gender: string | null;
  birthDate: Date | null;
  phone: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  address: string | null;
  enrollmentDate: Date;
  status: string;
  notes: string | null;
  sectionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StudentFormInput = {
  fullName: string;
  phone: string;
  guardianPhone: string;
  birthDate: string | Date;
  sectionId: string;
};

export type StudentStatus = "active" | "inactive" | "graduated" | "transferred";

export type StudentGender = "male" | "female" | "unspecified";

export type StudentListItem = {
  id: string;
  fullName: string;
  studentCode: string | null;
  gender: string | null;
  birthDate: Date | null;
  phone: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  status: string;
  sectionId: string | null;
  sectionName: string | null;
  classId: string | null;
  className: string | null;
  classLevel: string | null;
  gradesCount: number;
  attendanceCount: number;
  feesCount: number;
  enrollmentDate: Date;
  createdAt: Date;
};

export type StudentDetails = Student & {
  sectionName: string | null;
  classId: string | null;
  className: string | null;
  classLevel: string | null;
  gradesCount: number;
  attendanceCount: number;
  feesCount: number;
};

export type StudentValidationResult = {
  valid: boolean;
  errors: Partial<Record<keyof StudentFormInput, string>>;
};

export type StudentsFilter = {
  query?: string;
  sectionId?: string;
  classId?: string;
  status?: string;
};

export function getEmptyStudentForm(): StudentFormInput {
  return {
    fullName: "",
    phone: "",
    guardianPhone: "",
    birthDate: "",
    sectionId: "",
  };
}

export function normalizeStudentInput(
  input: StudentFormInput,
): StudentFormInput {
  return {
    fullName: input.fullName.trim(),
    phone: input.phone?.trim() || "",
    guardianPhone: input.guardianPhone?.trim() || "",
    birthDate: input.birthDate || "",
    sectionId: input.sectionId?.trim() || "",
  };
}

export function validateStudentInput(
  input: StudentFormInput,
): StudentValidationResult {
  const normalized = normalizeStudentInput(input);
  const errors: Partial<Record<keyof StudentFormInput, string>> = {};

  if (!normalized.fullName) {
    errors.fullName = "اسم الطالب مطلوب.";
  } else if (!validateQuadrupleName(normalized.fullName)) {
    errors.fullName = "الاسم لا يجب أن يحتوي على أرقام.";
  }

  if (!normalized.phone) {
    errors.phone = "رقم هاتف الطالب يجب أن يتكون من 11 رقم ويبدأ بـ 07.";
  } else if (!IRAQI_PHONE_REGEX.test(normalized.phone)) {
    errors.phone = "رقم هاتف الطالب يجب أن يتكون من 11 رقم ويبدأ بـ 07.";
  }

  if (!normalized.guardianPhone) {
    errors.guardianPhone = "رقم هاتف ولي الأمر يجب أن يتكون من 11 رقم ويبدأ بـ 07.";
  } else if (!IRAQI_PHONE_REGEX.test(normalized.guardianPhone)) {
    errors.guardianPhone = "رقم هاتف ولي الأمر يجب أن يتكون من 11 رقم ويبدأ بـ 07.";
  }

  if (!normalized.birthDate) {
    errors.birthDate = "تاريخ الميلاد مطلوب.";
  } else {
    const parsedBirthDate = parseOptionalDate(normalized.birthDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (!parsedBirthDate) {
      errors.birthDate = "تاريخ الميلاد غير صحيح.";
    } else if (parsedBirthDate.getTime() > today.getTime()) {
      errors.birthDate = "تاريخ الميلاد لا يمكن أن يكون في المستقبل.";
    }
  }

  if (!normalized.sectionId) {
    errors.sectionId = "يجب اختيار الصف والشعبة.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function parseOptionalDate(value?: string | Date): Date | undefined {
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

export function getStudentStatusLabel(status: string): string {
  const labels: Record<StudentStatus, string> = {
    active: "مستمر",
    inactive: "متوقف",
    graduated: "متخرج",
    transferred: "منقول",
  };

  return labels[status as StudentStatus] ?? "غير محدد";
}

export function getStudentStatusBadgeClass(status: string): string {
  const classes: Record<StudentStatus, string> = {
    active: "badge-success",
    inactive: "badge-warning",
    graduated: "badge-info",
    transferred: "badge-danger",
  };

  return classes[status as StudentStatus] ?? "badge-info";
}

export function getGenderLabel(gender?: string | null): string {
  if (gender === "male") {
    return "ذكر";
  }

  if (gender === "female") {
    return "أنثى";
  }

  return "غير محدد";
}

export function getStudentDisplayName(
  student: Pick<Student, "fullName" | "studentCode">,
): string {
  if (student.studentCode) {
    return `${student.fullName} - ${student.studentCode}`;
  }

  return student.fullName;
}

export function getStudentClassDisplay(input: {
  className?: string | null;
  classLevel?: string | null;
  sectionName?: string | null;
}): string {
  if (!input.className && !input.sectionName) {
    return "غير مرتبط بشعبة";
  }

  const classPart = input.classLevel
    ? `${input.className} - ${input.classLevel}`
    : input.className;

  if (input.sectionName) {
    return `${classPart} / شعبة ${input.sectionName}`;
  }

  return classPart ?? "غير مرتبط بشعبة";
}

export function calculateAge(birthDate?: Date | string | null): number | null {
  if (!birthDate) {
    return null;
  }

  const date = birthDate instanceof Date ? birthDate : new Date(birthDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const today = new Date();

  let age = today.getFullYear() - date.getFullYear();

  const monthDifference = today.getMonth() - date.getMonth();
  const dayDifference = today.getDate() - date.getDate();

  if (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export type DeleteAssociation = {
  label: string;
  count: number;
  /** Optional human-readable linked records shown inside delete confirmation dialogs. */
  details?: string[];
};

export type DeleteCheckResult = {
  allowed: true;
  associations: DeleteAssociation[];
  hasAssociations: boolean;
};

export function getStudentDeleteAssociations(input: {
  gradesCount?: number;
  attendanceCount?: number;
  feesCount?: number;
}): DeleteCheckResult {
  const gradesCount = input.gradesCount ?? 0;
  const attendanceCount = input.attendanceCount ?? 0;
  const feesCount = input.feesCount ?? 0;

  const associations: DeleteAssociation[] = [];

  if (gradesCount > 0) {
    associations.push({ label: "درجات", count: gradesCount });
  }

  if (attendanceCount > 0) {
    associations.push({ label: "سجلات حضور", count: attendanceCount });
  }

  if (feesCount > 0) {
    associations.push({ label: "أقساط ومدفوعات", count: feesCount });
  }

  return {
    allowed: true,
    associations,
    hasAssociations: associations.length > 0,
  };
}
