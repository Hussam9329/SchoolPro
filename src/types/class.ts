import { type DeleteAssociation, type DeleteCheckResult } from "@/types/student";

export type { DeleteAssociation, DeleteCheckResult };

export type SchoolClass = {
  id: string;
  name: string;
  level: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Section = {
  id: string;
  name: string;
  capacity: number | null;
  description: string | null;
  isActive: boolean;
  classId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassFormInput = {
  name: string;
  level?: string;
  description?: string;
};

export type SectionFormInput = {
  name: string;
  capacity?: number | string;
  description?: string;
  classId: string;
};

export type ClassListItem = {
  id: string;
  name: string;
  level: string | null;
  description: string | null;
  isActive: boolean;
  sectionsCount: number;
  studentsCount: number;
  subjectsCount: number;
  schedulesCount: number;
  subjectIds: string[];
  createdAt: Date;
};

export type SectionListItem = {
  id: string;
  name: string;
  capacity: number | null;
  description: string | null;
  isActive: boolean;
  classId: string;
  className: string;
  studentsCount: number;
  schedulesCount: number;
  createdAt: Date;
};

export type ClassDetails = SchoolClass & {
  sections: SectionListItem[];
  subjectsCount: number;
  schedulesCount: number;
  studentsCount: number;
};

export type ClassValidationResult = {
  valid: boolean;
  errors: Partial<Record<keyof ClassFormInput, string>>;
};

export type SectionValidationResult = {
  valid: boolean;
  errors: Partial<Record<keyof SectionFormInput, string>>;
};

export function getEmptyClassForm(): ClassFormInput {
  return {
    name: "",
    level: "",
    description: "",
  };
}

export function getEmptySectionForm(classId = ""): SectionFormInput {
  return {
    name: "",
    capacity: "",
    description: "",
    classId,
  };
}

export function normalizeClassInput(input: ClassFormInput): ClassFormInput {
  return {
    name: input.name.trim(),
    level: input.level?.trim() || undefined,
    description: input.description?.trim() || undefined,
  };
}

export function normalizeSectionInput(
  input: SectionFormInput,
): SectionFormInput {
  const capacityValue =
    typeof input.capacity === "string"
      ? input.capacity.trim()
      : input.capacity;

  return {
    name: input.name.trim(),
    capacity:
      capacityValue === "" || capacityValue === undefined
        ? undefined
        : Number(capacityValue),
    description: input.description?.trim() || undefined,
    classId: input.classId.trim(),
  };
}

export function validateClassInput(
  input: ClassFormInput,
): ClassValidationResult {
  const normalized = normalizeClassInput(input);
  const errors: Partial<Record<keyof ClassFormInput, string>> = {};

  if (!normalized.name) {
    errors.name = "اسم الصف مطلوب.";
  }

  if (normalized.name && normalized.name.length < 2) {
    errors.name = "اسم الصف يجب أن يحتوي على حرفين على الأقل.";
  }

  if (normalized.name && normalized.name.length > 80) {
    errors.name = "اسم الصف طويل جدًا.";
  }

  if (normalized.level && normalized.level.length > 50) {
    errors.level = "المرحلة طويلة جدًا.";
  }

  if (normalized.description && normalized.description.length > 300) {
    errors.description = "وصف الصف يجب ألا يتجاوز 300 حرف.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateSectionInput(
  input: SectionFormInput,
): SectionValidationResult {
  const normalized = normalizeSectionInput(input);
  const errors: Partial<Record<keyof SectionFormInput, string>> = {};

  if (!normalized.classId) {
    errors.classId = "يجب اختيار الصف.";
  }

  if (!normalized.name) {
    errors.name = "اسم الشعبة مطلوب.";
  }

  if (normalized.name && normalized.name.length > 30) {
    errors.name = "اسم الشعبة طويل جدًا.";
  }

  if (
    normalized.capacity !== undefined &&
    (Number.isNaN(Number(normalized.capacity)) || Number(normalized.capacity) < 1)
  ) {
    errors.capacity = "عدد الطلاب المسموح يجب أن يكون رقمًا أكبر من صفر.";
  }

  if (normalized.description && normalized.description.length > 300) {
    errors.description = "وصف الشعبة يجب ألا يتجاوز 300 حرف.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function getClassDisplayName(
  schoolClass: Pick<SchoolClass, "name" | "level">,
): string {
  if (schoolClass.level) {
    return `${schoolClass.name} - ${schoolClass.level}`;
  }

  return schoolClass.name;
}

export function getSectionDisplayName(
  section: Pick<SectionListItem, "name" | "className">,
): string {
  return `${section.className} / شعبة ${section.name}`;
}

export function getClassDeleteAssociations(input: {
  sectionsCount?: number;
  studentsCount?: number;
  subjectsCount?: number;
  schedulesCount?: number;
}): DeleteCheckResult {
  const sectionsCount = input.sectionsCount ?? 0;
  const studentsCount = input.studentsCount ?? 0;
  const subjectsCount = input.subjectsCount ?? 0;
  const schedulesCount = input.schedulesCount ?? 0;

  const associations: DeleteAssociation[] = [];

  if (studentsCount > 0) {
    associations.push({ label: "طلاب داخل الشُعب", count: studentsCount });
  }

  if (schedulesCount > 0) {
    associations.push({ label: "محاضرات في الجدول", count: schedulesCount });
  }

  if (subjectsCount > 0) {
    associations.push({ label: "مواد دراسية مرتبطة", count: subjectsCount });
  }

  if (sectionsCount > 0) {
    associations.push({ label: "شُعب داخل الصف", count: sectionsCount });
  }

  return {
    allowed: true,
    associations,
    hasAssociations: associations.length > 0,
  };
}

export function getSectionDeleteAssociations(input: {
  studentsCount?: number;
  schedulesCount?: number;
}): DeleteCheckResult {
  const studentsCount = input.studentsCount ?? 0;
  const schedulesCount = input.schedulesCount ?? 0;

  const associations: DeleteAssociation[] = [];

  if (studentsCount > 0) {
    associations.push({ label: "طلاب داخل الشعبة", count: studentsCount });
  }

  if (schedulesCount > 0) {
    associations.push({ label: "محاضرات في الجدول", count: schedulesCount });
  }

  return {
    allowed: true,
    associations,
    hasAssociations: associations.length > 0,
  };
}
