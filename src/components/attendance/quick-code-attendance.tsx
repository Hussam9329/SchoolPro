"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Keyboard,
  RefreshCw,
  UserCheck,
  UserX,
  History,
  Search,
  User,
} from "lucide-react";
import type { AttendanceScanResult } from "@/types/attendance";
import { getLocalTimeISO, formatAttendanceTime } from "@/types/attendance";

type QuickCodeAttendanceProps = {
  /** Whether QR camera scanner is also available on this device */
  qrAvailable: boolean;
  /** Time after which checkout is considered normal, HH:mm. */
  checkoutWarningTime: string;
  scheduleId: string;
  attendanceDate: string;
};

type StudentSearchResult = {
  id: string;
  fullName: string;
  studentCode: string | null;
  sectionName: string | null;
  className: string | null;
  status: string;
};

type ScanHistoryEntry = {
  id: number;
  result: AttendanceScanResult;
  mode: "check-in" | "check-out";
  timestamp: Date;
};

export function QuickCodeAttendance({ qrAvailable, checkoutWarningTime, scheduleId, attendanceDate }: QuickCodeAttendanceProps) {
  const router = useRouter();
  const [, startRefreshTransition] = useTransition();
  const [mode, setMode] = useState<"check-in" | "check-out">("check-in");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<AttendanceScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const historyIdRef = useRef(0);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchAbortRef = useRef<AbortController | null>(null);

  const getAttendanceClientTime = useCallback(() => {
    const localTime = getLocalTimeISO();
    return attendanceDate ? `${attendanceDate}${localTime.slice(10)}` : localTime;
  }, [attendanceDate]);

  // Search students by name or code only (no class/section filters)
  const searchStudents = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || (trimmed.length < 2 && !trimmed.startsWith("MarSch-"))) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }


    // Abort previous search
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const abortController = new AbortController();
    searchAbortRef.current = abortController;

    setSearching(true);
    try {
      // Search by name or code only — no classId/sectionId filters
      const res = await fetch(`/api/attendance/students?q=${encodeURIComponent(trimmed)}`, {
        signal: abortController.signal,
      });
      const data = await res.json();

      if (data.ok && data.data) {
        const activeStudents = data.data.filter(
          (s: StudentSearchResult) => s.status === "active"
        );
        const results = activeStudents.slice(0, 15);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      if (searchAbortRef.current === abortController) {
        setSearching(false);
      }
    }
  }, []);

  // Debounced search
  const handleInputChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setSelectedStudent(null);
      setResult(null);
      setError(null);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // If it looks like a student code (starts with MarSch-), don't debounce
      if (value.trim().startsWith("MarSch-")) {
        searchStudents(value);
      } else {
        searchTimeoutRef.current = setTimeout(() => {
          searchStudents(value);
        }, 180);
      }
    },
    [searchStudents],
  );


  const confirmEarlyCheckout = useCallback(() => {
    if (mode !== "check-out") return true;

    const [hourText, minuteText] = checkoutWarningTime.split(":");
    const warningHour = Number(hourText);
    const warningMinute = Number(minuteText);
    const warningTotalMinutes = Number.isFinite(warningHour) && Number.isFinite(warningMinute)
      ? warningHour * 60 + warningMinute
      : 12 * 60;

    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    if (currentTotalMinutes >= warningTotalMinutes) return true;

    return window.confirm(`هل أنت متأكد أن الطالب سينصرف قبل الوقت المحدد للانصراف (${checkoutWarningTime})؟`);
  }, [checkoutWarningTime, mode]);

  // Handle student selection from dropdown — immediately register attendance
  const handleStudentSelect = useCallback(
    async (student: StudentSearchResult) => {
      if (!confirmEarlyCheckout()) return;

      setSelectedStudent(student);
      setSearchQuery(student.fullName);
      setShowDropdown(false);
      setResult(null);
      setError(null);

      // Immediately submit attendance for the selected student
      setLoading(true);
      try {
        const res = await fetch("/api/attendance/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: student.id,
            mode,
            source: "manual-name",
            clientTime: getAttendanceClientTime(),
            scheduleId,
          }),
        });

        const data: AttendanceScanResult = await res.json();
        setResult(data);

        if (!data.ok) {
          setError(data.message);
        } else {
          historyIdRef.current += 1;
          setHistory((prev) => [
            {
              id: historyIdRef.current,
              result: data,
              mode,
              timestamp: new Date(),
            },
            ...prev.slice(0, 9),
          ]);
          // Reset for next entry
          setSearchQuery("");
          setSelectedStudent(null);
          setSearchResults([]);
          startRefreshTransition(() => router.refresh());
        }
      } catch {
        setError("حدث خطأ في الاتصال بالخادم.");
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [confirmEarlyCheckout, mode, router, startRefreshTransition, getAttendanceClientTime, scheduleId],
  );

  // Submit attendance for direct code entry
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!confirmEarlyCheckout()) return;

      setResult(null);
      setError(null);

      // If a student is selected from dropdown, submit by ID
      if (selectedStudent) {
        setLoading(true);
        try {
          const res = await fetch("/api/attendance/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId: selectedStudent.id,
              mode,
              source: "manual-name",
              clientTime: getAttendanceClientTime(),
            scheduleId,
            }),
          });

          const data: AttendanceScanResult = await res.json();
          setResult(data);

          if (!data.ok) {
            setError(data.message);
          } else {
            historyIdRef.current += 1;
            setHistory((prev) => [
              {
                id: historyIdRef.current,
                result: data,
                mode,
                timestamp: new Date(),
              },
              ...prev.slice(0, 9),
            ]);
            setSearchQuery("");
            setSelectedStudent(null);
            setSearchResults([]);
            startRefreshTransition(() => router.refresh());
          }
        } catch {
          setError("حدث خطأ في الاتصال بالخادم.");
        } finally {
          setLoading(false);
          inputRef.current?.focus();
        }
      } else {
        // Submit by student code (direct code entry)
        const code = searchQuery.trim();
        if (!code) return;

        setLoading(true);
        try {
          const res = await fetch("/api/attendance/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentCode: code, mode, source: "manual-code", clientTime: getAttendanceClientTime(), scheduleId }),
          });

          const data: AttendanceScanResult = await res.json();
          setResult(data);

          if (!data.ok) {
            setError(data.message);
          } else {
            historyIdRef.current += 1;
            setHistory((prev) => [
              {
                id: historyIdRef.current,
                result: data,
                mode,
                timestamp: new Date(),
              },
              ...prev.slice(0, 9),
            ]);
            setSearchQuery("");
            setSelectedStudent(null);
            setSearchResults([]);
            startRefreshTransition(() => router.refresh());
          }
        } catch {
          setError("حدث خطأ في الاتصال بالخادم.");
        } finally {
          setLoading(false);
          inputRef.current?.focus();
        }
      }
    },
    [searchQuery, selectedStudent, mode, router, confirmEarlyCheckout, startRefreshTransition, getAttendanceClientTime, scheduleId],
  );

  const handleModeSwitch = useCallback((newMode: "check-in" | "check-out") => {
    setMode(newMode);
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup timeout and abort controller
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchAbortRef.current?.abort();
    };
  }, []);

  const canSubmit = searchQuery.trim().length > 0 && !loading;

  return (
    <div className="app-card overflow-hidden">
      <div className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-indigo-50/40 to-blue-50/20 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700">
            <Keyboard size={24} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[var(--app-text)]">
              تسجيل حضور برمز الطالب أو اسم الطالب
            </h3>
            <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
              اكتب اسم الطالب أو رمزه (مثل: MarSch-0001) وسيتم تسجيل حضوره أو انصرافه فورًا عند اختياره من القائمة أو الضغط على Enter. عند الانصراف قبل {checkoutWarningTime} سيطلب النظام تأكيدًا إضافيًا.
              {qrAvailable && " يمكنك أيضًا استخدام الكاميرا لمسح رمز QR."}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Mode Toggle */}
        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => handleModeSwitch("check-in")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition-all ${
              mode === "check-in"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            <UserCheck size={18} />
            تسجيل حضور
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch("check-out")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition-all ${
              mode === "check-out"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            <UserX size={18} />
            تسجيل انصراف
          </button>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSubmit} className="mb-5">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]"
              />
              <input
                ref={inputRef}
                id="student-search-input"
                name="student-search"
                type="text"
                value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0 && !selectedStudent) {
                    setShowDropdown(true);
                  }
                }}
                placeholder="اكتب اسم الطالب أو رمزه..."
                className="input pr-11"
                disabled={loading}
                autoComplete="off"
              />

              {/* Searching indicator */}
              {searching && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <RefreshCw size={16} className="animate-spin text-[var(--app-text-soft)]" />
                </div>
              )}

              {/* Selected student badge */}
              {selectedStudent && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setSearchQuery("");
                    setSearchResults([]);
                    inputRef.current?.focus();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-200 transition"
                >
                  ✓ {selectedStudent.className ?? ""}
                </button>
              )}

              {/* Autocomplete Dropdown — name/code search only, no class filters */}
              {showDropdown && searchResults.length > 0 && !selectedStudent && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 left-0 top-full z-50 mt-1 max-h-[280px] overflow-y-auto rounded-xl border border-[var(--app-border)] bg-white shadow-xl animate-rise"
                >
                  {searchResults.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleStudentSelect(student)}
                      className="flex w-full items-center gap-3 border-b border-[var(--app-border-soft)] px-4 py-3 text-right transition hover:bg-indigo-50/60 last:border-0"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700">
                        <User size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-[var(--app-text)]">
                          {student.fullName}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {student.studentCode && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 ltr" dir="ltr">
                              {student.studentCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn btn-primary min-w-[100px]"
            >
              {loading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : mode === "check-in" ? (
                <>
                  <CheckCircle2 size={18} />
                  حضور
                </>
              ) : (
                <>
                  <XCircle size={18} />
                  انصراف
                </>
              )}
            </button>
          </div>

          {/* Quick tip */}
          <p className="mt-2 text-xs text-[var(--app-text-soft)]">
            اكتب اسم الطالب واختره من القائمة لتسجيل الحضور فورًا، أو أدخل رمزه مباشرة ثم اضغط Enter
          </p>
        </form>

        {/* Result Display */}
        {result && (
          <div
            className={`mb-5 rounded-xl border p-4 animate-rise ${
              result.ok
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  result.ok
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {result.ok ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
              </div>
              <div className="flex-1">
                <p
                  className={`font-extrabold ${
                    result.ok ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {result.message}
                </p>
                {result.ok && (
                  <div className="mt-2 grid gap-1 text-sm text-emerald-800">
                    <p>
                      الطالب: <span className="font-bold">{result.studentName}</span>
                    </p>
                    <p>
                      الرمز: <span className="font-bold ltr inline-block" dir="ltr">{result.studentCode}</span>
                    </p>
                    {result.checkInAt && (
                      <p>
                        وقت الحضور:{" "}
                        <span className="font-bold">
                          {formatAttendanceTime(result.checkInAt)}
                        </span>
                      </p>
                    )}
                    {result.checkOutAt && (
                      <p>
                        وقت الانصراف:{" "}
                        <span className="font-bold">
                          {formatAttendanceTime(result.checkOutAt)}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Display (non-result errors) */}
        {error && !result?.ok && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 animate-rise">
            {error}
          </div>
        )}

        {/* Recent History */}
        {history.length > 0 && (
          <div className="mt-2">
            <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[var(--app-text-muted)]">
              <History size={16} />
              آخر العمليات ({history.length})
            </div>
            <div className="max-h-[240px] overflow-y-auto rounded-xl border border-[var(--app-border-soft)]">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 border-b border-[var(--app-border-soft)] px-4 py-3 last:border-0"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs ${
                      entry.mode === "check-in"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {entry.mode === "check-in" ? (
                      <UserCheck size={14} />
                    ) : (
                      <UserX size={14} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[var(--app-text)]">
                      {entry.result.studentName}
                    </p>
                    <p className="text-xs text-[var(--app-text-soft)]" dir="ltr">
                      {entry.result.studentCode}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-[var(--app-text-muted)]">
                      {entry.timestamp.toLocaleTimeString("ar-IQ-u-nu-latn")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
