import { type DeleteAssociation, type DeleteCheckResult } from "@/types/student";
import {
  buildSubjectDisplayName,
  getCatalogSubjectOptions,
  getGradeLevelOptions,
  getStudyTrackOptions,
  isSubjectStage,
  isSubjectTrack,
} from "@/lib/subject-catalog";

export type { DeleteAssociation, DeleteCheckResult };

export type Subject = {
  id: string;
  name: string;
  subjectBaseName: string | null;
  schoolStage: string | null;
  gradeLevel: string | null;
  studyTrack: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SubjectFormInput = {
  name?: string;
  catalogSubject?: string;
  customSubjectName?: string;
  schoolStage?: string;
  gradeLevel?: string;
  studyTrack?: string;
  description?: string;
};

export type SubjectRelatedTeacher = {
  id: string;
  fullName: string;
  specialty: string | null;
};

export type SubjectRelatedClass = {
  id: string;
  name: string;
  level: string | null;
};

export type SubjectListItem = {
  id: string;
  name: string;
  subjectBaseName: string | null;
  schoolStage: string | null;
  gradeLevel: string | null;
  studyTrack: string | null;
  description: string | null;
  isActive: boolean;
  teachersCount: number;
  classesCount: number;
  gradesCount: number;
  schedulesCount: number;
  examsCount: number;
  relatedTeachers: SubjectRelatedTeacher[];
  relatedClasses: SubjectRelatedClass[];
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
    catalogSubject: "",
    customSubjectName: "",
    schoolStage: "",
    gradeLevel: "",
    studyTrack: "",
    description: "",
  };
}

function hasStructuredSubjectFields(input: SubjectFormInput): boolean {
  return Boolean(
    input.catalogSubject?.trim() ||
    input.customSubjectName?.trim() ||
    input.schoolStage?.trim() ||
    input.gradeLevel?.trim() ||
    input.studyTrack?.trim(),
  );
}

function resolveSubjectBaseName(input: SubjectFormInput): string {
  return (
    input.customSubjectName?.trim() ||
    input.catalogSubject?.trim() ||
    input.name?.trim() ||
    ""
  );
}

export function normalizeSubjectInput(
  input: SubjectFormInput,
): SubjectFormInput & { subjectBaseName?: string } {
  const subjectBaseName = resolveSubjectBaseName(input);
  const schoolStage = input.schoolStage?.trim() || undefined;
  const gradeLevel = input.gradeLevel?.trim() || undefined;
  const studyTrack = input.studyTrack?.trim() || undefined;
  const shouldBuildDisplayName = Boolean(schoolStage || gradeLevel || studyTrack);
  const displayName = shouldBuildDisplayName
    ? buildSubjectDisplayName({
        baseName: subjectBaseName,
        schoolStage,
        gradeLevel,
        studyTrack,
      })
    : subjectBaseName;

  return {
    name: displayName,
    subjectBaseName,
    catalogSubject: input.catalogSubject?.trim() || undefined,
    customSubjectName: input.customSubjectName?.trim() || undefined,
    schoolStage,
    gradeLevel,
    studyTrack,
    description: input.description?.trim() || undefined,
  };
}

export function validateSubjectInput(
  input: SubjectFormInput,
): SubjectValidationResult {
  const normalized = normalizeSubjectInput(input);
  const errors: Partial<Record<keyof SubjectFormInput, string>> = {};
  const structured = hasStructuredSubjectFields(input);
  const availableTrackValues = getStudyTrackOptions(normalized.schoolStage).map((option) => option.value);
  const availableGradeValues = getGradeLevelOptions(normalized.schoolStage).map((option) => option.value);
  const availableSubjectValues = getCatalogSubjectOptions(
    normalized.schoolStage,
    normalized.studyTrack,
  ).map((option) => option.value);

  if (!normalized.subjectBaseName) {
    errors.catalogSubject = "يجب اختيار المادة أو إضافة مادة خاصة.";
  }

  if (normalized.subjectBaseName && normalized.subjectBaseName.length < 2) {
    errors.catalogSubject = "اسم المادة يجب أن يحتوي على حرفين على الأقل.";
  }

  if (normalized.subjectBaseName && normalized.subjectBaseName.length > 80) {
    errors.catalogSubject = "اسم المادة طويل جدًا.";
  }

  if (normalized.name && normalized.name.length > 140) {
    errors.name = "اسم المادة مع تفاصيلها طويل جدًا.";
  }

  if (structured) {
    if (!normalized.schoolStage) {
      errors.schoolStage = "يجب اختيار المرحلة العامة: ابتدائي، متوسط، أو إعدادي.";
    } else if (!isSubjectStage(normalized.schoolStage)) {
      errors.schoolStage = "المرحلة المختارة غير صحيحة.";
    }

    if (!normalized.studyTrack) {
      errors.studyTrack = "يجب اختيار التخصص: عام، علمي، أو أدبي.";
    } else if (!isSubjectTrack(normalized.studyTrack)) {
      errors.studyTrack = "التخصص المختار غير صحيح.";
    } else if (
      normalized.schoolStage &&
      availableTrackValues.length > 0 &&
      !availableTrackValues.includes(normalized.studyTrack)
    ) {
      errors.studyTrack = "هذا التخصص غير مناسب للمرحلة المختارة.";
    }

    if (!normalized.gradeLevel) {
      errors.gradeLevel = "يجب اختيار الصف/المرحلة الدراسية للمادة.";
    } else if (
      normalized.schoolStage &&
      availableGradeValues.length > 0 &&
      !availableGradeValues.includes(normalized.gradeLevel)
    ) {
      errors.gradeLevel = "الصف المختار غير مناسب للمرحلة العامة.";
    }

    if (
      normalized.catalogSubject &&
      !normalized.customSubjectName &&
      availableSubjectValues.length > 0 &&
      !availableSubjectValues.includes(normalized.catalogSubject)
    ) {
      errors.catalogSubject = "المادة المختارة غير مناسبة للتخصص المحدد.";
    }
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
