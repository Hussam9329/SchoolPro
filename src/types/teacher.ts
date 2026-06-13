import { IRAQI_PHONE_REGEX, validateQuadrupleName } from "@/lib/validators";
import { type DeleteAssociation, type DeleteCheckResult } from "@/types/student";

export type { DeleteAssociation, DeleteCheckResult };

export type Teacher = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  specialty: string | null;
  salary: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type TeacherFormInput = {
  fullName: string;
  phone: string;
  subjectIds: string[];
  sectionIds?: string[];
};

export type TeacherListItem = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  specialty: string | null;
  salary: number | null;
  notes: string | null;
  isActive: boolean;
  subjects: {
    id: string;
    name: string;
  }[];
  sections: {
    id: string;
    name: string;
    className: string;
  }[];
  subjectsCount: number;
  schedulesCount: number;
  gradesCount: number;
  examsCount: number;
  createdAt: Date;
};

export type TeacherDetails = Teacher & {
  subjects: {
    id: string;
    name: string;
  }[];
  subjectsCount: number;
  schedulesCount: number;
  gradesCount: number;
  examsCount: number;
};

export type TeacherValidationResult = {
  valid: boolean;
  errors: Partial<Record<keyof TeacherFormInput, string>>;
};

export type TeacherStatus = "active" | "inactive";

export function getEmptyTeacherForm(): TeacherFormInput {
  return {
    fullName: "",
    phone: "",
    subjectIds: [],
    sectionIds: [],
  };
}

export function normalizeTeacherInput(
  input: TeacherFormInput,
): TeacherFormInput {
  return {
    fullName: input.fullName.trim(),
    phone: input.phone?.trim() || "",
    subjectIds: Array.isArray(input.subjectIds)
      ? input.subjectIds.filter(Boolean)
      : [],
    sectionIds: Array.isArray(input.sectionIds)
      ? input.sectionIds.filter(Boolean)
      : [],
  };
}

export function validateTeacherInput(
  input: TeacherFormInput,
): TeacherValidationResult {
  const normalized = normalizeTeacherInput(input);
  const errors: Partial<Record<keyof TeacherFormInput, string>> = {};

  if (!normalized.fullName) {
    errors.fullName = "اسم المدرس مطلوب.";
  } else if (!validateQuadrupleName(normalized.fullName)) {
    errors.fullName = "الاسم لا يجب أن يحتوي على أرقام.";
  }

  if (!normalized.phone) {
    errors.phone = "رقم هاتف المدرس يجب أن يتكون من 11 رقم ويبدأ بـ 07.";
  } else if (!IRAQI_PHONE_REGEX.test(normalized.phone)) {
    errors.phone = "رقم هاتف المدرس يجب أن يتكون من 11 رقم ويبدأ بـ 07.";
  }

  if (!normalized.subjectIds || normalized.subjectIds.length === 0) {
    errors.subjectIds = "يجب اختيار المادة التي يدرّسها المدرس.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function getTeacherStatus(
  teacher: Pick<Teacher, "isActive">,
): TeacherStatus {
  return teacher.isActive ? "active" : "inactive";
}

export function getTeacherStatusLabel(status: TeacherStatus): string {
  const labels: Record<TeacherStatus, string> = {
    active: "فعّال",
    inactive: "متوقف",
  };

  return labels[status];
}

export function getTeacherStatusBadgeClass(status: TeacherStatus): string {
  return status === "active" ? "badge-success" : "badge-warning";
}

export function getTeacherDisplayName(
  teacher: Pick<Teacher, "fullName" | "specialty">,
): string {
  if (teacher.specialty) {
    return `${teacher.fullName} - ${teacher.specialty}`;
  }

  return teacher.fullName;
}

export function formatTeacherSalary(salary?: number | null): string {
  if (salary === null || salary === undefined) {
    return "غير محدد";
  }

  return new Intl.NumberFormat("ar-IQ-u-nu-latn").format(salary);
}

export function formatTeacherSubjects(
  subjects: {
    name: string;
  }[],
): string {
  if (subjects.length === 0) {
    return "لا توجد مواد مرتبطة";
  }

  return subjects
    .map((subject) => subject.name)
    .join("، ");
}

export function getTeacherDeleteAssociations(input: {
  schedulesCount?: number;
  teacherSubjectsCount?: number;
  teacherSectionsCount?: number;
  gradesCount?: number;
  examsCount?: number;
}): DeleteCheckResult {
  const schedulesCount = input.schedulesCount ?? 0;
  const teacherSubjectsCount = input.teacherSubjectsCount ?? 0;
  const teacherSectionsCount = input.teacherSectionsCount ?? 0;
  const gradesCount = input.gradesCount ?? 0;
  const examsCount = input.examsCount ?? 0;

  const associations: DeleteAssociation[] = [];

  if (gradesCount > 0) {
    associations.push({ label: "درجات طلاب", count: gradesCount });
  }

  if (examsCount > 0) {
    associations.push({ label: "امتحانات", count: examsCount });
  }

  if (schedulesCount > 0) {
    associations.push({ label: "محاضرات في الجدول", count: schedulesCount });
  }

  if (teacherSubjectsCount > 0) {
    associations.push({ label: "ربط بمواد دراسية", count: teacherSubjectsCount });
  }

  if (teacherSectionsCount > 0) {
    associations.push({ label: "ربط بشُعب دراسية", count: teacherSectionsCount });
  }

  return {
    allowed: true,
    associations,
    hasAssociations: associations.length > 0,
  };
}
