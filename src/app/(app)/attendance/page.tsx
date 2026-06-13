import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";
import {
  CheckCircle2,
  CheckSquare,
  Clock,
  ClipboardList,
  FileText,
  LogIn,
  LogOut,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";
import { safeQuery } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SmartAlert } from "@/components/shared/smart-alert";
import { AttendanceEntryPanel } from "@/components/attendance/attendance-entry-panel";
import { AttendanceQuickActions } from "@/components/attendance/attendance-quick-actions";
import { AbsentNamesToggle } from "@/components/attendance/absent-names-toggle";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { PrintButton } from "@/components/reports/print-button";
import { getClasses, getSections } from "@/services/class-service";
import { getSchedules } from "@/services/schedule-service";
import {
  deleteAttendanceRecord,
  getAttendanceRecords,
  getAttendanceStudentTotals,
  getDailyAttendanceSummary,
  hasAttendanceRecords,
  summarizeAttendanceRecords,
} from "@/services/attendance-service";
import {
  ATTENDANCE_STATUSES,
  calculateAttendanceRate,
  formatAttendanceShortDate,
  formatAttendanceTime,
  getAttendanceStatusBadgeClass,
  type AttendanceFilter,
  type AttendanceListItem,
  type AttendanceStudentTotal,
  type AttendanceSummary,
} from "@/types/attendance";
import { getSchoolSettings } from "@/services/school-settings-service";
import { getSchoolDayLabel } from "@/types/settings";
import { getScheduleDisplayName, type ScheduleListItem } from "@/types/schedule";

export const dynamic = "force-dynamic";

type AttendancePageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    date?: string;
    fromDate?: string;
    toDate?: string;
    classId?: string;
    sectionId?: string;
    scheduleId?: string;
    source?: string;
    hasCheckIn?: string;
    hasCheckOut?: string;
    missingCheckOut?: string;
    saved?: string;
    deleted?: string;
    error?: string;
    reason?: string;
    view?: string;
  }>;
};

const emptyAttendanceSummary: AttendanceSummary = {
  total: 0,
  present: 0,
  absent: 0,
  late: 0,
  excused: 0,
  checkedIn: 0,
  checkedOut: 0,
  missingCheckOut: 0,
  attendanceRate: 0,
};

export default async function AttendancePage({
  searchParams,
}: AttendancePageProps) {
  await requireAdmin();
  const resolvedSearchParams = await searchParams;

  const filter: AttendanceFilter = {
    query: resolvedSearchParams?.q?.trim() || undefined,
    status: resolvedSearchParams?.status?.trim() || undefined,
    date: resolvedSearchParams?.date?.trim() || undefined,
    fromDate: resolvedSearchParams?.fromDate?.trim() || undefined,
    toDate: resolvedSearchParams?.toDate?.trim() || undefined,
    classId: resolvedSearchParams?.classId?.trim() || undefined,
    sectionId: resolvedSearchParams?.sectionId?.trim() || undefined,
    scheduleId: resolvedSearchParams?.scheduleId?.trim() || undefined,
    source: resolvedSearchParams?.source?.trim() || undefined,
    hasCheckIn: resolvedSearchParams?.hasCheckIn?.trim() || undefined,
    hasCheckOut: resolvedSearchParams?.hasCheckOut?.trim() || undefined,
    missingCheckOut: resolvedSearchParams?.missingCheckOut?.trim() || undefined,
  };

  const todayStr = getDateInputValue(new Date());
  const selectedAttendanceDate = resolvedSearchParams?.date?.trim() || todayStr;
  const selectedScheduleId = resolvedSearchParams?.scheduleId?.trim() || "";
  const showAllRequested = resolvedSearchParams?.view?.trim() === "all";
  const hasFilterRequest = hasAttendanceFilter(filter);
  const shouldLoadDetailedAttendance = showAllRequested || hasFilterRequest;

  const [hasAnyStoredRecords, classes, sections, schoolSettings, todaySummary, schedules] =
    await Promise.all([
      safeQuery(() => hasAttendanceRecords(), false),
      safeQuery(() => getClasses(), []),
      safeQuery(() => getSections(), []),
      safeQuery(() => getSchoolSettings(), {
        id: "main",
        weekendDays: ["friday", "saturday"],
        customHolidayDates: [],
        checkoutWarningTime: "12:00",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      safeQuery(() => getDailyAttendanceSummary(todayStr), emptyAttendanceSummary),
      safeQuery(() => getSchedules({ isActive: true, dayOfWeek: getWeekDayValueFromDateInput(selectedAttendanceDate) }), []),
    ]);

  let records: AttendanceListItem[] = [];
  let summary: AttendanceSummary = todaySummary;
  let studentTotals: AttendanceStudentTotal[] = [];

  if (shouldLoadDetailedAttendance) {
    records = await safeQuery(() => getAttendanceRecords(filter), []);
    summary = summarizeAttendanceRecords(records);
    studentTotals = await safeQuery(() => getAttendanceStudentTotals(filter, records), []);
  }

  const hasAnyRecords = hasAnyStoredRecords || records.length > 0;
  const today = todayStr;
  const reportsHref = buildReportsHref(filter);
  const todayAbsentCount = todaySummary.absent;
  const todayLateCount = todaySummary.late;
  const todayPresentCount = todaySummary.present;
  const todayMissingCheckOutCount = todaySummary.missingCheckOut;
  const todayAbsentStudents = isTodayAbsentRequest(filter)
    ? records
        .filter((record) => record.status === "absent")
        .map((record) => ({
          studentName: record.studentName,
          studentCode: record.studentCode,
          className: record.className,
          sectionName: record.sectionName,
          isComputedAbsence: record.isComputedAbsence,
        }))
    : [];

  return (
    <div className="mx-auto flex w-full max-w-[1350px] flex-col gap-6">
        <PageHeader
          title="الحضور والغياب"
          description="إدارة كاملة للحضور والغياب: حضور اليوم، غياب اليوم، المتأخرين، الانصراف، وإجماليات كل طالب مع فلاتر متقدمة."
          icon="attendance"
          badge="الخطوة السادسة"
        />

        <AttendanceFeedback
          saved={resolvedSearchParams?.saved}
          deleted={resolvedSearchParams?.deleted}
          error={resolvedSearchParams?.error}
          reason={resolvedSearchParams?.reason}
        />

        <SmartAlert
          tone="info"
          title="الحضور يعتمد على إعدادات الدوام"
          description={`كل طالب يتم تسجيله داخل المحاضرة المختارة، لذلك اختر اليوم والمحاضرة قبل تسجيل الحضور أو الانصراف. العطل الأسبوعية الحالية: ${schoolSettings.weekendDays.map(getSchoolDayLabel).join("، ") || "غير محددة"}. تنبيه الانصراف المبكر يظهر قبل الساعة ${schoolSettings.checkoutWarningTime}.`}
          actionLabel="تعديل الإعدادات"
          actionHref="/settings"
        />

        <AttendanceSessionSelector
          schedules={schedules}
          selectedDate={selectedAttendanceDate}
          selectedScheduleId={selectedScheduleId}
        />

        {selectedScheduleId ? (
          <section>
            <AttendanceEntryPanel
              checkoutWarningTime={schoolSettings.checkoutWarningTime}
              scheduleId={selectedScheduleId}
              attendanceDate={selectedAttendanceDate}
            />
          </section>
        ) : (
          <SmartAlert
            tone="warning"
            title="اختر المحاضرة أولًا"
            description="لا يمكن تسجيل حضور أو انصراف قبل اختيار اليوم والمحاضرة حتى ينربط الحضور بالجدول الصحيح."
          />
        )}

        <section className="flex flex-col gap-6">
          <AttendanceStats summary={summary} />

          <AttendanceQuickActions
            today={today}
            activeDate={filter.date}
            activeStatus={filter.status}
            missingCheckOut={filter.missingCheckOut}
            showAllRequested={showAllRequested}
            todayAbsentCount={todayAbsentCount}
            todayLateCount={todayLateCount}
            todayPresentCount={todayPresentCount}
            todayMissingCheckOutCount={todayMissingCheckOutCount}
          />

          <AttendanceSearchForm
            filter={filter}
            classes={classes}
            sections={sections}
            reportsHref={reportsHref}
          />
        </section>

        {shouldLoadDetailedAttendance ? (
          <>
            <AttendancePeriodReport
              summary={summary}
              recordsCount={records.length}
              filter={filter}
              todayAbsentCount={isTodayAbsentRequest(filter) ? summary.absent : todayAbsentCount}
              todayAbsentStudents={todayAbsentStudents}
            />

            <StudentTotalsReport rows={studentTotals} />

            {!hasAnyRecords ? (
              <EmptyState
                icon="attendance"
                title="لا توجد سجلات حضور بعد"
                description="ابدأ بكتابة اسم الطالب أو رمزه في لوحة الإدخال أعلاه، وسيظهر السجل مباشرة في الجدول والتقرير."
                actionLabel="إدارة الطلاب"
                actionHref="/students"
              />
            ) : records.length === 0 ? (
              <EmptyState
                icon="search"
                title="لا توجد نتائج مطابقة"
                description="جرّب تغيير التاريخ، الحالة، الصف، الشعبة، أو مسح الفلاتر المتقدمة."
                actionLabel="عرض كل السجلات"
                actionHref="/attendance?view=all"
              />
            ) : (
              <AttendanceList records={records} />
            )}
          </>
        ) : (
          <AttendanceDeferredNotice today={today} />
        )}
      </div>
  );
}


function getWeekDayValueFromDateInput(dateInput: string): string {
  const date = new Date(`${dateInput}T12:00:00`);
  const day = Number.isNaN(date.getTime()) ? new Date().getDay() : date.getDay();
  const map: Record<number, string> = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
  };
  return map[day] ?? "saturday";
}

function AttendanceSessionSelector({
  schedules,
  selectedDate,
  selectedScheduleId,
}: {
  schedules: ScheduleListItem[];
  selectedDate: string;
  selectedScheduleId: string;
}) {
  return (
    <form action="/attendance" className="app-card p-5">
      <div className="grid gap-4 md:grid-cols-[200px_1fr_auto] md:items-end">
        <div>
          <label htmlFor="attendance-date" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
            يوم الحضور
          </label>
          <input id="attendance-date" name="date" type="date" className="input" defaultValue={selectedDate} required />
        </div>

        <div>
          <label htmlFor="attendance-schedule" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
            المحاضرة
          </label>
          <select id="attendance-schedule" name="scheduleId" className="input" defaultValue={selectedScheduleId} required disabled={schedules.length === 0}>
            <option value="" disabled>{schedules.length === 0 ? "لا توجد محاضرات فعّالة لهذا اليوم" : "اختر المحاضرة قبل تسجيل الحضور"}</option>
            {schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.dayLabel} — {getScheduleDisplayName({
                  subjectName: schedule.subjectName,
                  teacherName: schedule.teacherName,
                  sectionName: schedule.sectionName,
                  className: schedule.className,
                })} — {schedule.startTime} إلى {schedule.endTime}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn btn-primary justify-center">
          اختيار المحاضرة
        </button>
      </div>
    </form>
  );
}

async function deleteAttendanceAction(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  "use server";

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { ok: false, message: "معرّف سجل الحضور مفقود." };
  }

  let result;
  try {
    result = await deleteAttendanceRecord(id);
  } catch (error) {
    console.error("[deleteAttendanceAction] Error:", error);
    return { ok: false, message: "حدث خطأ أثناء الحذف. تأكد من عدم وجود بيانات مرتبطة." };
  }

  if (!result.ok) {
    return { ok: false, message: result.message || "حدث خطأ أثناء الحذف." };
  }

  revalidatePath("/");
  revalidatePath("/attendance");
  revalidatePath("/reports");
  redirect("/attendance?deleted=1");
}

// ─── Feedback ────────────────────────────────────────────────────

type AttendanceFeedbackProps = {
  saved?: string;
  deleted?: string;
  error?: string;
  reason?: string;
};

function AttendanceFeedback({ saved, deleted, error, reason }: AttendanceFeedbackProps) {
  if (saved === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تم تسجيل الحضور بنجاح"
        description="تم حفظ سجل الحضور للطالب المحدد."
      />
    );
  }

  if (deleted === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تم حذف سجل الحضور"
        description="تم حذف سجل الحضور من النظام."
      />
    );
  }

  if (error) {
    let description: string;
    if (error === "delete" && reason) {
      description = decodeURIComponent(reason);
    } else if (error === "delete") {
      description = "لا يمكن حذف سجل الحضور. حاول مرة أخرى.";
    } else if (error === "missing-id") {
      description = "معرّف سجل الحضور مطلوب.";
    } else {
      description = "تأكد من إدخال البيانات بشكل صحيح، وأن الطالب مسجل في النظام.";
    }

    return (
      <SmartAlert
        tone="warning"
        title="لم تكتمل العملية"
        description={description}
      />
    );
  }

  return null;
}

// ─── Stats ───────────────────────────────────────────────────────

type AttendanceStatsProps = {
  summary: AttendanceSummary;
};

function AttendanceStats({ summary }: AttendanceStatsProps) {
  const rate = summary.attendanceRate || calculateAttendanceRate(summary);

  const stats = [
    {
      label: "إجمالي السجلات",
      value: summary.total,
      icon: ClipboardList,
      className: "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700",
    },
    {
      label: "حاضرون",
      value: summary.present,
      icon: CheckCircle2,
      className: "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700",
    },
    {
      label: "غائبون",
      value: summary.absent,
      icon: XCircle,
      className: "bg-gradient-to-br from-red-100 to-indigo-100 text-red-700",
    },
    {
      label: "متأخرون",
      value: summary.late,
      icon: Clock,
      className: "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700",
    },
    {
      label: "لم ينصرفوا",
      value: summary.missingCheckOut,
      icon: LogOut,
      className: "bg-gradient-to-br from-rose-100 to-red-100 text-rose-700",
    },
    {
      label: "نسبة الحضور",
      value: `${rate}%`,
      icon: CheckSquare,
      className: "bg-teal-100 text-teal-700",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div key={stat.label} className="app-card app-card-hover p-5">
            <div className="flex items-center gap-4">
              <div
                className={[
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                  stat.className,
                ].join(" ")}
              >
                <Icon size={22} />
              </div>

              <div>
                <p className="text-sm font-bold text-[var(--app-text-muted)]">
                  {stat.label}
                </p>

                <p className="mt-1 text-3xl font-extrabold text-[var(--app-text)]">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Deferred Detail Notice ──────────────────────────────────────

function AttendanceDeferredNotice({ today }: { today: string }) {
  return (
    <section className="app-card overflow-hidden border-dashed border-indigo-200 bg-gradient-to-l from-indigo-50/70 to-white">
      <div className="grid gap-5 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-700">
          <ClipboardList size={28} />
        </div>

        <div>
          <h3 className="text-xl font-extrabold text-[var(--app-text)]">
            السجلات التفصيلية لا تُحمّل إلا عند الطلب
          </h3>
          <p className="mt-2 text-sm leading-7 text-[var(--app-text-muted)]">
            اختر حاضرون، غائبون، متأخرون، غير المنصرفين، أو استخدم الفلاتر المتقدمة. بهذه الطريقة تبقى واجهة الحضور سريعة ولا ينتظر المستخدم تحميل كل السجلات.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <a href={`/attendance?date=${today}&status=present`} className="btn btn-primary">
            <CheckCircle2 size={17} />
            حضور اليوم
          </a>
          <a href="/attendance?view=all" className="btn btn-secondary">
            <ClipboardList size={17} />
            عرض كل السجلات
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Search ──────────────────────────────────────────────────────

type AttendanceSearchFormProps = {
  filter: AttendanceFilter;
  classes: Awaited<ReturnType<typeof getClasses>>;
  sections: Awaited<ReturnType<typeof getSections>>;
  reportsHref: string;
};

function AttendanceSearchForm({
  filter,
  classes,
  sections,
  reportsHref,
}: AttendanceSearchFormProps) {
  return (
    <form action="/attendance" className="app-card p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label
            htmlFor="q"
            className="block text-sm font-extrabold text-[var(--app-text)]"
          >
            البحث والتصفية المتقدمة
          </label>
          <p className="mt-1 text-xs font-bold text-[var(--app-text-muted)]">
            يمكن الجمع بين التاريخ، الفترة، الحالة، الصف، الشعبة، مصدر التسجيل، والدخول/الانصراف.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <PrintButton label="طباعة هذه الصفحة" />
          <a href={reportsHref} className="btn btn-secondary">
            <FileText size={17} />
            فتح تقرير الحضور
          </a>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative xl:col-span-2">
          <Search
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]"
          />

          <input
            id="q"
            name="q"
            defaultValue={filter.query ?? ""}
            placeholder="اسم الطالب، الرمز، الصف، الشعبة، المادة، المدرس، الملاحظات..."
            autoComplete="off"
            className="input pr-11"
          />
        </div>

        <select
          id="attendance-status-filter"
          name="status"
          defaultValue={filter.status ?? ""}
          autoComplete="off"
          className="input"
        >
          <option value="">كل الحالات</option>
          {ATTENDANCE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <input
          id="attendance-date-filter"
          name="date"
          type="date"
          defaultValue={filter.date ?? ""}
          autoComplete="off"
          className="input"
          title="تاريخ محدد"
        />

        <input
          id="attendance-from-date-filter"
          name="fromDate"
          type="date"
          defaultValue={filter.fromDate ?? ""}
          autoComplete="off"
          className="input"
          title="من تاريخ"
        />

        <input
          id="attendance-to-date-filter"
          name="toDate"
          type="date"
          defaultValue={filter.toDate ?? ""}
          autoComplete="off"
          className="input"
          title="إلى تاريخ"
        />

        <select
          id="attendance-class-filter"
          name="classId"
          defaultValue={filter.classId ?? ""}
          autoComplete="off"
          className="input"
        >
          <option value="">كل الصفوف</option>
          {classes.map((schoolClass) => (
            <option key={schoolClass.id} value={schoolClass.id}>
              {schoolClass.name}
            </option>
          ))}
        </select>

        <select
          id="attendance-section-filter"
          name="sectionId"
          defaultValue={filter.sectionId ?? ""}
          autoComplete="off"
          className="input"
        >
          <option value="">كل الشعب</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.className} / {section.name}
            </option>
          ))}
        </select>

        <select
          id="attendance-source-filter"
          name="source"
          defaultValue={filter.source ?? ""}
          autoComplete="off"
          className="input"
        >
          <option value="">كل مصادر التسجيل</option>
          <option value="qr">QR</option>
          <option value="manual-code">رمز يدوي</option>
          <option value="manual-name">باسم الطالب</option>
          <option value="manual">يدوي</option>
        </select>

        <select
          id="attendance-check-in-filter"
          name="hasCheckIn"
          defaultValue={filter.hasCheckIn ?? ""}
          autoComplete="off"
          className="input"
        >
          <option value="">الدخول: الكل</option>
          <option value="yes">لديه دخول</option>
          <option value="no">بدون دخول</option>
        </select>

        <select
          id="attendance-check-out-filter"
          name="hasCheckOut"
          defaultValue={filter.hasCheckOut ?? ""}
          autoComplete="off"
          className="input"
        >
          <option value="">الانصراف: الكل</option>
          <option value="yes">لديه انصراف</option>
          <option value="no">بدون انصراف</option>
        </select>

        <select
          id="attendance-missing-checkout-filter"
          name="missingCheckOut"
          defaultValue={filter.missingCheckOut ?? ""}
          autoComplete="off"
          className="input"
        >
          <option value="">غير المنصرفين: الكل</option>
          <option value="yes">حضر ولم ينصرف</option>
        </select>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary">
          <Search size={17} />
          تطبيق الفلاتر
        </button>
        <a href="/attendance" className="btn btn-secondary">
          مسح الكل
        </a>
      </div>
    </form>
  );
}

// ─── Period Report ───────────────────────────────────────────────

type AbsentStudentInfo = {
  studentName: string;
  studentCode: string | null;
  className: string | null;
  sectionName: string | null;
  isComputedAbsence?: boolean;
};

type AttendancePeriodReportProps = {
  summary: AttendanceSummary;
  recordsCount: number;
  filter: AttendanceFilter;
  todayAbsentCount: number;
  todayAbsentStudents: AbsentStudentInfo[];
};

function AttendancePeriodReport({ summary, recordsCount, filter, todayAbsentCount, todayAbsentStudents }: AttendancePeriodReportProps) {
  const isTodayAbsentFilter = isTodayAbsentRequest(filter);

  const items = [
    { label: "السجلات المطابقة", value: recordsCount, icon: ClipboardList, className: "text-indigo-700 bg-indigo-50" },
    { label: "حضور فعلي", value: summary.checkedIn, icon: LogIn, className: "text-emerald-700 bg-emerald-50" },
    { label: "انصراف مسجل", value: summary.checkedOut, icon: LogOut, className: "text-amber-700 bg-amber-50" },
    { label: "مجازون", value: summary.excused, icon: ShieldCheck, className: "text-sky-700 bg-sky-50" },
  ];

  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-[var(--app-text)]">
            ملخص الفترة / الفلاتر المحددة
          </h3>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">
            هذا الملخص يتغير مباشرة حسب التاريخ، الحالة، الصف، الشعبة، ومصدر التسجيل.
          </p>
        </div>
        <span className="badge badge-info">نسبة الحضور {summary.attendanceRate}%</span>
      </div>

      {isTodayAbsentFilter && todayAbsentCount > 0 && (
        <div className="border-b border-red-100 bg-gradient-to-l from-red-50 to-rose-50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <XCircle size={28} />
            </div>
            <div>
              <h4 className="text-lg font-extrabold text-red-700">
                عدد الطلاب الذين لم يحضروا اليوم: {todayAbsentCount}
              </h4>
              <p className="mt-1 text-sm font-bold text-red-500">
                يشمل الطلاب المسجّل غيابهم فعليًا والطلاب الذين ليس لديهم سجل حضور اليوم (غياب محسوب).
              </p>
            </div>
          </div>
          <AbsentNamesToggle students={todayAbsentStudents} />
        </div>
      )}

      <div className="grid gap-3 p-5 md:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-3xl border border-[var(--app-border-soft)] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.className}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--app-text-muted)]">{item.label}</p>
                  <p className="mt-1 text-2xl font-extrabold text-[var(--app-text)]">{item.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Student Totals Report ───────────────────────────────────────

type StudentTotalsReportProps = {
  rows: AttendanceStudentTotal[];
};

function StudentTotalsReport({ rows }: StudentTotalsReportProps) {
  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-[var(--app-text)]">
            تقرير إجماليات الطلاب
          </h3>
          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            يعرض لكل طالب عدد الحضور، الغياب، التأخير، الإجازات، الدخول، الانصراف، وآخر حالة ضمن الفلاتر الحالية.
          </p>
        </div>

        <span className="badge badge-info">{rows.length} طالب</span>
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm font-bold text-[var(--app-text-muted)]">
          لا توجد بيانات طلاب مطابقة للفلاتر الحالية.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead>
              <tr className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-indigo-50/60 to-amber-50/40">
                <th className="px-5 py-3 text-right font-extrabold text-[var(--app-text-muted)]">الطالب</th>
                <th className="px-5 py-3 text-right font-extrabold text-[var(--app-text-muted)]">الصف / الشعبة</th>
                <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">الكل</th>
                <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">حاضر</th>
                <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">غائب</th>
                <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">متأخر</th>
                <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">مجاز</th>
                <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">دخول</th>
                <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">انصراف</th>
                <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">لم ينصرف</th>
                <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">النسبة</th>
                <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">آخر حالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border-soft)]">
              {rows.map((row) => (
                <tr key={row.studentId} className="transition hover:bg-indigo-50/40">
                  <td className="px-5 py-3">
                    <p className="font-extrabold text-[var(--app-text)]">{row.studentName}</p>
                    <p className="text-xs text-[var(--app-text-soft)]">{row.studentCode ?? "بدون رمز"}</p>
                  </td>
                  <td className="px-5 py-3 text-[var(--app-text-muted)]">
                    {row.className ?? "—"}{row.sectionName ? ` / ${row.sectionName}` : ""}
                  </td>
                  <td className="px-5 py-3 text-center font-bold text-[var(--app-text)]">{row.totalRecords}</td>
                  <td className="px-5 py-3 text-center font-bold text-emerald-600">{row.present}</td>
                  <td className="px-5 py-3 text-center font-bold text-red-600">{row.absent}</td>
                  <td className="px-5 py-3 text-center font-bold text-amber-600">{row.late}</td>
                  <td className="px-5 py-3 text-center font-bold text-sky-600">{row.excused}</td>
                  <td className="px-5 py-3 text-center font-bold text-emerald-700">{row.checkedIn}</td>
                  <td className="px-5 py-3 text-center font-bold text-amber-700">{row.checkedOut}</td>
                  <td className="px-5 py-3 text-center font-bold text-rose-600">{row.missingCheckOut}</td>
                  <td className="px-5 py-3 text-center font-extrabold text-[var(--app-text)]">{row.attendanceRate}%</td>
                  <td className="px-5 py-3 text-center">
                    {row.lastStatus ? (
                      <span className={["badge", getAttendanceStatusBadgeClass(row.lastStatus)].join(" ")}>
                        {row.lastStatusLabel}
                      </span>
                    ) : (
                      <span className="text-[var(--app-text-soft)]">—</span>
                    )}
                    {row.lastDate ? (
                      <p className="mt-1 text-xs text-[var(--app-text-soft)]">
                        {formatAttendanceShortDate(new Date(row.lastDate))}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── List ────────────────────────────────────────────────────────

type AttendanceListProps = {
  records: AttendanceListItem[];
};

function AttendanceList({ records }: AttendanceListProps) {
  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-[var(--app-text)]">
            جدول سجلات الحضور والانصراف
          </h3>

          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            السجلات التفصيلية المطابقة للفلاتر الحالية مع وقت الدخول والانصراف ومصدر التسجيل.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="badge badge-info">{records.length} سجل</span>
        </div>
      </div>

      <div className="divide-y divide-[var(--app-border-soft)]">
        {records.map((record) => (
          <AttendanceRow key={record.id} record={record} />
        ))}
      </div>
    </section>
  );
}

type AttendanceRowProps = {
  record: AttendanceListItem;
};

function AttendanceRow({ record }: AttendanceRowProps) {
  const statusClass = getAttendanceStatusBadgeClass(record.status);
  const sourceLabel = getAttendanceSourceLabel(record.source);

  return (
    <article className="grid gap-4 p-5 transition hover:bg-indigo-50/40 xl:grid-cols-[1fr_auto] xl:items-center">
      <div className="flex min-w-0 gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700">
          <UserRound size={25} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-extrabold text-[var(--app-text)]">
              {record.studentName}
            </h4>

            <span className={["badge", statusClass].join(" ")}>
              {record.statusLabel}
            </span>

            {record.isComputedAbsence && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700 border border-amber-200">
                غياب محسوب
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-sm text-[var(--app-text-muted)]">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold">
              <CheckSquare size={14} />
              {formatAttendanceShortDate(new Date(record.date))}
            </span>

            {record.studentCode ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold">
                {record.studentCode}
              </span>
            ) : null}

            {record.className ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold">
                <UsersRound size={14} />
                {record.className}
                {record.sectionName ? ` / ${record.sectionName}` : ""}
              </span>
            ) : null}

            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold">
              {sourceLabel}
            </span>
          </div>

          {(record.checkInAt || record.checkOutAt) && (
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {record.checkInAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-700">
                  حضور: {formatAttendanceTime(record.checkInAt)}
                </span>
              )}
              {record.checkOutAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 font-bold text-amber-700">
                  انصراف: {formatAttendanceTime(record.checkOutAt)}
                </span>
              )}
              {record.checkInAt && !record.checkOutAt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 font-bold text-rose-700">
                  لم يسجل انصراف
                </span>
              ) : null}
            </div>
          )}

          <div className="mt-3 grid gap-2 text-sm leading-6 text-[var(--app-text-muted)] md:grid-cols-2">
            {record.subjectName ? (
              <p>
                المادة: <span className="font-bold text-[var(--app-text)]">{record.subjectName}</span>
              </p>
            ) : null}

            {record.teacherName ? (
              <p>
                المدرس: <span className="font-bold text-[var(--app-text)]">{record.teacherName}</span>
              </p>
            ) : null}

            {record.dayOfWeek ? (
              <p>
                اليوم: <span className="font-bold text-[var(--app-text)]">{getDayLabel(record.dayOfWeek)}</span>
              </p>
            ) : null}

            {record.startTime && record.endTime ? (
              <p>
                الوقت: <span className="font-bold text-[var(--app-text)]">{record.startTime} - {record.endTime}</span>
              </p>
            ) : null}
          </div>

          {record.notes ? (
            <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
              ملاحظات: <span className="font-bold text-[var(--app-text)]">{record.notes}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 xl:w-[160px]">
        {!record.isComputedAbsence && (
          <DeleteConfirmButton
            action={deleteAttendanceAction}
            itemId={record.id}
            entityName="سجل الحضور"
            associations={[]}
          />
        )}
      </div>
    </article>
  );
}

function getDayLabel(day: string): string {
  switch (day) {
    case "saturday":
      return "السبت";
    case "sunday":
      return "الأحد";
    case "monday":
      return "الاثنين";
    case "tuesday":
      return "الثلاثاء";
    case "wednesday":
      return "الأربعاء";
    case "thursday":
      return "الخميس";
    case "friday":
      return "الجمعة";
    default:
      return day;
  }
}

function getAttendanceSourceLabel(source: string | null): string {
  if (source === "qr") return "QR";
  if (source === "manual-code") return "رمز يدوي";
  if (source === "manual-name") return "باسم الطالب";
  if (source === "manual") return "يدوي";
  return "غير محدد";
}

function getDateInputValue(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function hasAttendanceFilter(filter: AttendanceFilter): boolean {
  return Boolean(
    filter.query ||
      filter.status ||
      filter.date ||
      filter.fromDate ||
      filter.toDate ||
      filter.classId ||
      filter.sectionId ||
      filter.scheduleId ||
      filter.source ||
      filter.hasCheckIn ||
      filter.hasCheckOut ||
      filter.missingCheckOut,
  );
}

function isTodayAbsentRequest(filter: AttendanceFilter): boolean {
  return filter.date === getDateInputValue(new Date()) && filter.status === "absent";
}

function buildReportsHref(filter: AttendanceFilter): string {
  const params = new URLSearchParams();
  params.set("tab", "attendance");
  params.set("period", "custom");

  const fromDate = filter.date || filter.fromDate;
  const toDate = filter.date || filter.toDate;

  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  if (filter.classId) params.set("classId", filter.classId);
  if (filter.sectionId) params.set("sectionId", filter.sectionId);
  if (filter.status) params.set("status", filter.status);
  if (filter.source) params.set("source", filter.source);
  if (filter.missingCheckOut) params.set("missingCheckOut", filter.missingCheckOut);

  return `/reports?${params.toString()}`;
}
