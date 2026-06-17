import { type DeleteAssociation, type DeleteCheckResult } from "@/types/student";
import {
  CLASS_CUSTOM_GRADE_VALUE,
  buildClassDisplayName,
  buildClassStorageLevel,
  getClassGradeOptions,
  getClassTrackOptions,
  isClassStage,
  isClassTrack,
} from "@/lib/class-catalog";

export type { DeleteAssociation, DeleteCheckResult };

export type SchoolClass = {
  id: string;
  name: string;
  level: string | null;
  schoolStage: string | null;
  gradeLevel: string | null;
  studyTrack: string | null;
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
  name?: string;
  level?: string;
  schoolStage?: string;
  gradeLevel?: string;
  studyTrack?: string;
  customGradeName?: string;
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
  schoolStage: string | null;
  gradeLevel: string | null;
  studyTrack: string | null;
  description: string | null;
  isActive: boolean;
  sectionsCount: number;
  studentsCount: number;
  subjectsCount: number;
  schedulesCount: number;
  subjectIds: string[];
  sectionDetails: string[];
  studentDetails: string[];
  teacherDetails: string[];
  subjectDetails: string[];
  scheduleDetails: string[];
  deleteAssociations: DeleteAssociation[];
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
  classLevel: string | null;
  schoolStage: string | null;
  gradeLevel: string | null;
  studyTrack: string | null;
  studentsCount: number;
  schedulesCount: number;
  studentDetails: string[];
  teacherDetails: string[];
  subjectDetails: string[];
  scheduleDetails: string[];
  deleteAssociations: DeleteAssociation[];
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
    schoolStage: "",
    gradeLevel: "",
    studyTrack: "",
    customGradeName: "",
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

function hasStructuredClassFields(input: ClassFormInput): boolean {
  return Boolean(
    input.schoolStage?.trim() ||
      input.gradeLevel?.trim() ||
      input.studyTrack?.trim() ||
      input.customGradeName?.trim(),
  );
}

function resolveClassGradeName(input: ClassFormInput): string {
  const selectedGrade = input.gradeLevel?.trim();
  const catalogGrade = selectedGrade && selectedGrade !== CLASS_CUSTOM_GRADE_VALUE ? selectedGrade : "";

  return (
    input.customGradeName?.trim() ||
    catalogGrade ||
    input.name?.trim() ||
    ""
  );
}

export function normalizeClassInput(input: ClassFormInput): ClassFormInput {
  const schoolStage = input.schoolStage?.trim() || undefined;
  const gradeLevel = resolveClassGradeName(input) || undefined;
  const studyTrack = input.studyTrack?.trim() || undefined;
  const structured = Boolean(schoolStage || gradeLevel || studyTrack || input.customGradeName?.trim());

  return {
    name: gradeLevel || input.name?.trim() || "",
    level: structured
      ? buildClassStorageLevel({ schoolStage, studyTrack }) || undefined
      : input.level?.trim() || undefined,
    schoolStage,
    gradeLevel,
    studyTrack,
    customGradeName: input.customGradeName?.trim() || undefined,
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
  const structured = hasStructuredClassFields(input);
  const availableTrackValues = getClassTrackOptions(normalized.schoolStage).map((option) => option.value);
  const availableGradeValues = getClassGradeOptions(normalized.schoolStage).map((option) => option.value);

  if (!normalized.name) {
    errors.gradeLevel = "اسم الصف مطلوب.";
  }

  if (normalized.name && normalized.name.length < 2) {
    errors.gradeLevel = "اسم الصف يجب أن يحتوي على حرفين على الأقل.";
  }

  if (normalized.name && normalized.name.length > 80) {
    errors.gradeLevel = "اسم الصف طويل جدًا.";
  }

  if (structured) {
    if (!normalized.schoolStage) {
      errors.schoolStage = "يجب اختيار المرحلة الدراسية: ابتدائي، متوسط، أو إعدادي.";
    } else if (!isClassStage(normalized.schoolStage)) {
      errors.schoolStage = "المرحلة المختارة غير صحيحة.";
    }

    if (!normalized.studyTrack) {
      errors.studyTrack = "يجب اختيار التخصص: عام، علمي، أدبي، أو مهني.";
    } else if (!isClassTrack(normalized.studyTrack)) {
      errors.studyTrack = "التخصص المختار غير صحيح.";
    } else if (
      normalized.schoolStage &&
      availableTrackValues.length > 0 &&
      !availableTrackValues.includes(normalized.studyTrack)
    ) {
      errors.studyTrack = "هذا التخصص غير مناسب للمرحلة المختارة.";
    }

    if (!normalized.gradeLevel) {
      errors.gradeLevel = "يجب اختيار اسم الصف أو إضافة صف خاص.";
    } else if (
      normalized.schoolStage &&
      normalized.gradeLevel &&
      !normalized.customGradeName &&
      availableGradeValues.length > 0 &&
      !availableGradeValues.includes(normalized.gradeLevel)
    ) {
      errors.gradeLevel = "الصف المختار غير مناسب للمرحلة الدراسية.";
    }
  } else if (normalized.level && normalized.level.length > 80) {
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
  schoolClass: Pick<SchoolClass, "name" | "level" | "schoolStage" | "gradeLevel" | "studyTrack">,
): string {
  return buildClassDisplayName(schoolClass);
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
  sectionDetails?: string[];
  studentDetails?: string[];
  subjectDetails?: string[];
  teacherDetails?: string[];
  scheduleDetails?: string[];
}): DeleteCheckResult {
  const sectionsCount = input.sectionsCount ?? 0;
  const studentsCount = input.studentsCount ?? 0;
  const subjectsCount = input.subjectsCount ?? 0;
  const schedulesCount = input.schedulesCount ?? 0;
  const teachersCount = input.teacherDetails?.length ?? 0;

  const associations: DeleteAssociation[] = [];

  if (studentsCount > 0) {
    associations.push({ label: "طلاب داخل الشُعب", count: studentsCount, details: input.studentDetails });
  }

  if (teachersCount > 0) {
    associations.push({ label: "مدرسون مرتبطون بالشُعب", count: teachersCount, details: input.teacherDetails });
  }

  if (schedulesCount > 0) {
    associations.push({ label: "محاضرات في الجدول", count: schedulesCount, details: input.scheduleDetails });
  }

  if (subjectsCount > 0) {
    associations.push({ label: "مواد دراسية مرتبطة", count: subjectsCount, details: input.subjectDetails });
  }

  if (sectionsCount > 0) {
    associations.push({ label: "شُعب داخل الصف", count: sectionsCount, details: input.sectionDetails });
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
  studentDetails?: string[];
  teacherDetails?: string[];
  subjectDetails?: string[];
  scheduleDetails?: string[];
}): DeleteCheckResult {
  const studentsCount = input.studentsCount ?? 0;
  const schedulesCount = input.schedulesCount ?? 0;
  const teachersCount = input.teacherDetails?.length ?? 0;
  const subjectsCount = input.subjectDetails?.length ?? 0;

  const associations: DeleteAssociation[] = [];

  if (studentsCount > 0) {
    associations.push({ label: "طلاب داخل الشعبة", count: studentsCount, details: input.studentDetails });
  }

  if (teachersCount > 0) {
    associations.push({ label: "مدرسون مرتبطون بالشعبة", count: teachersCount, details: input.teacherDetails });
  }

  if (subjectsCount > 0) {
    associations.push({ label: "مواد تظهر في جدول الشعبة", count: subjectsCount, details: input.subjectDetails });
  }

  if (schedulesCount > 0) {
    associations.push({ label: "محاضرات في الجدول", count: schedulesCount, details: input.scheduleDetails });
  }

  return {
    allowed: true,
    associations,
    hasAssociations: associations.length > 0,
  };
}
