"use client";

/* ─────────────────────────────────────────────
 *  Reports Page  (file 54)
 * ───────────────────────────────────────────── */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  DollarSign,
  GraduationCap,
  Landmark,
  Loader2,
  RefreshCw,
  School,
  Users,
  X,
} from "lucide-react";

import { PrintButton } from "@/components/reports/print-button";
import {
  formatReportMoney,
  formatReportNumber,
  formatReportPercent,
  type AttendanceReportRow,
  type ClassReportRow,
  type DashboardCharts,
  type DashboardSummary,
  type GradeReportRow,
  type PaymentReportRow,
  type ReportFilter,
  type ReportPeriod,
  type TeacherReportRow,
} from "@/types/report";
import { ATTENDANCE_STATUSES } from "@/types/attendance";
import {
  calculateChartBarWidth,
  calculateSharePercent,
  getChartMaxValue,
} from "@/services/report-view-model-service";

// ── Periods ──────────────────────────────────

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "daily", label: "يومي" },
  { value: "weekly", label: "أسبوعي" },
  { value: "monthly", label: "شهري" },
  { value: "quarterly", label: "ربع سنوي" },
  { value: "semester", label: "فصلي" },
  { value: "annual", label: "سنوي" },
  { value: "custom", label: "مخصص" },
];

// ── Main Page ────────────────────────────────

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const initialPeriod = (searchParams.get("period") as ReportPeriod | null) ?? "monthly";

  const [filter, setFilter] = useState<ReportFilter>({
    period: PERIODS.some((period) => period.value === initialPeriod)
      ? initialPeriod
      : "monthly",
    fromDate: searchParams.get("fromDate") ?? undefined,
    toDate: searchParams.get("toDate") ?? undefined,
    classId: searchParams.get("classId") ?? undefined,
    sectionId: searchParams.get("sectionId") ?? undefined,
    subjectId: searchParams.get("subjectId") ?? undefined,
    teacherId: searchParams.get("teacherId") ?? undefined,
    studentId: searchParams.get("studentId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    term: searchParams.get("term") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    missingCheckOut: searchParams.get("missingCheckOut") === "yes",
  });

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceReportRow[]>(
    [],
  );
  const [gradeRows, setGradeRows] = useState<GradeReportRow[]>([]);
  const [paymentRows, setPaymentRows] = useState<PaymentReportRow[]>([]);
  const [classRows, setClassRows] = useState<ClassReportRow[]>([]);
  const [teacherRows, setTeacherRows] = useState<TeacherReportRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<
    "summary" | "attendance" | "grades" | "payments" | "classes" | "teachers"
  >(
    initialTab === "attendance" ||
      initialTab === "grades" ||
      initialTab === "payments" ||
      initialTab === "classes" ||
      initialTab === "teachers"
      ? initialTab
      : "summary",
  );

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("period", filter.period);

      if (filter.fromDate) params.set("fromDate", filter.fromDate);
      if (filter.toDate) params.set("toDate", filter.toDate);
      if (filter.classId) params.set("classId", filter.classId);
      if (filter.sectionId) params.set("sectionId", filter.sectionId);
      if (filter.subjectId) params.set("subjectId", filter.subjectId);
      if (filter.teacherId) params.set("teacherId", filter.teacherId);
      if (filter.studentId) params.set("studentId", filter.studentId);
      if (filter.status) params.set("status", filter.status);
      if (filter.term) params.set("term", filter.term);
      if (filter.source) params.set("source", filter.source);
      if (filter.missingCheckOut) params.set("missingCheckOut", "yes");

      const response = await fetch(`/api/reports?type=all&${params.toString()}`, { cache: "no-store" });
      const reportData = await response.json();

      if (!response.ok || !reportData.ok) {
        throw new Error(reportData.message || "Failed to load reports");
      }

      setSummary(reportData.data.summary);
      setCharts(reportData.data.charts);
      setAttendanceRows(reportData.data.attendance);
      setGradeRows(reportData.data.grades);
      setPaymentRows(reportData.data.payments);
      setClassRows(reportData.data.classes);
      setTeacherRows(reportData.data.teachers);
    } catch {
      setError("حدث خطأ أثناء تحميل التقرير. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div className="mx-auto flex w-full max-w-[1350px] flex-col gap-6">
      {/* Page Header */}
      <section className="app-card overflow-hidden">
        <div className="flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-100 to-sky-100 text-teal-700 sm:flex">
              <BarChart3 size={26} />
            </div>

            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="badge badge-info">التقارير</span>
              </div>

              <h2 className="app-title">التقارير والإحصائيات</h2>

              <p className="app-subtitle mt-2 max-w-3xl">
                استخرج تقارير مفصلة عن الطلاب، الحضور، الدرجات، والأقساط مع
                إمكانية الطباعة.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
            <PrintButton />
          </div>
        </div>
      </section>

      {/* Filter Form */}
      <ReportFilterForm
        filter={filter}
        onFilterChange={setFilter}
        onRefresh={fetchReport}
        loading={loading}
      />

      {/* Error */}
      {error ? (
        <div className="smart-alert smart-alert-danger">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <X size={20} />
          </div>
          <div>
            <p className="font-extrabold text-red-700">خطأ في التحميل</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        </div>
      ) : null}

      {/* Report Cover */}
      <ReportCover filter={filter} summary={summary} />

      {/* Tabs */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {([
          { key: "summary", label: "ملخص عام", icon: BarChart3 },
          { key: "attendance", label: "الحضور", icon: CheckCircle2 },
          { key: "grades", label: "الدرجات", icon: ClipboardList },
          { key: "payments", label: "الأقساط", icon: DollarSign },
          { key: "classes", label: "الصفوف", icon: Landmark },
          { key: "teachers", label: "المدرسين", icon: GraduationCap },
        ] as const).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition",
                isActive
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "border-[var(--app-border)] bg-white text-[var(--app-text-muted)] hover:border-teal-200 hover:text-[var(--primary)] hover:shadow-sm hover:shadow-teal-100/50",
              ].join(" ")}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="app-card flex flex-col items-center justify-center gap-4 p-12">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
          <p className="text-sm font-bold text-[var(--app-text-muted)]">
            جارٍ تحميل التقرير...
          </p>
        </div>
      ) : (
        <>
          {/* Summary Tab */}
          {activeTab === "summary" && summary ? (
            <SummaryReport summary={summary} charts={charts} />
          ) : null}

          {/* Attendance Tab */}
          {activeTab === "attendance" ? (
            <AttendanceTable rows={attendanceRows} />
          ) : null}

          {/* Grades Tab */}
          {activeTab === "grades" ? (
            <GradesTable rows={gradeRows} />
          ) : null}

          {/* Payments Tab */}
          {activeTab === "payments" ? (
            <PaymentsTable rows={paymentRows} />
          ) : null}

          {/* Classes Tab */}
          {activeTab === "classes" ? (
            <ClassesTable rows={classRows} />
          ) : null}

          {/* Teachers Tab */}
          {activeTab === "teachers" ? (
            <TeachersTable rows={teacherRows} />
          ) : null}
        </>
      )}

      <ReportsPrintStyles />
    </div>
  );
}

// ── Filter Form ──────────────────────────────

type ReportFilterFormProps = {
  filter: ReportFilter;
  onFilterChange: (filter: ReportFilter) => void;
  onRefresh: () => void;
  loading: boolean;
};

function ReportFilterForm({
  filter,
  onFilterChange,
  onRefresh,
  loading,
}: ReportFilterFormProps) {
  function updateFilter(partial: Partial<ReportFilter>) {
    onFilterChange({ ...filter, ...partial });
  }

  return (
    <section className="app-card overflow-hidden">
      <div className="border-b border-[var(--app-border-soft)] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-teal-100 text-blue-700">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-[var(--app-text)]">
              خيارات التقرير
            </h3>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              اختر الفترة الزمنية والفلاتر المطلوبة
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5">
        <div className="grid gap-5 md:grid-cols-3">
          {/* Period */}
          <div>
            <label
              htmlFor="period"
              className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
            >
              الفترة
            </label>
            <div className="relative">
              <select
                id="period"
                name="period"
                autoComplete="off"
                value={filter.period}
                onChange={(e) =>
                  updateFilter({ period: e.target.value as ReportPeriod })
                }
                className="input appearance-none"
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]"
              />
            </div>
          </div>

          {/* From Date */}
          {filter.period === "custom" ? (
            <div>
              <label
                htmlFor="fromDate"
                className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
              >
                من تاريخ
              </label>
              <input
                id="fromDate"
                name="fromDate"
                type="date"
                autoComplete="off"
                value={filter.fromDate ?? ""}
                onChange={(e) => updateFilter({ fromDate: e.target.value })}
                className="input"
              />
            </div>
          ) : null}

          {/* To Date */}
          {filter.period === "custom" ? (
            <div>
              <label
                htmlFor="toDate"
                className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
              >
                إلى تاريخ
              </label>
              <input
                id="toDate"
                name="toDate"
                type="date"
                autoComplete="off"
                value={filter.toDate ?? ""}
                onChange={(e) => updateFilter({ toDate: e.target.value })}
                className="input"
              />
            </div>
          ) : null}

          {/* Term */}
          <div>
            <label
              htmlFor="term"
              className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
            >
              الفصل الدراسي
            </label>
            <div className="relative">
              <select
                id="term"
                name="term"
                autoComplete="off"
                value={filter.term ?? ""}
                onChange={(e) => updateFilter({ term: e.target.value || undefined })}
                className="input appearance-none"
              >
                <option value="">كل الفصول</option>
                <option value="first">الفصل الأول</option>
                <option value="second">الفصل الثاني</option>
                <option value="annual">السعي السنوي</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]"
              />
            </div>
          </div>

          {/* Attendance Status */}
          <div>
            <label
              htmlFor="report-attendance-status"
              className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
            >
              حالة الحضور
            </label>
            <div className="relative">
              <select
                id="report-attendance-status"
                name="status"
                autoComplete="off"
                value={filter.status ?? ""}
                onChange={(e) => updateFilter({ status: e.target.value || undefined })}
                className="input appearance-none"
              >
                <option value="">كل حالات الحضور</option>
                {ATTENDANCE_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]"
              />
            </div>
          </div>

          {/* Attendance Source */}
          <div>
            <label
              htmlFor="report-attendance-source"
              className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
            >
              مصدر تسجيل الحضور
            </label>
            <div className="relative">
              <select
                id="report-attendance-source"
                name="source"
                autoComplete="off"
                value={filter.source ?? ""}
                onChange={(e) => updateFilter({ source: e.target.value || undefined })}
                className="input appearance-none"
              >
                <option value="">كل المصادر</option>
                <option value="qr">QR</option>
                <option value="manual-code">رمز يدوي</option>
                <option value="manual-name">باسم الطالب</option>
                <option value="manual">يدوي</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]"
              />
            </div>
          </div>

          {/* Missing Checkout */}
          <div>
            <label
              htmlFor="report-missing-checkout"
              className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
            >
              الانصراف
            </label>
            <div className="relative">
              <select
                id="report-missing-checkout"
                name="missingCheckOut"
                autoComplete="off"
                value={filter.missingCheckOut ? "yes" : ""}
                onChange={(e) => updateFilter({ missingCheckOut: e.target.value === "yes" })}
                className="input appearance-none"
              >
                <option value="">كل سجلات الانصراف</option>
                <option value="yes">حضر ولم يسجل انصراف</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--app-border-soft)] pt-5">
          <p className="text-sm text-[var(--app-text-muted)]">
            غيّر الفلاتر ثم اضغط تحديث لرؤية النتائج.
          </p>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="btn btn-primary"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            تحديث التقرير
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Report Cover ─────────────────────────────

type ReportCoverProps = {
  filter: ReportFilter;
  summary: DashboardSummary | null;
};

function ReportCover({ filter, summary }: ReportCoverProps) {
  const periodLabel =
    PERIODS.find((p) => p.value === filter.period)?.label ?? filter.period;

  return (
    <section className="report-cover app-card overflow-hidden print:shadow-none">
      <div className="flex flex-col items-center gap-4 border-b border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50 to-sky-50 p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-100 to-sky-100 text-teal-700">
          <School size={40} />
        </div>

        <div>
          <h2 className="text-3xl font-extrabold text-[var(--app-text)]">
            تقرير SchoolPro
          </h2>
          <p className="mt-2 text-lg font-bold text-[var(--app-text-muted)]">
            {periodLabel} —{" "}
            {new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }).format(new Date())}
          </p>
        </div>

        {summary ? (
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            <CoverStat
              icon={Users}
              label="الطلاب"
              value={summary.students.total}
              color="bg-gradient-to-br from-blue-100 to-teal-100 text-blue-700"
            />
            <CoverStat
              icon={GraduationCap}
              label="المدرسين"
              value={summary.teachers.total}
              color="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700"
            />
            <CoverStat
              icon={Landmark}
              label="الصفوف"
              value={summary.classes.total}
              color="bg-gradient-to-br from-sky-100 to-orange-100 text-sky-700"
            />
            <CoverStat
              icon={BookOpen}
              label="المواد"
              value={summary.subjects.total}
              color="bg-gradient-to-br from-purple-100 to-sky-100 text-purple-700"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

type CoverStatProps = {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
};

function CoverStat({ icon: Icon, label, value, color }: CoverStatProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}
      >
        <Icon size={18} />
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-[var(--app-text-muted)]">{label}</p>
        <p className="text-xl font-extrabold text-[var(--app-text)]">
          {formatReportNumber(value)}
        </p>
      </div>
    </div>
  );
}

// ── Summary Report ───────────────────────────

type SummaryReportProps = {
  summary: DashboardSummary;
  charts: DashboardCharts | null;
};

function SummaryReport({ summary, charts }: SummaryReportProps) {
  return (
    <div className="grid gap-6">
      {/* Key Stats */}
      <div className="stat-grid">
        <SummaryStatCard
          icon={Users}
          label="إجمالي الطلاب"
          value={summary.students.total}
          detail={`${summary.students.active} مستمر`}
          color="bg-gradient-to-br from-blue-100 to-teal-100 text-blue-700"
        />
        <SummaryStatCard
          icon={CheckCircle2}
          label="نسبة الحضور"
          value={`${summary.attendance.attendanceRate}%`}
          detail={`${formatReportNumber(summary.attendance.totalRecords)} سجل`}
          color="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700"
        />
        <SummaryStatCard
          icon={ClipboardList}
          label="متوسط الدرجات"
          value={`${summary.grades.averagePercentage}%`}
          detail={`نسبة النجاح ${summary.grades.passingRate}%`}
          color="bg-gradient-to-br from-purple-100 to-sky-100 text-purple-700"
        />
        <SummaryStatCard
          icon={DollarSign}
          label="نسبة التحصيل"
          value={`${summary.payments.collectionRate}%`}
          detail={formatReportMoney(summary.payments.totalPaid)}
          color="bg-gradient-to-br from-sky-100 to-orange-100 text-sky-700"
        />
      </div>

      {/* Detailed Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Students Details */}
        <div className="app-card overflow-hidden">
          <div className="border-b border-[var(--app-border-soft)] p-5">
            <h3 className="text-lg font-extrabold text-[var(--app-text)]">
              تفاصيل الطلاب
            </h3>
          </div>
          <div className="p-5">
            <div className="grid gap-3">
              <SummaryDetailRow
                label="مستمرون"
                value={summary.students.active}
                total={summary.students.total}
                color="bg-emerald-500"
              />
              <SummaryDetailRow
                label="متوقفون"
                value={summary.students.inactive}
                total={summary.students.total}
                color="bg-sky-500"
              />
              <SummaryDetailRow
                label="متخرجون"
                value={summary.students.graduated}
                total={summary.students.total}
                color="bg-blue-500"
              />
              <SummaryDetailRow
                label="منقولون"
                value={summary.students.transferred}
                total={summary.students.total}
                color="bg-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Attendance Details */}
        <div className="app-card overflow-hidden">
          <div className="border-b border-[var(--app-border-soft)] p-5">
            <h3 className="text-lg font-extrabold text-[var(--app-text)]">
              تفاصيل الحضور
            </h3>
          </div>
          <div className="p-5">
            <div className="grid gap-3">
              <SummaryDetailRow
                label="حاضرون"
                value={summary.attendance.present}
                total={summary.attendance.totalRecords}
                color="bg-emerald-500"
              />
              <SummaryDetailRow
                label="غائبون"
                value={summary.attendance.absent}
                total={summary.attendance.totalRecords}
                color="bg-red-500"
              />
              <SummaryDetailRow
                label="متأخرون"
                value={summary.attendance.late}
                total={summary.attendance.totalRecords}
                color="bg-sky-500"
              />
              <SummaryDetailRow
                label="مجازون"
                value={summary.attendance.excused}
                total={summary.attendance.totalRecords}
                color="bg-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Grades Details */}
        <div className="app-card overflow-hidden">
          <div className="border-b border-[var(--app-border-soft)] p-5">
            <h3 className="text-lg font-extrabold text-[var(--app-text)]">
              تفاصيل الدرجات
            </h3>
          </div>
          <div className="p-5">
            <div className="grid gap-3">
              <SummaryDetailRow
                label="ممتاز (90%+)"
                value={summary.grades.excellentCount}
                total={summary.grades.totalRecords}
                color="bg-emerald-500"
              />
              <SummaryDetailRow
                label="ناجح (50%+)"
                value={summary.grades.passingCount}
                total={summary.grades.totalRecords}
                color="bg-blue-500"
              />
              <SummaryDetailRow
                label="راسب (أقل من 50%)"
                value={summary.grades.failingCount}
                total={summary.grades.totalRecords}
                color="bg-red-500"
              />
            </div>
          </div>
        </div>

        {/* Payments Details */}
        <div className="app-card overflow-hidden">
          <div className="border-b border-[var(--app-border-soft)] p-5">
            <h3 className="text-lg font-extrabold text-[var(--app-text)]">
              تفاصيل الأقساط
            </h3>
          </div>
          <div className="p-5">
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-sm font-bold text-[var(--app-text-muted)]">
                  إجمالي الأقساط
                </span>
                <span className="text-sm font-extrabold text-[var(--app-text)]">
                  {formatReportMoney(summary.payments.totalFees)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3">
                <span className="text-sm font-bold text-emerald-700">
                  المدفوع
                </span>
                <span className="text-sm font-extrabold text-emerald-700">
                  {formatReportMoney(summary.payments.totalPaid)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-red-50 p-3">
                <span className="text-sm font-bold text-red-700">
                  المتبقي
                </span>
                <span className="text-sm font-extrabold text-red-700">
                  {formatReportMoney(summary.payments.totalRemaining)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Bars (Simple CSS-based) */}
      {charts ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Attendance Distribution */}
          <div className="app-card overflow-hidden">
            <div className="border-b border-[var(--app-border-soft)] p-5">
              <h3 className="text-lg font-extrabold text-[var(--app-text)]">
                توزيع الحضور
              </h3>
            </div>
            <div className="p-5">
              <ChartBar data={charts.attendanceDistribution} />
            </div>
          </div>

          {/* Grade Distribution */}
          <div className="app-card overflow-hidden">
            <div className="border-b border-[var(--app-border-soft)] p-5">
              <h3 className="text-lg font-extrabold text-[var(--app-text)]">
                توزيع الدرجات
              </h3>
            </div>
            <div className="p-5">
              <ChartBar data={charts.gradeDistribution} />
            </div>
          </div>

          {/* Payment Status */}
          <div className="app-card overflow-hidden">
            <div className="border-b border-[var(--app-border-soft)] p-5">
              <h3 className="text-lg font-extrabold text-[var(--app-text)]">
                حالات الأقساط
              </h3>
            </div>
            <div className="p-5">
              <ChartBar data={charts.paymentStatusDistribution} />
            </div>
          </div>

          {/* Students per Class */}
          <div className="app-card overflow-hidden">
            <div className="border-b border-[var(--app-border-soft)] p-5">
              <h3 className="text-lg font-extrabold text-[var(--app-text)]">
                الطلاب حسب الصف
              </h3>
            </div>
            <div className="p-5">
              <ChartBar data={charts.studentsPerClass} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Summary Stat Card ────────────────────────

type SummaryStatCardProps = {
  icon: React.ElementType;
  label: string;
  value: string | number;
  detail: string;
  color: string;
};

function SummaryStatCard({
  icon: Icon,
  label,
  value,
  detail,
  color,
}: SummaryStatCardProps) {
  return (
    <div className="app-card app-card-hover p-5">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${color}`}
        >
          <Icon size={24} />
        </div>

        <div>
          <p className="text-sm font-bold text-[var(--app-text-muted)]">
            {label}
          </p>
          <p className="mt-1 text-3xl font-extrabold text-[var(--app-text)]">
            {value}
          </p>
          <p className="mt-1 text-xs text-[var(--app-text-soft)]">{detail}</p>
        </div>
      </div>
    </div>
  );
}

// ── Summary Detail Row ───────────────────────

type SummaryDetailRowProps = {
  label: string;
  value: number;
  total: number;
  color: string;
};

function SummaryDetailRow({
  label,
  value,
  total,
  color,
}: SummaryDetailRowProps) {
  const pct = calculateSharePercent(value, total);

  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
      <div className={`h-3 w-3 shrink-0 rounded-full ${color}`} />
      <span className="flex-1 text-sm font-bold text-[var(--app-text-muted)]">
        {label}
      </span>
      <span className="text-sm font-extrabold text-[var(--app-text)]">
        {formatReportNumber(value)}
      </span>
      <span className="text-xs text-[var(--app-text-soft)]">
        ({formatReportPercent(pct)})
      </span>
    </div>
  );
}

// ── Chart Bar (Simple CSS) ───────────────────

type ChartBarProps = {
  data: { label: string; value: number; color?: string }[];
};

function ChartBar({ data }: ChartBarProps) {
  const maxValue = getChartMaxValue(data);

  return (
    <div className="grid gap-3">
      {data.map((item) => (
        <div key={item.label} className="grid gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-[var(--app-text-muted)]">
              {item.label}
            </span>
            <span className="font-extrabold text-[var(--app-text)]">
              {formatReportNumber(item.value)}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${calculateChartBarWidth(item.value, maxValue)}%`,
                backgroundColor: item.color ?? "var(--primary)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Attendance Table ─────────────────────────

type AttendanceTableProps = {
  rows: AttendanceReportRow[];
};

function AttendanceTable({ rows }: AttendanceTableProps) {
  if (rows.length === 0) {
    return (
      <div className="app-card flex flex-col items-center justify-center gap-3 p-12">
        <CheckCircle2
          size={40}
          className="text-[var(--app-text-soft)]"
        />
        <p className="text-sm font-bold text-[var(--app-text-muted)]">
          لا توجد سجلات حضور في الفترة المحددة.
        </p>
      </div>
    );
  }

  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-[var(--app-text)]">
            تقرير الحضور المفصل
          </h3>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">
            إجماليات كل طالب مع الحضور، الغياب، التأخير، الإجازات، الدخول، الانصراف، وآخر حالة.
          </p>
        </div>
        <span className="badge badge-info">
          {formatReportNumber(rows.length)} طالب
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-sm">
          <thead>
            <tr className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/60 to-sky-50/40">
              <th className="px-5 py-3 text-right font-extrabold text-[var(--app-text-muted)]">الطالب</th>
              <th className="px-5 py-3 text-right font-extrabold text-[var(--app-text-muted)]">الصف / الشعبة</th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">السجلات</th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">حاضر</th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">غائب</th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">متأخر</th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">مجاز</th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">دخول</th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">انصراف</th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">لم ينصرف</th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">المصدر</th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">آخر مدة</th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">النسبة</th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">آخر حالة</th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">التقييم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border-soft)]">
            {rows.map((row) => (
              <tr
                key={row.studentId}
                className="transition hover:bg-teal-50/40"
              >
                <td className="px-5 py-3">
                  <div>
                    <p className="font-extrabold text-[var(--app-text)]">
                      {row.studentName}
                    </p>
                    <p className="text-xs text-[var(--app-text-soft)]">
                      {row.studentCode ?? "بدون رقم"}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-3 text-[var(--app-text-muted)]">
                  {row.className ?? "—"}{row.sectionName ? ` / ${row.sectionName}` : ""}
                </td>
                <td className="px-5 py-3 text-center font-bold text-[var(--app-text)]">
                  {row.totalSessions}
                </td>
                <td className="px-5 py-3 text-center font-bold text-emerald-600">
                  {row.present}
                </td>
                <td className="px-5 py-3 text-center font-bold text-red-600">
                  {row.absent}
                </td>
                <td className="px-5 py-3 text-center font-bold text-sky-600">
                  {row.late}
                </td>
                <td className="px-5 py-3 text-center font-bold text-sky-600">
                  {row.excused}
                </td>
                <td className="px-5 py-3 text-center font-bold text-emerald-700">
                  {row.checkedIn}
                </td>
                <td className="px-5 py-3 text-center font-bold text-sky-700">
                  {row.checkedOut}
                </td>
                <td className="px-5 py-3 text-center font-bold text-rose-600">
                  {row.missingCheckOut}
                </td>
                <td className="px-5 py-3 text-center text-[var(--app-text-muted)]">
                  {getReportSourceLabel(row.source)}
                </td>
                <td className="px-5 py-3 text-center text-[var(--app-text-muted)]">
                  {row.duration ?? "—"}
                </td>
                <td className="px-5 py-3 text-center font-extrabold text-[var(--app-text)]">
                  {formatReportPercent(row.attendanceRate)}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="font-bold text-[var(--app-text)]">
                    {row.lastStatusLabel ?? "—"}
                  </span>
                  {row.lastDate ? (
                    <p className="mt-1 text-xs text-[var(--app-text-soft)]">
                      {new Date(row.lastDate).toLocaleDateString("ar-IQ-u-nu-latn")}
                    </p>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-center">
                  <span
                    className={[
                      "badge",
                      row.attendanceRate >= 90
                        ? "badge-success"
                        : row.attendanceRate >= 70
                          ? "badge-info"
                          : row.attendanceRate >= 50
                            ? "badge-warning"
                            : "badge-danger",
                    ].join(" ")}
                  >
                    {row.attendanceRating}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function getReportSourceLabel(source: string | null): string {
  if (source === "qr") return "QR";
  if (source === "manual-code") return "رمز يدوي";
  if (source === "manual-name") return "باسم الطالب";
  if (source === "manual") return "يدوي";
  return "—";
}


// ── Grades Table ─────────────────────────────

type GradesTableProps = {
  rows: GradeReportRow[];
};

function GradesTable({ rows }: GradesTableProps) {
  if (rows.length === 0) {
    return (
      <div className="app-card flex flex-col items-center justify-center gap-3 p-12">
        <ClipboardList
          size={40}
          className="text-[var(--app-text-soft)]"
        />
        <p className="text-sm font-bold text-[var(--app-text-muted)]">
          لا توجد درجات في الفترة المحددة.
        </p>
      </div>
    );
  }

  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-[var(--app-text)]">
            تقرير الدرجات
          </h3>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">
            درجات الطلاب حسب المادة والامتحان
          </p>
        </div>
        <span className="badge badge-info">
          {formatReportNumber(rows.length)} سجل
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/60 to-sky-50/40">
              <th className="px-5 py-3 text-right font-extrabold text-[var(--app-text-muted)]">
                الطالب
              </th>
              <th className="px-5 py-3 text-right font-extrabold text-[var(--app-text-muted)]">
                المادة
              </th>
              <th className="px-5 py-3 text-right font-extrabold text-[var(--app-text-muted)]">
                الامتحان
              </th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">
                الدرجة
              </th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">
                النسبة
              </th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">
                التقييم
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border-soft)]">
            {rows.map((row, idx) => (
              <tr
                key={`${row.studentId}-${row.subjectName}-${idx}`}
                className="transition hover:bg-teal-50/40"
              >
                <td className="px-5 py-3">
                  <div>
                    <p className="font-extrabold text-[var(--app-text)]">
                      {row.studentName}
                    </p>
                    <p className="text-xs text-[var(--app-text-soft)]">
                      {row.className ?? "—"} / {row.sectionName ?? "—"}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-3 text-[var(--app-text)]">
                  {row.subjectName}
                </td>
                <td className="px-5 py-3 text-[var(--app-text-muted)]">
                  {row.examName}
                </td>
                <td className="px-5 py-3 text-center font-bold text-[var(--app-text)]">
                  {row.score}/{row.maxScore}
                </td>
                <td className="px-5 py-3 text-center font-extrabold text-[var(--app-text)]">
                  {formatReportPercent(row.percentage)}
                </td>
                <td className="px-5 py-3 text-center">
                  <span
                    className={[
                      "badge",
                      row.percentage >= 90
                        ? "badge-success"
                        : row.percentage >= 70
                          ? "badge-info"
                          : row.percentage >= 50
                            ? "badge-warning"
                            : "badge-danger",
                    ].join(" ")}
                  >
                    {row.rating}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Payments Table ───────────────────────────

type PaymentsTableProps = {
  rows: PaymentReportRow[];
};

function PaymentsTable({ rows }: PaymentsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="app-card flex flex-col items-center justify-center gap-3 p-12">
        <DollarSign size={40} className="text-[var(--app-text-soft)]" />
        <p className="text-sm font-bold text-[var(--app-text-muted)]">
          لا توجد أقساط في الفترة المحددة.
        </p>
      </div>
    );
  }

  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-[var(--app-text)]">
            تقرير الأقساط
          </h3>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">
            حالة الأقساط والمدفوعات لكل طالب
          </p>
        </div>
        <span className="badge badge-info">
          {formatReportNumber(rows.length)} قسط
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/60 to-sky-50/40">
              <th className="px-5 py-3 text-right font-extrabold text-[var(--app-text-muted)]">
                الطالب
              </th>
              <th className="px-5 py-3 text-right font-extrabold text-[var(--app-text-muted)]">
                القسط
              </th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">
                المبلغ
              </th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">
                الحالة
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border-soft)]">
            {rows.map((row, idx) => (
              <tr
                key={`${row.studentId}-${row.feeTitle}-${idx}`}
                className="transition hover:bg-teal-50/40"
              >
                <td className="px-5 py-3">
                  <div>
                    <p className="font-extrabold text-[var(--app-text)]">
                      {row.studentName}
                    </p>
                    <p className="text-xs text-[var(--app-text-soft)]">
                      {row.className ?? "—"}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-3 text-[var(--app-text-muted)]">
                  {row.feeTitle}
                </td>
                <td className="px-5 py-3 text-center font-bold text-[var(--app-text)]">
                  {formatReportMoney(row.amount)}
                </td>
                <td className="px-5 py-3 text-center">
                  <span
                    className={[
                      "badge",
                      row.status === "paid"
                        ? "badge-success"
                        : row.status === "partial"
                          ? "badge-warning"
                          : row.status === "pending"
                            ? "badge-danger"
                            : "badge-info",
                    ].join(" ")}
                  >
                    {row.statusLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Classes Table ────────────────────────────

type ClassesTableProps = {
  rows: ClassReportRow[];
};

function ClassesTable({ rows }: ClassesTableProps) {
  if (rows.length === 0) {
    return (
      <div className="app-card flex flex-col items-center justify-center gap-3 p-12">
        <Landmark size={40} className="text-[var(--app-text-soft)]" />
        <p className="text-sm font-bold text-[var(--app-text-muted)]">
          لا توجد صفوف مسجلة.
        </p>
      </div>
    );
  }

  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-[var(--app-text)]">
            تقرير الصفوف
          </h3>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">
            ملخص الصفوف والشُعب والطلاب
          </p>
        </div>
        <span className="badge badge-info">
          {formatReportNumber(rows.length)} صف
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/60 to-sky-50/40">
              <th className="px-5 py-3 text-right font-extrabold text-[var(--app-text-muted)]">
                الصف
              </th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">
                المرحلة
              </th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">
                الشُعب
              </th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">
                الطلاب
              </th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">
                المواد
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border-soft)]">
            {rows.map((row) => (
              <tr
                key={row.classId}
                className="transition hover:bg-teal-50/40"
              >
                <td className="px-5 py-3 font-extrabold text-[var(--app-text)]">
                  {row.className}
                </td>
                <td className="px-5 py-3 text-center text-[var(--app-text-muted)]">
                  {row.level ?? "—"}
                </td>
                <td className="px-5 py-3 text-center font-bold text-[var(--app-text)]">
                  {row.sectionsCount}
                </td>
                <td className="px-5 py-3 text-center font-bold text-blue-600">
                  {row.studentsCount}
                </td>
                <td className="px-5 py-3 text-center font-bold text-purple-600">
                  {row.subjectsCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Teachers Table ───────────────────────────

type TeachersTableProps = {
  rows: TeacherReportRow[];
};

function TeachersTable({ rows }: TeachersTableProps) {
  if (rows.length === 0) {
    return (
      <div className="app-card flex flex-col items-center justify-center gap-3 p-12">
        <GraduationCap
          size={40}
          className="text-[var(--app-text-soft)]"
        />
        <p className="text-sm font-bold text-[var(--app-text-muted)]">
          لا يوجد مدرسون مسجلون.
        </p>
      </div>
    );
  }

  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-[var(--app-text)]">
            تقرير المدرسين
          </h3>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">
            ملخص المدرسين والمواد والمحاضرات
          </p>
        </div>
        <span className="badge badge-info">
          {formatReportNumber(rows.length)} مدرس
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/60 to-sky-50/40">
              <th className="px-5 py-3 text-right font-extrabold text-[var(--app-text-muted)]">
                المدرس
              </th>
              <th className="px-5 py-3 text-right font-extrabold text-[var(--app-text-muted)]">
                التخصص
              </th>
              <th className="px-5 py-3 text-right font-extrabold text-[var(--app-text-muted)]">
                المواد
              </th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">
                عدد المواد
              </th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">
                عدد المحاضرات
              </th>
              <th className="px-5 py-3 text-center font-extrabold text-[var(--app-text-muted)]">
                الحالة
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border-soft)]">
            {rows.map((row) => (
              <tr
                key={row.teacherId}
                className="transition hover:bg-teal-50/40"
              >
                <td className="px-5 py-3 font-extrabold text-[var(--app-text)]">
                  {row.teacherName}
                </td>
                <td className="px-5 py-3 text-[var(--app-text-muted)]">
                  {row.specialty ?? "—"}
                </td>
                <td className="px-5 py-3 text-sm text-[var(--app-text-muted)]">
                  {row.subjectsNames}
                </td>
                <td className="px-5 py-3 text-center font-bold text-purple-600">
                  {row.subjectsCount}
                </td>
                <td className="px-5 py-3 text-center font-bold text-blue-600">
                  {row.schedulesCount}
                </td>
                <td className="px-5 py-3 text-center">
                  <span
                    className={[
                      "badge",
                      row.isActive ? "badge-success" : "badge-warning",
                    ].join(" ")}
                  >
                    {row.isActive ? "فعّال" : "متوقف"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Print Styles ─────────────────────────────

function ReportsPrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        body {
          background: white !important;
        }

        .app-card {
          box-shadow: none !important;
          border: 1px solid #e2e8f0 !important;
          break-inside: avoid;
        }

        /* Hide non-print elements */
        nav,
        aside,
        header,
        .print\\:hidden,
        button:not(.print\\:show) {
          display: none !important;
        }

        /* Full width layout */
        .lg\\:pr-\\[292px\\] {
          padding-right: 0 !important;
        }

        main {
          padding: 0 !important;
        }

        /* Ensure tables print well */
        table {
          width: 100% !important;
        }

        thead {
          display: table-header-group;
        }

        tr {
          break-inside: avoid;
        }

        /* Report cover styling */
        .report-cover {
          page-break-after: always;
        }
      }
    `}</style>
  );
}
