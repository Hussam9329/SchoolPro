"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Layers3, ListChecks, UserRound } from "lucide-react";

type SubjectOption = {
  id: string;
  name: string;
  subjectBaseName: string | null;
  schoolStage: string | null;
  gradeLevel: string | null;
  studyTrack: string | null;
};

type SectionOption = {
  id: string;
  name: string;
  className: string;
  schoolStage: string | null;
  gradeLevel: string | null;
  studyTrack: string | null;
  studentsCount: number;
};

type TeacherAssignmentFieldsProps = {
  subjects: SubjectOption[];
  sections: SectionOption[];
  selectedSubjectIds?: string[];
  selectedSectionIds?: string[];
};

const TRACK_ORDER = ["عام", "علمي", "أدبي", "مهني"];

function normalize(value?: string | null) {
  return value?.trim() ?? "";
}

function matchesSubjectSection(subject: SubjectOption, section: SectionOption) {
  const subjectStage = normalize(subject.schoolStage);
  const subjectGrade = normalize(subject.gradeLevel);
  const subjectTrack = normalize(subject.studyTrack);
  const sectionStage = normalize(section.schoolStage);
  const sectionGrade = normalize(section.gradeLevel);
  const sectionTrack = normalize(section.studyTrack);

  if (subjectStage && sectionStage && subjectStage !== sectionStage) return false;
  if (subjectGrade && sectionGrade && subjectGrade !== sectionGrade) return false;
  if (subjectTrack && sectionTrack && subjectTrack !== sectionTrack) return false;

  return true;
}

function getTrackOptions(subjects: SubjectOption[]) {
  const existingTracks = new Set(subjects.map((subject) => normalize(subject.studyTrack)).filter(Boolean));
  const orderedTracks = TRACK_ORDER.filter((track) => existingTracks.has(track));
  const remainingTracks = Array.from(existingTracks).filter((track) => !TRACK_ORDER.includes(track));
  return [...orderedTracks, ...remainingTracks];
}

export function TeacherAssignmentFields({
  subjects,
  sections,
  selectedSubjectIds = [],
  selectedSectionIds = [],
}: TeacherAssignmentFieldsProps) {
  const initialSubject = subjects.find((subject) => selectedSubjectIds.includes(subject.id));
  const trackOptions = useMemo(() => getTrackOptions(subjects), [subjects]);
  const [selectedTrack, setSelectedTrack] = useState(initialSubject?.studyTrack ?? "");
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubject?.id ?? "");
  const [selectedSections, setSelectedSections] = useState<string[]>(selectedSectionIds);

  const filteredSubjects = useMemo(() => {
    if (!selectedTrack) return [];
    return subjects.filter((subject) => normalize(subject.studyTrack) === selectedTrack);
  }, [selectedTrack, subjects]);

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId) ?? null,
    [selectedSubjectId, subjects],
  );

  const availableSections = useMemo(() => {
    if (!selectedSubject) return [];
    return sections.filter((section) => matchesSubjectSection(selectedSubject, section));
  }, [sections, selectedSubject]);

  const availableSectionIds = useMemo(
    () => new Set(availableSections.map((section) => section.id)),
    [availableSections],
  );

  useEffect(() => {
    if (!selectedTrack) {
      setSelectedSubjectId("");
      setSelectedSections([]);
      return;
    }

    if (selectedSubjectId && !filteredSubjects.some((subject) => subject.id === selectedSubjectId)) {
      setSelectedSubjectId("");
      setSelectedSections([]);
    }
  }, [filteredSubjects, selectedSubjectId, selectedTrack]);

  useEffect(() => {
    setSelectedSections((current) => current.filter((sectionId) => availableSectionIds.has(sectionId)));
  }, [availableSectionIds]);

  function toggleSection(sectionId: string) {
    setSelectedSections((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId],
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
        <p className="text-sm leading-7 text-sky-800">
          لا توجد مواد فعّالة حاليًا. <a href="/subjects" className="font-extrabold underline underline-offset-2 hover:text-sky-900">أضف مواد أولًا</a> لربطها بالمدرسين.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 rounded-3xl border border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/40 to-sky-50/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm ring-1 ring-teal-100">
          <BookOpen size={19} />
        </div>
        <div>
          <h4 className="text-base font-extrabold text-[var(--app-text)]">ربط المدرس بالمادة والشُعب</h4>
          <p className="mt-1 text-xs leading-6 text-[var(--app-text-muted)]">
            اختر التخصص أولًا، ثم المادة، وبعدها ستظهر فقط شُعب الصف/المرحلة المطابقة لهذه المادة.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="teacherStudyTrack" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
            التخصص <span className="text-red-600">*</span>
          </label>
          <select
            id="teacherStudyTrack"
            value={selectedTrack}
            onChange={(event) => {
              setSelectedTrack(event.target.value);
              setSelectedSubjectId("");
              setSelectedSections([]);
            }}
            className="input"
            required
          >
            <option value="">اختر عام / علمي / أدبي / مهني</option>
            {trackOptions.map((track) => (
              <option key={track} value={track}>{track}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="teacherSubjectId" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
            المادة المرتبطة بالصف <span className="text-red-600">*</span>
          </label>
          <select
            id="teacherSubjectId"
            name="subjectIds"
            value={selectedSubjectId}
            onChange={(event) => {
              setSelectedSubjectId(event.target.value);
              setSelectedSections([]);
            }}
            className="input"
            required
            disabled={!selectedTrack}
          >
            <option value="">{selectedTrack ? "اختر المادة" : "اختر التخصص أولًا"}</option>
            {filteredSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedSubject ? (
        <div className="rounded-2xl border border-teal-100 bg-white/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--app-text)]">
              <Layers3 size={16} className="text-teal-700" />
              الشُعب المطابقة للمادة المختارة
            </div>
            <span className="badge badge-info">{availableSections.length} شعبة</span>
          </div>

          {availableSections.length > 0 ? (
            <div className="mt-4 grid max-h-64 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {availableSections.map((section) => {
                const checked = selectedSections.includes(section.id);

                return (
                  <label
                    key={section.id}
                    className={[
                      "flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition",
                      checked
                        ? "border-teal-300 bg-teal-50 shadow-sm"
                        : "border-[var(--app-border-soft)] bg-white hover:border-teal-200 hover:bg-teal-50/40",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      name="sectionIds"
                      value={section.id}
                      checked={checked}
                      onChange={() => toggleSection(section.id)}
                      className="mt-1 h-4 w-4 accent-teal-600"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-extrabold text-[var(--app-text)]">
                        <UserRound size={15} className="text-[var(--app-text-soft)]" />
                        {section.className} - {section.name}
                      </span>
                      <span className="mt-1 block text-xs font-bold text-[var(--app-text-soft)]">
                        الطلاب داخل الشعبة: {section.studentsCount}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
              لا توجد شُعب مطابقة لهذه المادة. تأكد من إضافة صف وشُعبة بنفس المرحلة والصف والتخصص، ثم اربط المادة بهذا الصف.
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[var(--app-text-soft)]">
            <ListChecks size={14} />
            يمكن ترك الشُعب بدون تحديد إذا كنت تريد ربط المدرس بالمادة فقط حاليًا.
          </div>
        </div>
      ) : null}
    </div>
  );
}
