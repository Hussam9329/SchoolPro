import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";
import { buildFormErrorRedirect } from "@/lib/redirect-message";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers3,
  MapPin,
  Power,
  Search,
  StickyNote,
  Users,
} from "lucide-react";
import { safeQuery } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SmartAlert } from "@/components/shared/smart-alert";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { getSections } from "@/services/class-service";
import { getActiveSubjects } from "@/services/subject-service";
import { getTeachers } from "@/services/teacher-service";
import {
  createSchedule,
  deleteSchedule,
  getSchedules,
  getSchedulesCount,
  toggleScheduleStatus,
} from "@/services/schedule-service";
import {
  formatScheduleTime,
  getScheduleStatusBadgeClass,
  getScheduleStatusLabel,
  WEEK_DAYS,
  type ScheduleFormInput,
  type ScheduleListItem,
} from "@/types/schedule";
import type { TeacherListItem } from "@/types/teacher";
import { ScheduleCreateFormClient } from "@/components/schedules/schedule-create-form";

export const dynamic = "force-dynamic";



type SchedulesPageProps = {
  searchParams?: Promise<{
    q?: string;
    dayOfWeek?: string;
    saved?: string;
    deleted?: string;
    toggled?: string;
    error?: string;
    reason?: string;
    draft_dayOfWeek?: string;
    draft_startTime?: string;
    draft_endTime?: string;
    draft_sectionId?: string;
    draft_subjectId?: string;
    draft_teacherId?: string;
    draft_room?: string;
    draft_notes?: string;
    draft_isActive?: string;
  }>;
};

export default async function SchedulesPage({
  searchParams,
}: SchedulesPageProps) {
  await requireAdmin();
  const resolvedSearchParams = await searchParams;

  const query = resolvedSearchParams?.q?.trim() ?? "";
  const dayOfWeek = resolvedSearchParams?.dayOfWeek?.trim() ?? "";

  const [schedules, counts, sections, subjects, teachers] = await Promise.all([
    safeQuery(() => getSchedules({
      query: query || undefined,
      dayOfWeek: dayOfWeek || undefined,
    }), []),
    safeQuery(() => getSchedulesCount(), { total: 0, active: 0, inactive: 0, today: 0 }),
    safeQuery(() => getSections(), []),
    safeQuery(() => getActiveSubjects(), []),
    safeQuery(() => getTeachers(), []),
  ]);

  const hasSchedules = counts.total > 0;

  return (
    <div className="mx-auto flex w-full max-w-[1350px] flex-col gap-6">
        <PageHeader
          title="الجدول الدراسي"
          description="أنشئ المحاضرات الدراسية واربطها بالشُعب والمدرسين والمواد لبناء جدول منظم وخالٍ من التعارضات."
          icon="schedule"
          badge="الخطوة الرابعة"
        />

        <SchedulesFeedback
          saved={resolvedSearchParams?.saved}
          deleted={resolvedSearchParams?.deleted}
          toggled={resolvedSearchParams?.toggled}
          error={resolvedSearchParams?.error}
          reason={resolvedSearchParams?.reason}
        />

        <SmartAlert
          tone="info"
          title="بناء الجدول الدراسي"
          description="أضف المحاضرات واحدة تلو الأخرى. النظام يكتشف تلقائيًا تعارضات الأوقات بين المدرسين والشُعب."
          actionLabel="الخطوة التالية: الحضور"
          actionHref="/attendance"
        />

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <ScheduleCreateFormClient
            sections={sections}
            subjects={subjects}
            teachers={(teachers as TeacherListItem[]).filter((teacher) => teacher.isActive)}
            action={createScheduleAction}
            roomOptions={Array.from(new Set(schedules.map((schedule) => schedule.room).filter(Boolean) as string[]))}
            draft={{
              dayOfWeek: resolvedSearchParams?.draft_dayOfWeek,
              startTime: resolvedSearchParams?.draft_startTime,
              endTime: resolvedSearchParams?.draft_endTime,
              sectionId: resolvedSearchParams?.draft_sectionId,
              subjectId: resolvedSearchParams?.draft_subjectId,
              teacherId: resolvedSearchParams?.draft_teacherId,
              room: resolvedSearchParams?.draft_room,
              notes: resolvedSearchParams?.draft_notes,
              isActive: resolvedSearchParams?.draft_isActive,
            }}
          />

          <div className="flex flex-col gap-6">
            <SchedulesStats
              total={counts.total}
              active={counts.active}
              inactive={counts.inactive}
              today={counts.today}
            />

            <ScheduleSearchForm query={query} dayOfWeek={dayOfWeek} />
          </div>
        </section>

        {!hasSchedules ? (
          <EmptyState
            icon="schedule"
            title="لا توجد محاضرات في الجدول بعد"
            description="ابدأ بإضافة أول محاضرة دراسية. تأكد من إنشاء الصفوف والشُعب والمواد والمدرسين أولًا."
            actionLabel="إضافة أول محاضرة"
            actionHref="#schedule-form"
            secondaryLabel="الرجوع إلى الصفوف"
            secondaryHref="/classes"
          />
        ) : schedules.length === 0 ? (
          <EmptyState
            icon="search"
            title="لا توجد محاضرات مطابقة للبحث"
            description="جرّب البحث باسم المادة أو المدرس أو الشعبة، أو غيّر فلتر اليوم، أو امسح البحث لعرض كل المحاضرات."
            actionLabel="عرض كل المحاضرات"
            actionHref="/schedules"
          />
        ) : (
          <SchedulesList schedules={schedules} />
        )}
      </div>
  );
}

async function createScheduleAction(formData: FormData) {
  "use server";

  const input: ScheduleFormInput = {
    dayOfWeek: String(formData.get("dayOfWeek") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    room: String(formData.get("room") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    isActive: formData.get("isActive") === "on",
    sectionId: String(formData.get("sectionId") ?? ""),
    subjectId: String(formData.get("subjectId") ?? ""),
    teacherId: String(formData.get("teacherId") ?? ""),
  };

  const result = await createSchedule(input);

  if (!result.ok) {
    redirect(buildFormErrorRedirect("/schedules", "create", formData, ["dayOfWeek", "startTime", "endTime", "room", "notes", "isActive", "sectionId", "subjectId", "teacherId"], result.message));
  }

  revalidatePath("/");
  revalidatePath("/schedules");
  revalidatePath("/reports");
  redirect("/schedules?saved=1");
}

async function toggleScheduleAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/schedules?error=missing-id");
  }

  const result = await toggleScheduleStatus(id);

  if (!result.ok) {
    redirect("/schedules?error=toggle");
  }

  revalidatePath("/");
  revalidatePath("/schedules");
  revalidatePath("/reports");
  redirect("/schedules?toggled=1");
}

async function deleteScheduleAction(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  "use server";

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { ok: false, message: "معرّف المحاضرة مفقود." };
  }

  let result;
  try {
    result = await deleteSchedule(id);
  } catch (error) {
    console.error("[deleteScheduleAction] Error:", error);
    return { ok: false, message: "حدث خطأ أثناء حذف المحاضرة." };
  }

  if (!result.ok) {
    return { ok: false, message: result.message || "لا يمكن حذف المحاضرة حاليًا." };
  }

  revalidatePath("/");
  revalidatePath("/schedules");
  revalidatePath("/reports");
  redirect("/schedules?deleted=1");
}

type SchedulesFeedbackProps = {
  saved?: string;
  deleted?: string;
  toggled?: string;
  error?: string;
  reason?: string;
};

function SchedulesFeedback({
  saved,
  deleted,
  toggled,
  error,
  reason,
}: SchedulesFeedbackProps) {
  if (saved === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تمت إضافة المحاضرة بنجاح"
        description="رائع، تم حفظ المحاضرة في الجدول الدراسي. يمكنك الآن إضافة محاضرات أخرى أو مراجعة الجدول."
      />
    );
  }

  if (deleted === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تم حذف المحاضرة"
        description="تم حذف المحاضرة من الجدول الدراسي بنجاح."
      />
    );
  }

  if (toggled === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تم تحديث حالة المحاضرة"
        description="تم تغيير حالة المحاضرة بين فعّال ومتوقف بنجاح."
      />
    );
  }

  if (error) {
    const description =
      reason ? reason : error === "delete"
        ? "لا يمكن حذف المحاضرة حاليًا. جرّب تعطيلها بدل الحذف."
        : error === "toggle"
          ? "لا يمكن تحديث حالة المحاضرة. تأكد من أن المحاضرة موجودة."
          : "تأكد من إدخال البيانات بشكل صحيح، وأنه لا يوجد تعارض في الأوقات أو أن المدرس مرتبط بالمادة.";

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

type SchedulesStatsProps = {
  total: number;
  active: number;
  inactive: number;
  today: number;
};

function SchedulesStats({
  total,
  active,
  inactive,
  today,
}: SchedulesStatsProps) {
  const stats = [
    {
      label: "إجمالي المحاضرات",
      value: total,
      icon: Layers3,
      className: "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700",
    },
    {
      label: "محاضرات فعّالة",
      value: active,
      icon: CheckCircle2,
      className: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "محاضرات متوقف",
      value: inactive,
      icon: AlertTriangle,
      className: "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700",
    },
    {
      label: "محاضرات اليوم",
      value: today,
      icon: Clock,
      className: "bg-gradient-to-br from-indigo-100 to-amber-100 text-indigo-700",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
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

type ScheduleSearchFormProps = {
  query: string;
  dayOfWeek: string;
};

function ScheduleSearchForm({ query, dayOfWeek }: ScheduleSearchFormProps) {
  return (
    <form action="/schedules" className="app-card p-5">
      <label
        htmlFor="q"
        className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
      >
        البحث في الجدول
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]"
          />

          <input
            id="q"
            name="q"
            autoComplete="off"
            defaultValue={query}
            placeholder="ابحث باسم المادة أو المدرس أو الشعبة..."
            className="input pr-11"
          />
        </div>

        <select
          id="dayOfWeek-filter"
          name="dayOfWeek"
          autoComplete="off"
          defaultValue={dayOfWeek}
          className="input w-full sm:w-40"
        >
          <option value="">كل الأيام</option>

          {WEEK_DAYS.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>

        <button type="submit" className="btn btn-secondary">
          بحث
        </button>
      </div>
    </form>
  );
}

type SchedulesListProps = {
  schedules: ScheduleListItem[];
};

function SchedulesList({ schedules }: SchedulesListProps) {
  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-[var(--app-text)]">
            قائمة المحاضرات الدراسية
          </h3>

          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            يمكنك متابعة المحاضرات، حالتها، وتفاصيل كل محاضرة في الجدول.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="badge badge-info">{schedules.length} محاضرة</span>
        </div>
      </div>

      <div className="divide-y divide-[var(--app-border-soft)]">
        {schedules.map((schedule) => (
          <ScheduleRow key={schedule.id} schedule={schedule} />
        ))}
      </div>
    </section>
  );
}

type ScheduleRowProps = {
  schedule: ScheduleListItem;
};

function ScheduleRow({ schedule }: ScheduleRowProps) {
  const statusLabel = getScheduleStatusLabel(schedule.isActive);
  const statusBadgeClass = getScheduleStatusBadgeClass(schedule.isActive);

  return (
    <article className="grid gap-4 p-5 transition hover:bg-indigo-50/40 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex min-w-0 gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700">
          <CalendarClock size={25} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-extrabold text-[var(--app-text)]">
              {schedule.subjectName}
            </h4>

            <span className={["badge", statusBadgeClass].join(" ")}>
              {statusLabel}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-sm text-[var(--app-text-muted)]">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold">
              <CalendarClock size={14} />
              {schedule.dayLabel}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold">
              <Clock size={14} />
              {formatScheduleTime(schedule.startTime, schedule.endTime)}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold">
              <GraduationCap size={14} />
              {schedule.teacherName}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold">
              <Users size={14} />
              {schedule.className} / شعبة {schedule.sectionName}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {schedule.room ? (
              <span className="badge bg-slate-100 text-slate-600">
                <MapPin size={14} />
                {schedule.room}
              </span>
            ) : null}


            {schedule.classLevel ? (
              <span className="badge bg-slate-100 text-slate-600">
                {schedule.classLevel}
              </span>
            ) : null}
          </div>

          {schedule.notes ? (
            <p className="mt-3 flex items-start gap-2 text-sm leading-7 text-[var(--app-text-muted)]">
              <StickyNote size={15} className="mt-1.5 shrink-0" />
              {schedule.notes}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
        <form action={toggleScheduleAction}>
          <input type="hidden" name="id" value={schedule.id} />

          <button type="submit" className="btn btn-secondary w-full">
            <Power size={17} />
            {schedule.isActive ? "تعطيل" : "تفعيل"}
          </button>
        </form>

        <DeleteConfirmButton
          action={deleteScheduleAction}
          itemId={schedule.id}
          entityName="المحاضرة"
          associations={[]}
        />
      </div>
    </article>
  );
}
