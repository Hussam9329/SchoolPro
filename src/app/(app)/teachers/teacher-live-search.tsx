"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Search, X } from "lucide-react";

type TeacherSearchOption = {
  id: string;
  fullName: string;
  phone: string | null;
  specialty: string | null;
  subjectNames: string[];
};

type TeacherLiveSearchProps = {
  initialQuery: string;
  teachers: TeacherSearchOption[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function teacherMatchesQuery(teacher: TeacherSearchOption, query: string) {
  const value = normalize(query);
  if (!value) return true;

  return [
    teacher.fullName,
    teacher.phone ?? "",
    teacher.specialty ?? "",
    ...teacher.subjectNames,
  ].some((field) => normalize(field).includes(value));
}

export function TeacherLiveSearch({ initialQuery, teachers }: TeacherLiveSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  const suggestions = useMemo(() => {
    const query = value.trim();
    if (!query) return teachers.slice(0, 6);
    return teachers.filter((teacher) => teacherMatchesQuery(teacher, query)).slice(0, 8);
  }, [teachers, value]);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const nextQuery = value.trim();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextQuery) {
        params.set("q", nextQuery);
      } else {
        params.delete("q");
      }

      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      startTransition(() => {
        router.replace(nextUrl, { scroll: false });
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [pathname, router, searchParams, value]);

  function selectTeacher(teacher: TeacherSearchOption) {
    setValue(teacher.fullName);
  }

  function clearSearch() {
    setValue("");
  }

  return (
    <div className="app-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <label htmlFor="teacher-live-search" className="block text-sm font-extrabold text-[var(--app-text)]">
          البحث المباشر في المدرسين
        </label>
        {isPending ? <span className="text-xs font-bold text-[var(--app-text-soft)]">تحديث...</span> : null}
      </div>

      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]"
        />
        <input
          id="teacher-live-search"
          name="q"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="اكتب اسم المدرس أو الهاتف أو المادة..."
          className="input pr-11 pl-11"
        />
        {value ? (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="مسح البحث"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      <div className="mt-3 rounded-2xl border border-[var(--app-border-soft)] bg-white p-2 shadow-sm">
        <div className="max-h-56 overflow-y-auto">
          {suggestions.length > 0 ? (
            suggestions.map((teacher) => (
              <button
                key={teacher.id}
                type="button"
                onClick={() => selectTeacher(teacher)}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-right transition hover:bg-teal-50"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <GraduationCap size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-[var(--app-text)]">{teacher.fullName}</span>
                  <span className="mt-1 block truncate text-xs font-bold text-[var(--app-text-soft)]">
                    {[teacher.phone, teacher.specialty, teacher.subjectNames.slice(0, 2).join("، ")].filter(Boolean).join(" — ") || "بدون تفاصيل إضافية"}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-center text-sm font-bold text-[var(--app-text-muted)]">
              لا توجد نتائج مطابقة.
            </p>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs leading-6 text-[var(--app-text-soft)]">
        النتائج تتحدث تلقائيًا أثناء الكتابة، ويمكنك اختيار مدرس من القائمة لتصفية النتائج مباشرة.
      </p>
    </div>
  );
}
