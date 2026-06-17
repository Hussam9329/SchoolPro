"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BookOpen, CalendarClock, CheckCircle2, Clock, GraduationCap, MapPin, Users } from "lucide-react";
import { WEEK_DAYS } from "@/types/schedule";
import type { SectionListItem } from "@/types/class";
import type { TeacherListItem } from "@/types/teacher";

type SubjectOption = { id: string; name: string };

type ScheduleDraft = {
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  sectionId?: string;
  subjectId?: string;
  teacherId?: string;
  room?: string;
  notes?: string;
  isActive?: string;
};

type ScheduleCreateFormProps = {
  sections: SectionListItem[];
  subjects: SubjectOption[];
  teachers: TeacherListItem[];
  draft?: ScheduleDraft;
  roomOptions?: string[];
  action: (formData: FormData) => void | Promise<void>;
};

const ROOM_OPTIONS = ["قاعة 1", "قاعة 2", "قاعة 3", "مختبر العلوم", "مختبر الحاسوب", "قاعة النشاط"];

export function ScheduleCreateFormClient({ sections, subjects, teachers, draft, roomOptions = [], action }: ScheduleCreateFormProps) {
  const activeTeachers = useMemo(() => teachers.filter((teacher) => teacher.isActive), [teachers]);
  const [sectionId, setSectionId] = useState(draft?.sectionId ?? "");
  const [subjectId, setSubjectId] = useState(draft?.subjectId ?? "");
  const [teacherId, setTeacherId] = useState(draft?.teacherId ?? "");

  const teachersForSection = useMemo(() => {
    if (!sectionId) return activeTeachers;
    return activeTeachers.filter((teacher) => teacher.sections.some((section) => section.id === sectionId));
  }, [activeTeachers, sectionId]);

  const subjectsForSection = useMemo(() => {
    if (!sectionId) return subjects;
    const allowedSubjectIds = new Set<string>();
    for (const teacher of teachersForSection) {
      for (const subject of teacher.subjects) {
        allowedSubjectIds.add(subject.id);
      }
    }
    return subjects.filter((subject) => allowedSubjectIds.has(subject.id));
  }, [sectionId, subjects, teachersForSection]);

  const teachersForSelection = useMemo(() => {
    if (!subjectId) return teachersForSection;
    return teachersForSection.filter((teacher) => teacher.subjects.some((subject) => subject.id === subjectId));
  }, [subjectId, teachersForSection]);

  const canCreate = sections.length > 0 && subjects.length > 0 && activeTeachers.length > 0;
  const noLinkedTeachersForSection = Boolean(sectionId) && teachersForSection.length === 0;
  const noLinkedSubjectsForSection = Boolean(sectionId) && teachersForSection.length > 0 && subjectsForSection.length === 0;
  const mergedRoomOptions = useMemo(() => Array.from(new Set([...roomOptions, ...ROOM_OPTIONS].filter(Boolean))), [roomOptions]);

  return (
    <form id="schedule-form" action={action} className="app-card overflow-hidden">
      <div className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/40 to-sky-50/20 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-teal-100 text-blue-700">
            <CalendarClock size={23} />
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-[var(--app-text)]">إضافة محاضرة دراسية</h3>
            <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
              اختر الشعبة أولًا، بعدها تظهر فقط المواد والمدرسون المرتبطون بهذه الشعبة.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="اليوم" htmlFor="dayOfWeek" required icon={<CalendarClock size={14} />}>
            <select id="dayOfWeek" name="dayOfWeek" autoComplete="off" required className="input" defaultValue={draft?.dayOfWeek ?? "saturday"}>
              {WEEK_DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
            </select>
          </FormField>

          <FormField label="الشعبة" htmlFor="sectionId" required icon={<Users size={14} />}>
            <select
              id="sectionId"
              name="sectionId"
              autoComplete="off"
              required
              disabled={sections.length === 0}
              className="input"
              value={sectionId}
              onChange={(event) => {
                setSectionId(event.target.value);
                setSubjectId("");
                setTeacherId("");
              }}
            >
              <option value="" disabled>اختر الشعبة</option>
              {sections.map((section) => <option key={section.id} value={section.id}>{section.className} / شعبة {section.name}</option>)}
            </select>
          </FormField>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="وقت البداية" htmlFor="startTime" required icon={<Clock size={14} />}>
            <input id="startTime" name="startTime" type="time" autoComplete="off" required className="input ltr text-right" defaultValue={draft?.startTime ?? "00:00"} />
          </FormField>

          <FormField label="وقت النهاية" htmlFor="endTime" required icon={<Clock size={14} />}>
            <input id="endTime" name="endTime" type="time" autoComplete="off" required className="input ltr text-right" defaultValue={draft?.endTime ?? "00:00"} />
          </FormField>
        </div>

        {noLinkedTeachersForSection ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-sm font-bold leading-7 text-sky-800">
            لا يوجد مدرس مرتبط بهذه الشعبة. اربط المدرس بالشعبة من صفحة المدرسين قبل إضافة المحاضرة.
          </div>
        ) : null}

        {noLinkedSubjectsForSection ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-sm font-bold leading-7 text-sky-800">
            هذه الشعبة لديها مدرسون، لكن لا توجد مواد مرتبطة بهم. اربط المواد بالمدرسين أولًا.
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="المادة" htmlFor="subjectId" required icon={<BookOpen size={14} />}>
            <select
              id="subjectId"
              name="subjectId"
              autoComplete="off"
              required
              disabled={!sectionId || subjectsForSection.length === 0}
              className="input"
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setTeacherId("");
              }}
            >
              <option value="" disabled>{sectionId ? "اختر المادة" : "اختر الشعبة أولًا"}</option>
              {subjectsForSection.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </FormField>

          <FormField label="المدرس" htmlFor="teacherId" required icon={<GraduationCap size={14} />}>
            <select
              id="teacherId"
              name="teacherId"
              autoComplete="off"
              required
              disabled={!sectionId || !subjectId || teachersForSelection.length === 0}
              className="input"
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
            >
              <option value="" disabled>{subjectId ? "اختر المدرس" : "اختر المادة أولًا"}</option>
              {teachersForSelection.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>)}
            </select>
          </FormField>
        </div>

        <FormField label="القاعة" htmlFor="room" icon={<MapPin size={14} />}>
          <input id="room" name="room" autoComplete="off" list="room-options" maxLength={80} placeholder="مثال: قاعة 101" className="input" defaultValue={draft?.room ?? ""} />
          <datalist id="room-options">
            {mergedRoomOptions.map((room) => <option key={room} value={room} />)}
          </datalist>
          <p className="mt-2 text-xs leading-6 text-[var(--app-text-muted)]">يمكن اختيار قاعة مقترحة أو كتابة قاعة جديدة باسم واضح.</p>
        </FormField>

        <FormField label="ملاحظات" htmlFor="notes">
          <textarea id="notes" name="notes" autoComplete="off" rows={3} maxLength={500} placeholder="ملاحظات إضافية عن المحاضرة..." className="input min-h-[90px] resize-y leading-7" defaultValue={draft?.notes ?? ""} />
        </FormField>

        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/30 to-sky-50/20 p-4">
          <input type="checkbox" id="schedule-isActive" name="isActive" autoComplete="off" defaultChecked={draft?.isActive !== "off"} className="h-5 w-5 accent-teal-600" />
          <span>
            <span className="block font-extrabold text-[var(--app-text)]">المحاضرة فعّالة</span>
            <span className="mt-1 block text-sm leading-6 text-[var(--app-text-muted)]">المحاضرات الفعّالة تظهر في الجدول الدراسي ويمكن تسجيل الحضور فيها.</span>
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/30 to-sky-50/20 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-7 text-[var(--app-text-muted)]">النظام يمنع تضارب المدرس أو الشعبة، ولا يمسح المدخلات عند وجود خطأ.</p>
        <button type="submit" disabled={!canCreate || noLinkedTeachersForSection || noLinkedSubjectsForSection} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60">
          <CheckCircle2 size={18} />
          حفظ المحاضرة
        </button>
      </div>
    </form>
  );
}

function FormField({ label, htmlFor, required, children, icon }: { label: string; htmlFor: string; required?: boolean; children: ReactNode; icon?: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 flex items-center gap-1 text-sm font-extrabold text-[var(--app-text)]">
        {icon}
        {label}
        {required ? <span className="text-red-600">*</span> : null}
      </label>
      {children}
    </div>
  );
}
