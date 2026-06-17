import { type DeleteAssociation, type DeleteCheckResult } from "@/types/student";

export type { DeleteAssociation, DeleteCheckResult };

export type Subject = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SubjectFormInput = {
  name: string;
  description?: string;
};

export type SubjectListItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  teachersCount: number;
  classesCount: number;
  gradesCount: number;
  schedulesCount: number;
  examsCount: number;
  deleteAssociations: DeleteAssociation[];
  createdAt: Date;
};

export type SubjectValidationResult = {
  valid: boolean;
  errors: Partial<Record<keyof SubjectFormInput, string>>;
};

export function getEmptySubjectForm(): SubjectFormInput {
  return {
    name: "",
    description: "",
  };
}

export function normalizeSubjectInput(
  input: SubjectFormInput,
): SubjectFormInput {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
  };
}

export function validateSubjectInput(
  input: SubjectFormInput,
): SubjectValidationResult {
  const normalized = normalizeSubjectInput(input);
  const errors: Partial<Record<keyof SubjectFormInput, string>> = {};

  if (!normalized.name) {
    errors.name = "اسم المادة مطلوب.";
  }

  if (normalized.name && normalized.name.length < 2) {
    errors.name = "اسم المادة يجب أن يحتوي على حرفين على الأقل.";
  }

  if (normalized.name && normalized.name.length > 80) {
    errors.name = "اسم المادة طويل جدًا.";
  }

  if (normalized.description && normalized.description.length > 300) {
    errors.description = "وصف المادة يجب ألا يتجاوز 300 حرف.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function getSubjectDeleteAssociations(subject: {
  teachersCount?: number;
  classesCount?: number;
  gradesCount?: number;
  schedulesCount?: number;
  examsCount?: number;
  teacherDetails?: string[];
  classDetails?: string[];
  scheduleDetails?: string[];
  examDetails?: string[];
  gradeDetails?: string[];
}): DeleteCheckResult {
  const teachersCount = subject.teachersCount ?? 0;
  const classesCount = subject.classesCount ?? 0;
  const gradesCount = subject.gradesCount ?? 0;
  const schedulesCount = subject.schedulesCount ?? 0;
  const examsCount = subject.examsCount ?? 0;

  const associations: DeleteAssociation[] = [];

  if (teachersCount > 0) {
    associations.push({
      label: "المدرسون المرتبطون بالمادة",
      count: teachersCount,
      details: subject.teacherDetails,
    });
  }

  if (classesCount > 0) {
    associations.push({
      label: "الصفوف المرتبطة بالمادة",
      count: classesCount,
      details: subject.classDetails,
    });
  }

  if (schedulesCount > 0) {
    associations.push({
      label: "محاضرات في الجدول",
      count: schedulesCount,
      details: subject.scheduleDetails,
    });
  }

  if (examsCount > 0) {
    associations.push({
      label: "اختبارات مرتبطة",
      count: examsCount,
      details: subject.examDetails,
    });
  }

  if (gradesCount > 0) {
    associations.push({
      label: "درجات مسجلة",
      count: gradesCount,
      details: subject.gradeDetails,
    });
  }

  return {
    allowed: true,
    associations,
    hasAssociations: associations.length > 0,
  };
}
