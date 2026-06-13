import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";
import { buildErrorRedirect } from "@/lib/redirect-message";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  Layers3,
  Search,
} from "lucide-react";
import { safeQuery } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SmartAlert } from "@/components/shared/smart-alert";
import {
  createSubject,
  deleteSubject,
  getSubjectsCount,
  searchSubjects,
} from "@/services/subject-service";
import {
  type SubjectFormInput,
  type SubjectListItem,
} from "@/types/subject";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";

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
  const [subjects, counts] = await Promise.all([
    safeQuery(() => searchSubjects(query), []),
    safeQuery(() => getSubjectsCount(), { total: 0, active: 0, inactive: 0 }),
  ]);

  const hasSubjects = counts.total > 0;

  return (
    <div className="mx-auto flex w-full max-w-[1350px] flex-col gap-6">
        <PageHeader
          title="المواد الدراسية"
          description="أضف المواد التي يتم تدريسها في المدرسة. هذه الخطوة تأتي قبل ربط المدرسين والصفوف والدرجات."
          icon="book"
          badge="الخطوة الثانية"
        />

        <SubjectsFeedback
          saved={resolvedSearchParams?.saved}
          deleted={resolvedSearchParams?.deleted}
          error={resolvedSearchParams?.error}
          reason={resolvedSearchParams?.reason}
        />

        <SmartAlert
          tone="info"
          title="المواد أولًا، ثم الصفوف"
          description="إضافة المواد الدراسية في البداية تجعل ربط المدرسين، بناء الجدول، وإدخال الدرجات أسهل وأكثر تنظيمًا."
          actionLabel="الخطوة التالية: الصفوف"
          actionHref="/classes"
        />

        <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <SubjectCreateForm />

          <div className="flex flex-col gap-6">
            <SubjectStats total={counts.total} />

            <SubjectSearchForm query={query} />
          </div>
        </section>

        {!hasSubjects ? (
          <EmptyState
            icon="book"
            title="لا توجد مواد دراسية بعد"
            description="ابدأ بإضافة أول مادة مثل الرياضيات أو اللغة العربية أو العلوم. بعد ذلك يمكنك إنشاء الصفوف وربط المدرسين."
            actionLabel="إضافة أول مادة"
            actionHref="#subject-form"
            secondaryLabel="إنشاء الصفوف"
            secondaryHref="/classes"
          />
        ) : subjects.length === 0 ? (
          <EmptyState
            icon="search"
            title="لا توجد نتائج مطابقة للبحث"
            description="جرّب البحث باسم المادة، أو امسح حقل البحث لعرض كل المواد."
            actionLabel="عرض كل المواد"
            actionHref="/subjects"
          />
        ) : (
          <SubjectList subjects={subjects} />
        )}
      </div>
  );
}

async function createSubjectAction(formData: FormData) {
  "use server";

  const input: SubjectFormInput = {
    name: String(formData.get("name") ?? ""),
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
        description="رائع، تم حفظ المادة الدراسية. يمكنك الآن إضافة مواد أخرى أو الانتقال إلى الصفوف."
      />
    );
  }

  if (deleted === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تم حذف المادة الدراسية"
        description="تم حذف المادة لأنها غير مرتبطة بدرجات أو صفوف أو مدرسين."
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
      description = "تأكد من إدخال اسم المادة بشكل صحيح، وأن الاسم غير مكرر.";
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

function SubjectCreateForm() {
  return (
    <form
      id="subject-form"
      action={createSubjectAction}
      className="app-card overflow-hidden"
    >
      <div className="border-b border-[var(--app-border-soft)] bg-gradient-to-l to-indigo-50/40 to-amber-50/20 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-amber-100 text-indigo-700">
            <BookOpen size={23} />
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-[var(--app-text)]">
              إضافة مادة دراسية
            </h3>

            <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
              اكتب اسم المادة، ويمكنك إضافة وصف بسيط.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
          >
            اسم المادة <span className="text-red-600">*</span>
          </label>

          <input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={80}
            placeholder="مثال: الرياضيات"
            className="input"
            autoComplete="off"
          />
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
            placeholder="مثال: مادة الرياضيات للمرحلة الابتدائية..."
            className="input min-h-[110px] resize-y leading-7"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--app-border-soft)] bg-gradient-to-l to-indigo-50/30 to-amber-50/20 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-7 text-[var(--app-text-muted)]">
          بعد إضافة المواد، ستكون الخطوة التالية إنشاء الصفوف والشُعب.
        </p>

        <button type="submit" className="btn btn-primary">
          <CheckCircle2 size={18} />
          حفظ المادة
        </button>
      </div>
    </form>
  );
}

type SubjectStatsProps = {
  total: number;
};

function SubjectStats({ total }: SubjectStatsProps) {
  const stats = [
    {
      label: "إجمالي المواد",
      value: total,
      icon: Layers3,
      className: "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
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

type SubjectSearchFormProps = {
  query: string;
};

function SubjectSearchForm({ query }: SubjectSearchFormProps) {
  return (
    <form action="/subjects" className="app-card p-5">
      <label
        htmlFor="q"
        className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
      >
        البحث في المواد
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
            defaultValue={query}
            placeholder="ابحث باسم المادة..."
            className="input pr-11"
            autoComplete="off"
          />
        </div>

        <button type="submit" className="btn btn-secondary">
          بحث
        </button>
      </div>
    </form>
  );
}

type SubjectListProps = {
  subjects: SubjectListItem[];
};

function SubjectList({ subjects }: SubjectListProps) {
  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-[var(--app-text)]">
            قائمة المواد الدراسية
          </h3>

          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            يمكنك متابعة المواد وعدد الارتباطات الخاصة بها.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
  return (
    <article className="grid gap-4 p-5 transition hover:bg-indigo-50/40 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex min-w-0 gap-4">
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700">
          <BookOpen size={24} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-extrabold text-[var(--app-text)]">
              {subject.name}
            </h4>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-sm text-[var(--app-text-muted)]">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold">
              <FileText size={14} />
              {formatDate(subject.createdAt)}
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
            <span className="badge bg-slate-100 text-slate-600">
              المدرسين: {subject.teachersCount}
            </span>

            <span className="badge bg-slate-100 text-slate-600">
              الصفوف: {subject.classesCount}
            </span>

            <span className="badge bg-slate-100 text-slate-600">
              الدرجات: {subject.gradesCount}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
        <DeleteConfirmButton
          action={deleteSubjectAction}
          itemId={subject.id}
          entityName="المادة الدراسية"
          associations={[
            ...(subject.gradesCount > 0 ? [{ label: "درجات مسجلة", count: subject.gradesCount }] : []),
            ...(subject.teachersCount > 0 ? [{ label: "ربط بمدرسين", count: subject.teachersCount }] : []),
            ...(subject.classesCount > 0 ? [{ label: "ربط بصفوف", count: subject.classesCount }] : []),
          ]}
        />
      </div>
    </article>
  );
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}
