export const CLASS_CUSTOM_GRADE_VALUE = "__custom_class_grade__";

export type ClassStageValue = "ابتدائية" | "متوسطة" | "إعدادية";
export type ClassTrackValue = "عام" | "علمي" | "أدبي" | "مهني";

export type SelectOption = {
  value: string;
  label: string;
};

export const CLASS_STAGE_OPTIONS: SelectOption[] = [
  { value: "ابتدائية", label: "ابتدائي" },
  { value: "متوسطة", label: "متوسط" },
  { value: "إعدادية", label: "إعدادي" },
];

export const CLASS_TRACK_OPTIONS: SelectOption[] = [
  { value: "عام", label: "عام" },
  { value: "علمي", label: "علمي" },
  { value: "أدبي", label: "أدبي" },
  { value: "مهني", label: "مهني" },
];

const GENERAL_TRACK = CLASS_TRACK_OPTIONS[0];

const STAGE_GRADE_OPTIONS: Record<ClassStageValue, SelectOption[]> = {
  ابتدائية: [
    { value: "الأول", label: "الأول الابتدائي" },
    { value: "الثاني", label: "الثاني الابتدائي" },
    { value: "الثالث", label: "الثالث الابتدائي" },
    { value: "الرابع", label: "الرابع الابتدائي" },
    { value: "الخامس", label: "الخامس الابتدائي" },
    { value: "السادس", label: "السادس الابتدائي" },
  ],
  متوسطة: [
    { value: "الأول", label: "الأول المتوسط" },
    { value: "الثاني", label: "الثاني المتوسط" },
    { value: "الثالث", label: "الثالث المتوسط" },
  ],
  إعدادية: [
    { value: "الرابع", label: "الرابع الإعدادي" },
    { value: "الخامس", label: "الخامس الإعدادي" },
    { value: "السادس", label: "السادس الإعدادي" },
  ],
};

export function isClassStage(value?: string | null): value is ClassStageValue {
  return Boolean(value && CLASS_STAGE_OPTIONS.some((option) => option.value === value));
}

export function isClassTrack(value?: string | null): value is ClassTrackValue {
  return Boolean(value && CLASS_TRACK_OPTIONS.some((option) => option.value === value));
}

export function getClassTrackOptions(stage?: string | null): SelectOption[] {
  if (!stage) return [];

  if (stage === "إعدادية") {
    return CLASS_TRACK_OPTIONS;
  }

  return GENERAL_TRACK ? [GENERAL_TRACK] : [];
}

export function getClassGradeOptions(stage?: string | null): SelectOption[] {
  if (!isClassStage(stage)) return [];
  return STAGE_GRADE_OPTIONS[stage];
}

export function getClassStageLabel(stage?: string | null): string {
  if (!stage) return "غير محدد";
  return CLASS_STAGE_OPTIONS.find((option) => option.value === stage)?.label ?? stage;
}

export function getClassTrackLabel(track?: string | null): string {
  if (!track) return "غير محدد";
  return CLASS_TRACK_OPTIONS.find((option) => option.value === track)?.label ?? track;
}

export function getClassGradeLabel(stage?: string | null, gradeLevel?: string | null): string {
  if (!gradeLevel) return "غير محدد";

  if (stage === "ابتدائية") return `${gradeLevel} الابتدائي`;
  if (stage === "متوسطة") return `${gradeLevel} المتوسط`;
  if (stage === "إعدادية") return `${gradeLevel} الإعدادي`;

  return gradeLevel;
}

export function getClassLevelTrackLabel(input: {
  schoolStage?: string | null;
  gradeLevel?: string | null;
  studyTrack?: string | null;
}): string {
  const { schoolStage, gradeLevel, studyTrack } = input;

  if (!gradeLevel && !studyTrack && !schoolStage) return "";

  if (schoolStage === "إعدادية" && studyTrack && studyTrack !== "عام") {
    return gradeLevel ? `${gradeLevel} ${studyTrack}` : studyTrack;
  }

  if (schoolStage === "إعدادية" && studyTrack === "عام") {
    return gradeLevel ? `${gradeLevel} الإعدادي العام` : "الإعدادي العام";
  }

  if (schoolStage && gradeLevel) {
    return getClassGradeLabel(schoolStage, gradeLevel);
  }

  return gradeLevel || studyTrack || schoolStage || "";
}

export function buildClassDisplayName(input: {
  name?: string | null;
  level?: string | null;
  schoolStage?: string | null;
  gradeLevel?: string | null;
  studyTrack?: string | null;
}): string {
  const structuredName = getClassLevelTrackLabel({
    schoolStage: input.schoolStage,
    gradeLevel: input.gradeLevel,
    studyTrack: input.studyTrack,
  });

  if (structuredName) return structuredName;

  if (input.name && input.level) return `${input.name} - ${input.level}`;
  return input.name || "صف غير معروف";
}

export function buildClassStorageLevel(input: {
  schoolStage?: string | null;
  studyTrack?: string | null;
}): string | null {
  const values = [input.schoolStage, input.studyTrack]
    .map((value) => value?.trim())
    .filter(Boolean);

  return values.length > 0 ? values.join(" - ") : null;
}
