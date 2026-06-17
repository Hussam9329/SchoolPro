"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  SUBJECT_CUSTOM_OPTION_VALUE,
  SUBJECT_STAGE_OPTIONS,
  buildSubjectDisplayName,
  getCatalogSubjectOptions,
  getGradeLevelOptions,
  getStageLabel,
  getStudyTrackOptions,
  getSubjectLevelTrackLabel,
  getTrackLabel,
} from "@/lib/subject-catalog";

export type SubjectSearchItem = {
  id: string;
  name: string;
  subjectBaseName: string | null;
  schoolStage: string | null;
  gradeLevel: string | null;
  studyTrack: string | null;
  description: string | null;
  teachersCount: number;
  classesCount: number;
};

type SubjectAction = (formData: FormData) => void | Promise<void>;

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .trim();
}

function getSubjectSearchText(subject: SubjectSearchItem): string {
  return normalizeSearchText(
    [
      subject.name,
      subject.subjectBaseName,
      subject.schoolStage,
      subject.gradeLevel,
      subject.studyTrack,
      subject.description,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

type SubjectLiveSearchProps = {
  query: string;
  subjects: SubjectSearchItem[];
};

export function SubjectLiveSearch({ query, subjects }: SubjectLiveSearchProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(query);
  const [isFocused, setIsFocused] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSearchValue(query);
  }, [query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(window.location.search);
        const nextValue = searchValue.trim();

        if (nextValue) {
          params.set("q", nextValue);
        } else {
          params.delete("q");
        }

        params.delete("saved");
        params.delete("deleted");
        params.delete("error");
        params.delete("reason");

        const queryString = params.toString();
        router.replace(queryString ? `/subjects?${queryString}` : "/subjects", {
          scroll: false,
        });
      });
    }, 260);

    return () => window.clearTimeout(timeout);
  }, [router, searchValue]);

  const filteredSubjects = useMemo(() => {
    const normalized = normalizeSearchText(searchValue);

    if (!normalized) return subjects.slice(0, 8);

    return subjects
      .filter((subject) => getSubjectSearchText(subject).includes(normalized))
      .slice(0, 8);
  }, [searchValue, subjects]);

  function selectSuggestion(subject: SubjectSearchItem) {
    setSearchValue(subject.name);
    setIsFocused(false);
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      params.set("q", subject.name);
      params.delete("saved");
      params.delete("deleted");
      params.delete("error");
      params.delete("reason");
      router.replace(`/subjects?${params.toString()}`, { scroll: false });
    });
  }

  function clearSearch() {
    setSearchValue("");
    setIsFocused(false);
    startTransition(() => router.replace("/subjects", { scroll: false }));
  }

  const showDropdown = isFocused && subjects.length > 0;

  return (
    <section className="app-card overflow-visible p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-extrabold text-teal-700">
            <SlidersHorizontal size={17} />
            بحث حي بدون Enter
          </div>
          <h3 className="mt-1 text-xl font-extrabold text-[var(--app-text)]">
            ابحث في المواد مباشرة
          </h3>
          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            اكتب اسم المادة، المرحلة، التخصص، أو الصف وستظهر النتائج أثناء الكتابة.
          </p>
        </div>

        <span className="badge badge-info">
          {isPending ? "جاري تحديث النتائج..." : `${subjects.length} مادة محفوظة`}
        </span>
      </div>

      <div className="relative">
        <Search
          size={20}
          className="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 text-[var(--app-text-soft)]"
        />

        <input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 140)}
          placeholder="مثال: الفيزياء، السادس العلمي، متوسط عام..."
          className="input h-14 pr-12 pl-12 text-base font-bold"
          autoComplete="off"
        />

        {searchValue ? (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
            aria-label="مسح البحث"
          >
            <X size={18} />
          </button>
        ) : null}

        {showDropdown ? (
          <div className="absolute inset-x-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-3xl border border-[var(--app-border-soft)] bg-white shadow-[var(--shadow-card)] dark:bg-[var(--app-card)]">
            {filteredSubjects.length > 0 ? (
              <div className="max-h-80 overflow-auto p-2">
                {filteredSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSuggestion(subject)}
                    className="flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-right transition hover:bg-teal-50 dark:hover:bg-teal-950/30"
                  >
                    <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-sky-100 text-teal-700">
                      <BookOpen size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-[var(--app-text)]">
                        {subject.name}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1 text-xs font-bold text-[var(--app-text-muted)]">
                        <span>{getStageLabel(subject.schoolStage)}</span>
                        <span>•</span>
                        <span>{getTrackLabel(subject.studyTrack)}</span>
                        <span>•</span>
                        <span>مدرسين: {subject.teachersCount}</span>
                        <span>•</span>
                        <span>صفوف: {subject.classesCount}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-5 text-sm font-bold text-[var(--app-text-muted)]">
                لا توجد مواد مطابقة حتى الآن.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

type SubjectCreateFormClientProps = {
  action: SubjectAction;
};

export function SubjectCreateFormClient({ action }: SubjectCreateFormClientProps) {
  const [schoolStage, setSchoolStage] = useState("");
  const [studyTrack, setStudyTrack] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [catalogSubject, setCatalogSubject] = useState("");
  const [customSubjectName, setCustomSubjectName] = useState("");

  const trackOptions = useMemo(() => getStudyTrackOptions(schoolStage), [schoolStage]);
  const gradeOptions = useMemo(() => getGradeLevelOptions(schoolStage), [schoolStage]);
  const subjectOptions = useMemo(
    () => getCatalogSubjectOptions(schoolStage, studyTrack),
    [schoolStage, studyTrack],
  );
  const isCustomSubject = catalogSubject === SUBJECT_CUSTOM_OPTION_VALUE;
  const resolvedBaseName = isCustomSubject ? customSubjectName : catalogSubject;
  const finalDisplayName = resolvedBaseName
    ? buildSubjectDisplayName({
        baseName: resolvedBaseName,
        schoolStage,
        gradeLevel,
        studyTrack,
      })
    : "";
  const displayPreview = finalDisplayName || "سيظهر الاسم النهائي هنا بعد اختيار البيانات";
  const levelTrackPreview = getSubjectLevelTrackLabel(schoolStage, gradeLevel, studyTrack);

  useEffect(() => {
    const isSelectedTrackAvailable = trackOptions.some((option) => option.value === studyTrack);

    if (!studyTrack || !isSelectedTrackAvailable) {
      setStudyTrack(trackOptions[0]?.value ?? "");
    }
  }, [studyTrack, trackOptions]);

  useEffect(() => {
    const isSelectedGradeAvailable = gradeOptions.some((option) => option.value === gradeLevel);
    if (gradeLevel && !isSelectedGradeAvailable) {
      setGradeLevel("");
    }
  }, [gradeLevel, gradeOptions]);

  useEffect(() => {
    const isSelectedSubjectAvailable = subjectOptions.some((option) => option.value === catalogSubject);
    if (catalogSubject && catalogSubject !== SUBJECT_CUSTOM_OPTION_VALUE && !isSelectedSubjectAvailable) {
      setCatalogSubject("");
    }
  }, [catalogSubject, subjectOptions]);

  function enableCustomSubject() {
    setCatalogSubject(SUBJECT_CUSTOM_OPTION_VALUE);
  }

  return (
    <form
      id="subject-form"
      action={action}
      className="app-card overflow-hidden"
    >
      <div className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/40 to-sky-50/20 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-sky-100 text-teal-700">
            <BookOpen size={23} />
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-[var(--app-text)]">
              إضافة مادة دراسية منظمة
            </h3>

            <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
              اختر المرحلة والتخصص أولًا، ثم اختر المادة من القائمة أو أضف مادة خاصة.
            </p>
          </div>
        </div>
      </div>

      <input type="hidden" name="name" value={finalDisplayName} />

      <div className="grid gap-5 p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="schoolStage"
              className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
            >
              المرحلة العامة <span className="text-red-600">*</span>
            </label>

            <select
              id="schoolStage"
              name="schoolStage"
              required
              className="input"
              value={schoolStage}
              onChange={(event) => {
                setSchoolStage(event.target.value);
                setGradeLevel("");
                setCatalogSubject("");
              }}
            >
              <option value="" disabled>
                اختر ابتدائي، متوسط، أو إعدادي
              </option>
              {SUBJECT_STAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="studyTrack"
              className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
            >
              التخصص <span className="text-red-600">*</span>
            </label>

            <select
              id="studyTrack"
              name="studyTrack"
              required
              className="input"
              value={studyTrack}
              disabled={!schoolStage}
              onChange={(event) => {
                setStudyTrack(event.target.value);
                setCatalogSubject("");
              }}
            >
              <option value="" disabled>
                اختر التخصص
              </option>
              {trackOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {schoolStage && schoolStage !== "إعدادية" ? (
              <p className="mt-2 text-xs font-bold leading-6 text-[var(--app-text-muted)]">
                هذه المرحلة مضبوطة على التخصص العام تلقائيًا.
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label
            htmlFor="catalogSubject"
            className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
          >
            المادة <span className="text-red-600">*</span>
          </label>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <select
              id="catalogSubject"
              name="catalogSubject"
              required={!isCustomSubject}
              className="input"
              value={catalogSubject}
              disabled={!schoolStage || !studyTrack}
              onChange={(event) => setCatalogSubject(event.target.value)}
            >
              <option value="" disabled>
                اختر المادة حسب التخصص
              </option>
              {subjectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              <option value={SUBJECT_CUSTOM_OPTION_VALUE}>＋ إضافة مادة خاصة</option>
            </select>

            <button
              type="button"
              onClick={enableCustomSubject}
              className="btn btn-secondary justify-center whitespace-nowrap"
              disabled={!schoolStage || !studyTrack}
            >
              <Plus size={17} />
              مادة خاصة
            </button>
          </div>
        </div>

        {isCustomSubject ? (
          <div>
            <label
              htmlFor="customSubjectName"
              className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
            >
              اسم المادة الخاصة <span className="text-red-600">*</span>
            </label>

            <input
              id="customSubjectName"
              name="customSubjectName"
              required
              minLength={2}
              maxLength={80}
              placeholder="اكتب اسم المادة الخاصة..."
              className="input"
              autoComplete="off"
              value={customSubjectName}
              onChange={(event) => setCustomSubjectName(event.target.value)}
            />
          </div>
        ) : (
          <input type="hidden" name="customSubjectName" value="" />
        )}

        <div>
          <label
            htmlFor="gradeLevel"
            className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
          >
            الصف/المرحلة الدراسية للمادة <span className="text-red-600">*</span>
          </label>

          <select
            id="gradeLevel"
            name="gradeLevel"
            required
            className="input"
            value={gradeLevel}
            disabled={!schoolStage}
            onChange={(event) => setGradeLevel(event.target.value)}
          >
            <option value="" disabled>
              اختر الصف الدراسي
            </option>
            {gradeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-teal-100 bg-teal-50/70 p-4 text-sm leading-7 text-teal-900 dark:border-teal-900/40 dark:bg-teal-950/30 dark:text-teal-100">
          <p className="font-extrabold">الاسم الذي سيظهر في قائمة المواد:</p>
          <p className="mt-1 text-lg font-extrabold">{displayPreview}</p>
          {levelTrackPreview ? (
            <p className="mt-1 text-xs font-bold opacity-80">
              التصنيف: {getStageLabel(schoolStage)} / {getTrackLabel(studyTrack)} / {levelTrackPreview}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
          >
            وصف مختصر
          </label>

          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={300}
            placeholder="ملاحظات بسيطة عن المادة أو المنهج..."
            className="input min-h-[110px] resize-y leading-7"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/30 to-sky-50/20 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-7 text-[var(--app-text-muted)]">
          سيتم حفظ المادة باسم واضح مثل: الفيزياء - السادس العلمي.
        </p>

        <button type="submit" className="btn btn-primary">
          <CheckCircle2 size={18} />
          حفظ المادة
        </button>
      </div>
    </form>
  );
}
