"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Search, UserRound, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getStudentClassDisplay, getStudentStatusLabel, type StudentListItem } from "@/types/student";

type StudentSearchItem = Pick<
  StudentListItem,
  | "id"
  | "fullName"
  | "studentCode"
  | "phone"
  | "guardianName"
  | "guardianPhone"
  | "className"
  | "classLevel"
  | "sectionName"
  | "status"
>;

type StudentLiveSearchProps = {
  initialQuery: string;
  initialStatus: string;
  students: StudentSearchItem[];
};

export function StudentLiveSearch({ initialQuery, initialStatus, students }: StudentLiveSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    setQuery(initialQuery);
    setStatus(initialStatus);
  }, [initialQuery, initialStatus]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");

      if (status) params.set("status", status);
      else params.delete("status");

      params.delete("saved");
      params.delete("deleted");
      params.delete("statusUpdated");
      params.delete("error");
      params.delete("reason");

      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      startTransition(() => router.replace(nextUrl, { scroll: false }));
    }, 250);

    return () => window.clearTimeout(handle);
  }, [pathname, query, router, searchParams, status]);

  const suggestions = useMemo(() => {
    const value = query.trim().toLowerCase();
    const byStatus = status ? students.filter((student) => student.status === status) : students;

    if (!value) return byStatus.slice(0, 6);

    return byStatus
      .filter((student) => {
        const haystack = [
          student.fullName,
          student.studentCode,
          student.phone,
          student.guardianName,
          student.guardianPhone,
          student.className,
          student.sectionName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(value);
      })
      .slice(0, 8);
  }, [query, status, students]);

  function clearFilters() {
    setQuery("");
    setStatus("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  return (
    <section className="app-card p-5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-extrabold text-[var(--app-text)]">البحث المتزامن عن الطلاب</h3>
          <p className="mt-1 text-xs font-bold text-[var(--app-text-muted)]">
            اكتب الاسم أو الرمز أو رقم ولي الأمر، والنتائج تتحدث تلقائيًا بدون Enter.
          </p>
        </div>

        <span className="badge badge-info">
          {isPending ? "جاري التحديث..." : "بحث مباشر"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]"
          />

          <input
            id="student-live-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="اسم الطالب، الرقم، الهاتف، ولي الأمر..."
            className="input pr-11"
            autoComplete="off"
          />
        </div>

        <select
          id="student-live-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="input"
        >
          <option value="">كل الحالات</option>
          <option value="active">مستمر</option>
          <option value="inactive">متوقف</option>
          <option value="graduated">متخرج</option>
          <option value="transferred">منقول</option>
        </select>

        <button type="button" onClick={clearFilters} className="btn btn-secondary">
          <X size={17} />
          مسح
        </button>
      </div>

      {suggestions.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {suggestions.map((student) => (
            <a
              key={student.id}
              href={`/students/${student.id}`}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-[var(--app-border-soft)] bg-white px-4 py-3 text-sm transition hover:border-teal-200 hover:bg-teal-50/60"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                  <UserRound size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-extrabold text-[var(--app-text)]">{student.fullName}</span>
                  <span className="block truncate text-xs font-bold text-[var(--app-text-muted)]">
                    {getStudentClassDisplay({
                      className: student.className,
                      classLevel: student.classLevel,
                      sectionName: student.sectionName,
                    })}
                  </span>
                </span>
              </span>

              <span className="hidden shrink-0 text-xs font-extrabold text-teal-700 sm:block">
                {student.studentCode ?? getStudentStatusLabel(student.status)}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-[var(--app-text-muted)]">
          لا توجد اقتراحات مطابقة حاليًا.
        </p>
      )}
    </section>
  );
}
