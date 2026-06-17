import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildErrorRedirect } from "@/lib/redirect-message";
import {
  BookOpen,
  ChevronDown,
  FileText,
  GraduationCap,
  Layers3,
  ListChecks,
  School,
  Users,
} from "lucide-react";
import { safeQuery } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SmartAlert } from "@/components/shared/smart-alert";
import {
  createSubject,
  deleteSubject,
  getSubjects,
  getSubjectsCount,
  searchSubjects,
} from "@/services/subject-service";
import {
  type SubjectFormInput,
  type SubjectListItem,
} from "@/types/subject";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import {
  getGradeStageLabel,
  getStageLabel,
  getSubjectLevelTrackLabel,
  getTrackLabel,
} from "@/lib/subject-catalog";
import {
  SubjectCreateFormClient,
  SubjectLiveSearch,
  type SubjectSearchItem,
} from "./subjects-client";

export const dynamic = "force-dynamic";

type SubjectsPageProps = {
  searchParams?: Promise<{
    q?: string;
    saved?: string;
    deleted?: string;
    error?: string;
    reason?: string;
  }>;
};

export default async function SubjectsPage({
  searchParams,
}: SubjectsPageProps) {
  await requireAdmin();
  const resolvedSearchParams = await searchParams;

  const query = resolvedSearchParams?.q?.trim() ?? "";
  const [allSubjects, filteredSubjects, counts] = await Promise.all([
    safeQuery(() => getSubjects(), []),
    safeQuery(() => (query ? searchSubjects(query) : Promise.resolve([])), []),
    safeQuery(() => getSubjectsCount(), { total: 0, active: 0, inactive: 0 }),
  ]);
  const subjects = query ? filteredSubjects : allSubjects;
  const hasSubjects = counts.total > 0;
  const searchItems = allSubjects.map(toSubjectSearchItem);

  return (
    <div className="mx-auto flex w-full max-w-[1350px] flex-col gap-6">
      <PageHeader
        title="المواد الدراسية"
        description="أضف المواد بتصنيف واضح حسب المرحلة والتخصص والصف، ثم راقب ارتباطها بالمدرسين والصفوف والدرجات."
        icon="book"
        badge="الخطوة الثانية"
      />

      <SubjectsFeedback
        saved={resolvedSearchParams?.saved}
        deleted={resolvedSearchParams?.deleted}
        error={resolvedSearchParams?.error}
        reason={resolvedSearchParams?.reason}
      />

      <SubjectLiveSearch query={query} subjects={searchItems} />

      <SmartAlert
        tone="info"
        title="تسمية المواد أصبحت أوضح"
        description="عند إضافة مادة مثل الفيزياء للصف السادس العلمي ستُحفظ وتظهر تلقائيًا باسم: الفيزياء - السادس العلمي، حتى يسهل تمييزها في الجداول والدرجات والربط مع المدرسين."
        actionLabel="الخطوة التالية: الصفوف"
        actionHref="/classes"
      />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SubjectCreateFormClient action={createSubjectAction} />

        <div className="flex flex-col gap-6">
          <SubjectStats total={counts.total} shown={subjects.length} />
          <SubjectWorkflowTips />
        </div>
      </section>

      {!hasSubjects ? (
        <EmptyState
          icon="book"
          title="لا توجد مواد دراسية بعد"
          description="ابدأ بإضافة أول مادة من القوائم المنظمة حسب المرحلة والتخصص، أو اختر إضافة مادة خاصة عند الحاجة."
          actionLabel="إضافة أول مادة"
          actionHref="#subject-form"
          secondaryLabel="إنشاء الصفوف"
          secondaryHref="/classes"
        />
      ) : subjects.length === 0 ? (
        <EmptyState
          icon="search"
          title="لا توجد نتائج مطابقة للبحث"
          description="جرّب البحث باسم المادة، الصف، المرحلة، أو التخصص مثل: السادس العلمي أو متوسط عام."
          actionLabel="عرض كل المواد"
          actionHref="/subjects"
        />
      ) : (
        <SubjectList subjects={subjects} query={query} />
      )}
    </div>
  );
}

async function createSubjectAction(formData: FormData) {
  "use server";

  const input: SubjectFormInput = {
    name: String(formData.get("name") ?? ""),
    catalogSubject: String(formData.get("catalogSubject") ?? ""),
    customSubjectName: String(formData.get("customSubjectName") ?? ""),
    schoolStage: String(formData.get("schoolStage") ?? ""),
    gradeLevel: String(formData.get("gradeLevel") ?? ""),
    studyTrack: String(formData.get("studyTrack") ?? ""),
    description: String(formData.get("description") ?? ""),
  };

  const result = await createSubject(input);

  if (!result.ok) {
    redirect(buildErrorRedirect("/subjects", "create", result.message));
  }

  revalidatePath("/");
  revalidatePath("/subjects");
  revalidatePath("/reports");
  redirect("/subjects?saved=1");
}

async function deleteSubjectAction(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  "use server";

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { ok: false, message: "معرّف المادة مفقود." };
  }

  let result;
  try {
    result = await deleteSubject(id);
  } catch (error) {
    console.error("[deleteSubjectAction] Error:", error);
    return { ok: false, message: "حدث خطأ أثناء الحذف. تأكد من عدم وجود بيانات مرتبطة." };
  }

  if (!result.ok) {
    return { ok: false, message: result.message || "حدث خطأ أثناء الحذف." };
  }

  revalidatePath("/");
  revalidatePath("/subjects");
  revalidatePath("/reports");
  redirect("/subjects?deleted=1");
}

type SubjectsFeedbackProps = {
  saved?: string;
  deleted?: string;
  error?: string;
  reason?: string;
};

function SubjectsFeedback({
  saved,
  deleted,
  error,
  reason,
}: SubjectsFeedbackProps) {
  if (saved === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تمت إضافة المادة بنجاح"
        description="تم حفظ المادة مع المرحلة والتخصص والصف ضمن الاسم النهائي، ويمكنك الآن ربطها بالصفوف والمدرسين."
      />
    );
  }

  if (deleted === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تم حذف المادة الدراسية"
        description="تم حذف المادة وجميع بياناتها المرتبطة حسب تأكيد الحذف."
      />
    );
  }

  if (error) {
    let description: string;
    if (reason) {
      description = reason;
    } else if (error === "delete") {
      description = "لا يمكن حذف المادة إذا كانت مرتبطة بمدرسين أو صفوف أو درجات.";
    } else {
      description = "تأكد من اختيار المرحلة والتخصص والصف والمادة بشكل صحيح، أو اكتب اسم المادة الخاصة.";
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

type SubjectStatsProps = {
  total: number;
  shown: number;
};

function SubjectStats({ total, shown }: SubjectStatsProps) {
  const stats = [
    {
      label: "إجمالي المواد",
      value: total,
      icon: Layers3,
      className: "bg-gradient-to-br from-blue-100 to-teal-100 text-blue-700",
    },
    {
      label: "المواد المعروضة الآن",
      value: shown,
      icon: ListChecks,
      className: "bg-gradient-to-br from-teal-100 to-sky-100 text-teal-700",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
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

function SubjectWorkflowTips() {
  return (
    <div className="app-card overflow-hidden">
      <div className="border-b border-[var(--app-border-soft)] p-5">
        <h3 className="text-lg font-extrabold text-[var(--app-text)]">
          تسلسل إضافة المادة
        </h3>
        <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
          تم ترتيب الحقول حتى لا يتم إدخال مادة بدون مرحلة أو تخصص.
        </p>
      </div>
      <div className="grid gap-3 p-5 text-sm font-bold text-[var(--app-text-muted)]">
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/30">1. اختر ابتدائي، متوسط، أو إعدادي.</div>
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/30">2. اختر التخصص: عام، علمي، أو أدبي حسب المرحلة.</div>
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/30">3. اختر المادة من القائمة أو اضغط إضافة مادة خاصة.</div>
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/30">4. اختر الصف حتى يظهر الاسم النهائي تلقائيًا.</div>
      </div>
    </div>
  );
}

type SubjectListProps = {
  subjects: SubjectListItem[];
  query: string;
};

function SubjectList({ subjects, query }: SubjectListProps) {
  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-[var(--app-text)]">
            قائمة المواد الدراسية
          </h3>

          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            اضغط على تفاصيل المادة للاطلاع على المدرسين والصفوف وكل الارتباطات.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {query ? <span className="badge badge-warning">بحث: {query}</span> : null}
          <span className="badge badge-info">{subjects.length} مادة</span>
        </div>
      </div>

      <div className="divide-y divide-[var(--app-border-soft)]">
        {subjects.map((subject) => (
          <SubjectRow key={subject.id} subject={subject} />
        ))}
      </div>
    </section>
  );
}

type SubjectRowProps = {
  subject: SubjectListItem;
};

function SubjectRow({ subject }: SubjectRowProps) {
  const stageLabel = getStageLabel(subject.schoolStage);
  const trackLabel = getTrackLabel(subject.studyTrack);
  const gradeLabel = getGradeStageLabel(subject.schoolStage, subject.gradeLevel);
  const levelTrackLabel = getSubjectLevelTrackLabel(
    subject.schoolStage,
    subject.gradeLevel,
    subject.studyTrack,
  );

  return (
    <article className="grid gap-4 p-5 transition hover:bg-teal-50/40 lg:grid-cols-[1fr_auto] lg:items-start">
      <div className="flex min-w-0 gap-4">
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 to-teal-100 text-blue-700">
          <BookOpen size={24} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-extrabold text-[var(--app-text)]">
              {subject.name}
            </h4>
            {subject.subjectBaseName ? (
              <span className="badge bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-100">
                المادة الأصلية: {subject.subjectBaseName}
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-sm text-[var(--app-text-muted)]">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold dark:bg-slate-900/50">
              <FileText size={14} />
              {formatDate(subject.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 font-bold text-sky-700 dark:bg-sky-950/40 dark:text-sky-100">
              <School size={14} />
              {stageLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 font-bold text-teal-700 dark:bg-teal-950/40 dark:text-teal-100">
              <GraduationCap size={14} />
              {levelTrackLabel || gradeLabel}
            </span>
          </div>

          {subject.description ? (
            <p className="mt-3 text-sm leading-7 text-[var(--app-text-muted)]">
              {subject.description}
            </p>
          ) : (
            <p className="mt-3 text-sm leading-7 text-[var(--app-text-soft)]">
              لا يوجد وصف لهذه المادة.
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-200">
              المدرسين: {subject.teachersCount}
            </span>

            <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-200">
              الصفوف: {subject.classesCount}
            </span>

            <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-200">
              الدرجات: {subject.gradesCount}
            </span>

            <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-200">
              الجدول: {subject.schedulesCount}
            </span>

            <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-200">
              الاختبارات: {subject.examsCount}
            </span>
          </div>

          <SubjectDetailsPanel
            subject={subject}
            stageLabel={stageLabel}
            trackLabel={trackLabel}
            gradeLabel={gradeLabel}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
        <DeleteConfirmButton
          action={deleteSubjectAction}
          itemId={subject.id}
          entityName="المادة الدراسية"
          associations={subject.deleteAssociations}
        />
      </div>
    </article>
  );
}

type SubjectDetailsPanelProps = {
  subject: SubjectListItem;
  stageLabel: string;
  trackLabel: string;
  gradeLabel: string;
};

function SubjectDetailsPanel({
  subject,
  stageLabel,
  trackLabel,
  gradeLabel,
}: SubjectDetailsPanelProps) {
  return (
    <details className="mt-4 rounded-3xl border border-[var(--app-border-soft)] bg-white/70 p-4 open:bg-teal-50/45 dark:bg-slate-950/20 dark:open:bg-teal-950/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-teal-700 dark:text-teal-100">
        <span className="inline-flex items-center gap-2">
          <Users size={16} />
          دخول إلى تفاصيل المادة
        </span>
        <ChevronDown size={18} className="transition details-open:rotate-180" />
      </summary>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <DetailStat label="المرحلة العامة" value={stageLabel} />
          <DetailStat label="الصف الدراسي" value={gradeLabel} />
          <DetailStat label="التخصص" value={trackLabel} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <DetailList
            title="المدرسون المرتبطون"
            empty="لا يوجد مدرسون مرتبطون بهذه المادة."
            values={subject.relatedTeachers.map((teacher) =>
              teacher.specialty ? `${teacher.fullName} - ${teacher.specialty}` : teacher.fullName,
            )}
          />

          <DetailList
            title="الصفوف المرتبطة"
            empty="لا توجد صفوف مرتبطة بهذه المادة."
            values={subject.relatedClasses.map(formatRelatedClass)}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <DetailStat label="محاضرات الجدول" value={subject.schedulesCount} />
          <DetailStat label="الاختبارات" value={subject.examsCount} />
          <DetailStat label="الدرجات المسجلة" value={subject.gradesCount} />
        </div>
      </div>
    </details>
  );
}

function DetailStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[var(--app-border-soft)] bg-white/80 p-4 dark:bg-slate-950/20">
      <p className="text-xs font-extrabold text-[var(--app-text-soft)]">{label}</p>
      <p className="mt-1 text-base font-extrabold text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function DetailList({
  title,
  values,
  empty,
}: {
  title: string;
  values: string[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--app-border-soft)] bg-white/80 p-4 dark:bg-slate-950/20">
      <p className="text-sm font-extrabold text-[var(--app-text)]">{title}</p>
      {values.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <span key={value} className="badge bg-slate-100 text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[var(--app-text-soft)]">{empty}</p>
      )}
    </div>
  );
}

function formatRelatedClass(schoolClass: { name: string; level: string | null }): string {
  return schoolClass.level ? `${schoolClass.name} - ${schoolClass.level}` : schoolClass.name;
}

function toSubjectSearchItem(subject: SubjectListItem): SubjectSearchItem {
  return {
    id: subject.id,
    name: subject.name,
    subjectBaseName: subject.subjectBaseName,
    schoolStage: subject.schoolStage,
    gradeLevel: subject.gradeLevel,
    studyTrack: subject.studyTrack,
    description: subject.description,
    teachersCount: subject.teachersCount,
    classesCount: subject.classesCount,
  };
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}
