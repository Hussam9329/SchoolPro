export const SUBJECT_CUSTOM_OPTION_VALUE = "__custom_subject__";

export type SubjectStageValue = "ابتدائية" | "متوسطة" | "إعدادية";
export type SubjectTrackValue = "عام" | "علمي" | "أدبي" | "مهني";

export type SelectOption = {
  value: string;
  label: string;
};

export const SUBJECT_STAGE_OPTIONS: SelectOption[] = [
  { value: "ابتدائية", label: "ابتدائي" },
  { value: "متوسطة", label: "متوسط" },
  { value: "إعدادية", label: "إعدادي" },
];

export const STUDY_TRACK_OPTIONS: SelectOption[] = [
  { value: "عام", label: "عام" },
  { value: "علمي", label: "علمي" },
  { value: "أدبي", label: "أدبي" },
  { value: "مهني", label: "مهني" },
];

const GENERAL_TRACK_OPTION = STUDY_TRACK_OPTIONS[0];

const STAGE_GRADE_OPTIONS: Record<SubjectStageValue, SelectOption[]> = {
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

const GENERAL_SUBJECTS = [
  "اللغة العربية",
  "اللغة الإنكليزية",
  "الرياضيات",
  "العلوم",
  "التربية الإسلامية",
  "الاجتماعيات",
  "الحاسوب",
  "التربية الفنية",
  "التربية الرياضية",
];

const PREPARATORY_GENERAL_SUBJECTS = [
  "اللغة العربية",
  "اللغة الإنكليزية",
  "الرياضيات",
  "التربية الإسلامية",
  "الحاسوب",
  "التربية الوطنية",
];

const SCIENTIFIC_SUBJECTS = [
  "الفيزياء",
  "الكيمياء",
  "الأحياء",
  "الرياضيات",
  "اللغة العربية",
  "اللغة الإنكليزية",
  "التربية الإسلامية",
  "الحاسوب",
];

const LITERARY_SUBJECTS = [
  "اللغة العربية",
  "اللغة الإنكليزية",
  "التاريخ",
  "الجغرافية",
  "الاقتصاد",
  "علم الاجتماع",
  "التربية الإسلامية",
  "الحاسوب",
];

const VOCATIONAL_SUBJECTS = [
  "التدريب المهني",
  "الرسم الصناعي",
  "السلامة المهنية",
  "الحاسوب",
  "الرياضيات التطبيقية",
  "اللغة العربية",
  "اللغة الإنكليزية",
];

const TRACK_SUBJECTS: Record<SubjectTrackValue, string[]> = {
  عام: GENERAL_SUBJECTS,
  علمي: SCIENTIFIC_SUBJECTS,
  أدبي: LITERARY_SUBJECTS,
  مهني: VOCATIONAL_SUBJECTS,
};

export function isSubjectStage(value: string): value is SubjectStageValue {
  return SUBJECT_STAGE_OPTIONS.some((option) => option.value === value);
}

export function isSubjectTrack(value: string): value is SubjectTrackValue {
  return STUDY_TRACK_OPTIONS.some((option) => option.value === value);
}

export function getStudyTrackOptions(stage?: string): SelectOption[] {
  if (!stage) return [];

  if (stage === "إعدادية") {
    return STUDY_TRACK_OPTIONS;
  }

  return GENERAL_TRACK_OPTION ? [GENERAL_TRACK_OPTION] : [];
}

export function getGradeLevelOptions(stage?: string): SelectOption[] {
  if (!stage || !isSubjectStage(stage)) return [];
  return STAGE_GRADE_OPTIONS[stage];
}

export function getCatalogSubjectOptions(stage?: string, track?: string): SelectOption[] {
  if (!track || !isSubjectTrack(track)) return [];

  const subjects = stage === "إعدادية" && track === "عام"
    ? PREPARATORY_GENERAL_SUBJECTS
    : TRACK_SUBJECTS[track];

  return Array.from(new Set(subjects)).map((subject) => ({
    value: subject,
    label: subject,
  }));
}

export function getStageLabel(stage?: string | null): string {
  if (!stage) return "غير محدد";
  return SUBJECT_STAGE_OPTIONS.find((option) => option.value === stage)?.label ?? stage;
}

export function getTrackLabel(track?: string | null): string {
  if (!track) return "غير محدد";
  return STUDY_TRACK_OPTIONS.find((option) => option.value === track)?.label ?? track;
}

export function getGradeStageLabel(stage?: string | null, gradeLevel?: string | null): string {
  if (!stage || !gradeLevel) return gradeLevel || "غير محدد";

  const suffix: Record<string, string> = {
    ابتدائية: "الابتدائي",
    متوسطة: "المتوسط",
    إعدادية: "الإعدادي",
  };

  return `${gradeLevel} ${suffix[stage] ?? stage}`;
}

export function getSubjectLevelTrackLabel(
  stage?: string | null,
  gradeLevel?: string | null,
  track?: string | null,
): string {
  if (!gradeLevel && !track && !stage) return "";

  if (track === "علمي") {
    return gradeLevel ? `${gradeLevel} العلمي` : "العلمي";
  }

  if (track === "أدبي") {
    return gradeLevel ? `${gradeLevel} الأدبي` : "الأدبي";
  }

  if (track === "مهني") {
    return gradeLevel ? `${gradeLevel} المهني` : "المهني";
  }

  if (stage && gradeLevel) {
    return `${getGradeStageLabel(stage, gradeLevel)} العام`;
  }

  if (gradeLevel) return `${gradeLevel} العام`;
  return track || stage || "";
}

export function buildSubjectDisplayName(input: {
  baseName: string;
  schoolStage?: string | null;
  gradeLevel?: string | null;
  studyTrack?: string | null;
}): string {
  const baseName = input.baseName.trim();
  const details = getSubjectLevelTrackLabel(
    input.schoolStage,
    input.gradeLevel,
    input.studyTrack,
  );

  if (!details) return baseName;
  return `${baseName} - ${details}`;
}
