"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw, Search } from "lucide-react";
import {
  CLASS_CUSTOM_GRADE_VALUE,
  CLASS_STAGE_OPTIONS,
  getClassGradeOptions,
  getClassTrackOptions,
} from "@/lib/class-catalog";
import { getClassDisplayName, type ClassListItem, type SectionListItem } from "@/types/class";

type ClassCreateFieldsProps = {
  draft?: {
    schoolStage?: string;
    gradeLevel?: string;
    studyTrack?: string;
    customGradeName?: string;
  };
};

export function ClassCreateFields({ draft }: ClassCreateFieldsProps) {
  const initialStage = draft?.schoolStage ?? "";
  const [stage, setStage] = useState(initialStage);
  const trackOptions = useMemo(() => getClassTrackOptions(stage), [stage]);
  const gradeOptions = useMemo(() => getClassGradeOptions(stage), [stage]);
  const [track, setTrack] = useState(draft?.studyTrack || trackOptions[0]?.value || "");
  const [grade, setGrade] = useState(draft?.gradeLevel ?? "");

  const handleStageChange = (value: string) => {
    const nextTracks = getClassTrackOptions(value);
    setStage(value);
    setTrack(nextTracks[0]?.value ?? "");
    setGrade("");
  };

  const showCustomGrade = grade === CLASS_CUSTOM_GRADE_VALUE || Boolean(draft?.customGradeName);

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <label htmlFor="class-school-stage" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
            المرحلة الدراسية <span className="text-red-600">*</span>
          </label>
          <select
            id="class-school-stage"
            name="schoolStage"
            required
            className="input"
            value={stage}
            onChange={(event) => handleStageChange(event.target.value)}
          >
            <option value="" disabled>اختر المرحلة</option>
            {CLASS_STAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="class-study-track" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
            التخصص <span className="text-red-600">*</span>
          </label>
          <select
            id="class-study-track"
            name="studyTrack"
            required
            className="input"
            value={track}
            onChange={(event) => setTrack(event.target.value)}
            disabled={!stage || trackOptions.length === 0}
          >
            <option value="" disabled>اختر التخصص</option>
            {trackOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {stage && stage !== "إعدادية" ? (
            <p className="mt-2 text-xs font-bold text-teal-700">هذه المرحلة عامة تلقائيًا.</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="class-grade-level" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
            اسم الصف <span className="text-red-600">*</span>
          </label>
          <select
            id="class-grade-level"
            name="gradeLevel"
            required
            className="input"
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            disabled={!stage || gradeOptions.length === 0}
          >
            <option value="" disabled>اختر الصف</option>
            {gradeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
            <option value={CLASS_CUSTOM_GRADE_VALUE}>+ إضافة صف خاص</option>
          </select>
        </div>
      </div>

      {showCustomGrade ? (
        <div>
          <label htmlFor="class-custom-grade" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
            اسم الصف الخاص
          </label>
          <input
            id="class-custom-grade"
            name="customGradeName"
            autoComplete="off"
            minLength={2}
            maxLength={80}
            placeholder="مثال: تمهيدي، دورات خاصة، معهد مهني..."
            className="input"
            defaultValue={draft?.customGradeName ?? ""}
          />
        </div>
      ) : null}
    </div>
  );
}

type Filters = {
  stage?: string;
  track?: string;
  classId?: string;
  sectionId?: string;
};

type ClassFilterControlsProps = {
  classes: ClassListItem[];
  sections: SectionListItem[];
  filters: Filters;
};

export function ClassFilterControls({ classes, sections, filters }: ClassFilterControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [stage, setStage] = useState(filters.stage ?? "");
  const [track, setTrack] = useState(filters.track ?? "");
  const [classId, setClassId] = useState(filters.classId ?? "");
  const [sectionId, setSectionId] = useState(filters.sectionId ?? "");

  const stageOptions = useMemo(() => {
    const values = Array.from(new Set(classes.map((schoolClass) => schoolClass.schoolStage).filter(Boolean)));
    return CLASS_STAGE_OPTIONS.filter((option) => values.includes(option.value));
  }, [classes]);

  const trackOptions = useMemo(() => {
    const values = Array.from(new Set(
      classes
        .filter((schoolClass) => !stage || schoolClass.schoolStage === stage)
        .map((schoolClass) => schoolClass.studyTrack)
        .filter(Boolean),
    ));
    return values.map((value) => ({ value: value as string, label: value as string }));
  }, [classes, stage]);

  const filteredClasses = useMemo(() => classes.filter((schoolClass) => {
    if (stage && schoolClass.schoolStage !== stage) return false;
    if (track && schoolClass.studyTrack !== track) return false;
    return true;
  }), [classes, stage, track]);

  const filteredSections = useMemo(() => sections.filter((section) => {
    if (stage && section.schoolStage !== stage) return false;
    if (track && section.studyTrack !== track) return false;
    if (classId && section.classId !== classId) return false;
    return true;
  }), [sections, stage, track, classId]);

  const applyFilters = (next: Filters) => {
    const params = new URLSearchParams();
    if (next.stage) params.set("stage", next.stage);
    if (next.track) params.set("track", next.track);
    if (next.classId) params.set("classId", next.classId);
    if (next.sectionId) params.set("sectionId", next.sectionId);

    startTransition(() => {
      router.replace(params.toString() ? `/classes?${params.toString()}` : "/classes", { scroll: false });
    });
  };

  const updateStage = (value: string) => {
    setStage(value);
    setTrack("");
    setClassId("");
    setSectionId("");
    applyFilters({ stage: value });
  };

  const updateTrack = (value: string) => {
    setTrack(value);
    setClassId("");
    setSectionId("");
    applyFilters({ stage, track: value });
  };

  const updateClass = (value: string) => {
    setClassId(value);
    setSectionId("");
    applyFilters({ stage, track, classId: value });
  };

  const updateSection = (value: string) => {
    setSectionId(value);
    applyFilters({ stage, track, classId, sectionId: value });
  };

  const reset = () => {
    setStage("");
    setTrack("");
    setClassId("");
    setSectionId("");
    applyFilters({});
  };

  return (
    <section className="app-card overflow-hidden">
      <div className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/40 to-sky-50/20 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm ring-1 ring-teal-100">
            <Search size={20} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-[var(--app-text)]">بحث مخصص بدون كتابة</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
              اختر المرحلة ثم التخصص، وبعدها تظهر الصفوف والشُعب المطابقة مباشرة.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="filter-stage" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">المرحلة</label>
            <select id="filter-stage" className="input" value={stage} onChange={(event) => updateStage(event.target.value)}>
              <option value="">كل المراحل</option>
              {stageOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-track" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">التخصص</label>
            <select id="filter-track" className="input" value={track} onChange={(event) => updateTrack(event.target.value)} disabled={trackOptions.length === 0}>
              <option value="">كل التخصصات</option>
              {trackOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-class" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">الصف</label>
            <select id="filter-class" className="input" value={classId} onChange={(event) => updateClass(event.target.value)} disabled={filteredClasses.length === 0}>
              <option value="">كل الصفوف</option>
              {filteredClasses.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>{getClassDisplayName(schoolClass)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-section" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">الشعبة</label>
            <select id="filter-section" className="input" value={sectionId} onChange={(event) => updateSection(event.target.value)} disabled={filteredSections.length === 0}>
              <option value="">كل الشُعب</option>
              {filteredSections.map((section) => (
                <option key={section.id} value={section.id}>{section.className} / شعبة {section.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={17} />
            <span>النتائج الحالية: {filteredClasses.length} صف / {filteredSections.length} شعبة</span>
            {isPending ? <span className="badge badge-info">جارٍ التحديث...</span> : null}
          </div>

          <button type="button" onClick={reset} className="btn btn-secondary justify-center">
            <RotateCcw size={16} />
            تصفير البحث
          </button>
        </div>
      </div>
    </section>
  );
}

type SectionNameSelectProps = {
  defaultValue?: string;
};

export function SectionNameSelect({ defaultValue }: SectionNameSelectProps) {
  const [value, setValue] = useState(defaultValue || "");
  const showCustom = value === "__custom_section__";
  const sectionOptions = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];

  return (
    <div>
      <label htmlFor="section-name" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
        اسم الشعبة <span className="text-red-600">*</span>
      </label>
      <select
        id="section-name"
        name={showCustom ? undefined : "name"}
        required={!showCustom}
        className="input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      >
        <option value="" disabled>اختر الشعبة</option>
        {sectionOptions.map((option) => (
          <option key={option} value={option}>شعبة {option}</option>
        ))}
        <option value="__custom_section__">+ إضافة شعبة خاصة</option>
      </select>

      {showCustom ? (
        <div className="mt-3">
          <label htmlFor="section-custom-name" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
            اسم الشعبة الخاصة
          </label>
          <input
            id="section-custom-name"
            name="name"
            autoComplete="off"
            required
            maxLength={30}
            placeholder="مثال: المختبر، متقدم، أ1..."
            className="input"
          />
        </div>
      ) : null}
    </div>
  );
}
