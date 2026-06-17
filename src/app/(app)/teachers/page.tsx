import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";
import { buildFormErrorRedirect } from "@/lib/redirect-message";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Phone,
  Power,
  Search,
  UserRound,
} from "lucide-react";
import { safeQuery } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SmartAlert } from "@/components/shared/smart-alert";
import {
  createTeacher,
  deleteTeacher,
  getTeachers,
  getTeachersCount,
  toggleTeacherStatus,
} from "@/services/teacher-service";
import { getActiveSubjects } from "@/services/subject-service";
import { getSections } from "@/services/class-service";
import {
  getTeacherStatusBadgeClass,
  getTeacherStatusLabel,
  type TeacherFormInput,
  type TeacherListItem,
  type TeacherStatus,
} from "@/types/teacher";
import type { Subject } from "@/types/subject";
import type { SectionListItem } from "@/types/class";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";

export const dynamic = "force-dynamic";



type TeachersPageProps = {
  searchParams?: Promise<{
    q?: string;
    saved?: string;
    deleted?: string;
    toggled?: string;
    error?: string;
    reason?: string;
    draft_fullName?: string;
    draft_phone?: string;
    draft_subjectIds?: string | string[];
    draft_sectionIds?: string | string[];
  }>;
};

export default async function TeachersPage({
  searchParams,
}: TeachersPageProps) {
  await requireAdmin();
  const resolvedSearchParams = await searchParams;

  const query = resolvedSearchParams?.q?.trim() ?? "";

  const [teachers, counts, subjects, sections] = await Promise.all([
    safeQuery(() => getTeachers(), []),
    safeQuery(() => getTeachersCount(), { total: 0, active: 0, inactive: 0, withSubjects: 0, withoutSubjects: 0 }),
    safeQuery(() => getActiveSubjects(), []),
    safeQuery(() => getSections(), []),
  ]);

  const filteredTeachers = query
    ? teachers.filter(
        (t) =>
          t.fullName.includes(query) ||
          (t.phone && t.phone.includes(query)) ||
          (t.email && t.email.includes(query)) ||
          (t.specialty && t.specialty.includes(query)) ||
          t.subjects.some((s) => s.name.includes(query)),
      )
    : teachers;

  const hasTeachers = counts.total > 0;

  return (
    <div className="mx-auto flex w-full max-w-[1350px] flex-col gap-6">
        <PageHeader
          title="المدرسين"
          description="أضف المدرسين واربطهم بالمواد الدراسية."
          icon="teachers"
          badge="الخطوة الثالثة"
        />

        <TeachersFeedback
          saved={resolvedSearchParams?.saved}
          deleted={resolvedSearchParams?.deleted}
          toggled={resolvedSearchParams?.toggled}
          error={resolvedSearchParams?.error}
          reason={resolvedSearchParams?.reason}
        />

        <SmartAlert
          tone="info"
          title="المدرسين يُربطون بالمواد أولاً"
          description="أضف المدرس وحدّد المواد التي يدرّسها، ثم يمكنك استخدامها في بناء الجدول الدراسي."
          actionLabel="إدارة المواد"
          actionHref="/subjects"
        />

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <TeacherCreateForm
            subjects={subjects}
            sections={sections}
            draft={{
              fullName: resolvedSearchParams?.draft_fullName,
              phone: resolvedSearchParams?.draft_phone,
              subjectIds: resolvedSearchParams?.draft_subjectIds,
              sectionIds: resolvedSearchParams?.draft_sectionIds,
            }}
          />

          <div className="flex flex-col gap-6">
            <TeacherStats
              total={counts.total}
              active={counts.active}
              inactive={counts.inactive}
              withSubjects={counts.withSubjects}
            />

            <TeacherSearchForm query={query} />
          </div>
        </section>

        {!hasTeachers ? (
          <EmptyState
            icon="teachers"
            title="لا يوجد مدرسين بعد"
            description="ابدأ بإضافة أول مدرس وربطه بالمواد الدراسية. بعد ذلك يمكنك بناء الجدول الدراسي."
            actionLabel="إضافة أول مدرس"
            actionHref="#teacher-form"
            secondaryLabel="إدارة المواد"
            secondaryHref="/subjects"
          />
        ) : filteredTeachers.length === 0 ? (
          <EmptyState
            icon="search"
            title="لا توجد نتائج مطابقة للبحث"
            description="جرّب البحث باسم المدرس أو هاتفه أو تخصصه أو المادة، أو امسح حقل البحث لعرض الكل."
            actionLabel="عرض كل المدرسين"
            actionHref="/teachers"
          />
        ) : (
          <TeacherList teachers={filteredTeachers} />
        )}
      </div>
  );
}

// ─── Server Actions ──────────────────────────────────────────────

async function createTeacherAction(formData: FormData) {
  "use server";

  const subjectIds = formData.getAll("subjectIds").map(String).filter(Boolean);
  const sectionIds = formData.getAll("sectionIds").map(String).filter(Boolean);

  const input: TeacherFormInput = {
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    subjectIds,
    sectionIds,
  };

  const result = await createTeacher(input);

  if (!result.ok) {
    redirect(buildFormErrorRedirect("/teachers", "create", formData, ["fullName", "phone", "subjectIds", "sectionIds"], result.message));
  }

  revalidatePath("/");
  revalidatePath("/teachers");
  revalidatePath("/reports");
  redirect("/teachers?saved=1");
}

async function deleteTeacherAction(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  "use server";

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { ok: false, message: "معرّف المدرس مفقود." };
  }

  let result;
  try {
    result = await deleteTeacher(id);
  } catch (error) {
    console.error("[deleteTeacherAction] Error:", error);
    return { ok: false, message: "حدث خطأ أثناء الحذف. تأكد من عدم وجود بيانات مرتبطة." };
  }

  if (!result.ok) {
    return { ok: false, message: result.message || "حدث خطأ أثناء الحذف." };
  }

  revalidatePath("/");
  revalidatePath("/teachers");
  revalidatePath("/reports");
  redirect("/teachers?deleted=1");
}

async function toggleTeacherStatusAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/teachers?error=missing-id");
  }

  const result = await toggleTeacherStatus(id);

  if (!result.ok) {
    redirect("/teachers?error=toggle");
  }

  revalidatePath("/");
  revalidatePath("/teachers");
  revalidatePath("/reports");
  redirect("/teachers?toggled=1");
}

// ─── Feedback ────────────────────────────────────────────────────

type TeachersFeedbackProps = {
  saved?: string;
  deleted?: string;
  toggled?: string;
  error?: string;
  reason?: string;
};

function TeachersFeedback({
  saved,
  deleted,
  toggled,
  error,
  reason,
}: TeachersFeedbackProps) {
  if (saved === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تمت إضافة المدرس بنجاح"
        description="رائع، تم حفظ بيانات المدرس. يمكنك الآن إضافة مدرسين آخرين أو بناء الجدول الدراسي."
      />
    );
  }

  if (deleted === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تم حذف المدرس"
        description="تم حذف المدرس من النظام لأنه غير مرتبط بمحاضرات في الجدول."
      />
    );
  }

  if (toggled === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تم تحديث حالة المدرس"
        description="تم تغيير حالة المدرس بين فعّال ومتوقف بنجاح."
      />
    );
  }

  if (error) {
    let description: string;
    if (reason) {
      description = reason;
    } else if (error === "delete") {
      description = "لا يمكن حذف المدرس إذا كان مرتبطًا بمحاضرات في الجدول. عطّله بدل حذفه.";
    } else if (error === "toggle") {
      description = "لا يمكن تحديث حالة المدرس. حاول مرة أخرى.";
    } else {
      description = "تأكد من إدخال جميع البيانات المطلوبة بشكل صحيح.";
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

// ─── Create Form ─────────────────────────────────────────────────

type TeacherCreateFormProps = {
  subjects: Subject[];
  sections: SectionListItem[];
  draft?: {
    fullName?: string;
    phone?: string;
    subjectIds?: string | string[];
    sectionIds?: string | string[];
  };
};

function toArray(value?: string | string[]) {
  if (!value) return [] as string[];
  return Array.isArray(value) ? value : [value];
}

function TeacherCreateForm({ subjects, sections, draft }: TeacherCreateFormProps) {
  const selectedSubjectIds = new Set(toArray(draft?.subjectIds));
  const selectedSectionIds = new Set(toArray(draft?.sectionIds));
  return (
    <form
      id="teacher-form"
      action={createTeacherAction}
      className="app-card overflow-hidden"
    >
      <div className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/40 to-sky-50/20 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700">
            <GraduationCap size={24} />
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-[var(--app-text)]">
              إضافة مدرس
            </h3>

            <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
              أدخل بيانات المدرس واربطها بالمواد الدراسية التي يدرّسها.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6">
        <div>
          <label
            htmlFor="fullName"
            className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
          >
            الاسم الكامل <span className="text-red-600">*</span>
          </label>

          <input
            id="fullName"
            name="fullName"
            autoComplete="off"
            required
            maxLength={120}
            placeholder="مثال: أحمد أو زهراء علي حسين كاظم"
            className="input"
            defaultValue={draft?.fullName ?? ""}
          />
          <p className="mt-1 text-xs text-[var(--app-text-muted)]">الاسم لا يجب أن يحتوي على أرقام</p>
        </div>

        <div>
          <label
            htmlFor="phone"
            className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
          >
            رقم الهاتف <span className="text-red-600">*</span>
          </label>

          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="off"
            required
            pattern="07\d{9}"
            maxLength={11}
            placeholder="مثال: 07701234567"
            className="input"
            dir="ltr"
            defaultValue={draft?.phone ?? ""}
          />
          <p className="mt-1 text-xs text-[var(--app-text-muted)]">11 رقم ويبدأ بـ 07</p>
        </div>

        {subjects.length > 0 ? (
          <div>
            <span className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
              المادة التي يدرّسها <span className="text-red-600">*</span>
            </span>

            <div className="max-h-52 overflow-y-auto rounded-2xl border border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/30 to-sky-50/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {subjects.map((subject) => (
                  <label
                    key={subject.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--app-border-soft)] bg-white p-3 transition hover:border-teal-200 hover:bg-teal-50/40"
                  >
                    <input
                      type="checkbox"
                      name="subjectIds"
                      value={subject.id}
                      id={`subject-${subject.id}`}
                      autoComplete="off"
                      className="h-4 w-4 accent-teal-600"
                      defaultChecked={selectedSubjectIds.has(subject.id)}
                    />

                    <span className="flex items-center gap-2">
                      <BookOpen
                        size={15}
                        className="text-[var(--app-text-soft)]"
                      />

                      <span className="text-sm font-bold text-[var(--app-text)]">
                        {subject.name}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <p className="mt-2 text-xs leading-6 text-[var(--app-text-soft)]">
              اختر المادة أو المواد التي يدرّسها هذا المدرس.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
            <p className="text-sm leading-7 text-sky-800">
              لا توجد مواد فعّال حاليًا.{" "}
              <a
                href="/subjects"
                className="font-extrabold underline underline-offset-2 hover:text-sky-900"
              >
                أضف مواد أولًا
              </a>{" "}
              لربطها بالمدرسين.
            </p>
          </div>
        )}

        {sections.length > 0 ? (
          <div>
            <span className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
              الأقسام (الشُعب) التي يدرّسها
            </span>

            <div className="max-h-52 overflow-y-auto rounded-2xl border border-[var(--app-border-soft)] bg-gradient-to-l from-blue-50/30 to-teal-50/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {sections.map((section) => (
                  <label
                    key={section.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--app-border-soft)] bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <input
                      type="checkbox"
                      name="sectionIds"
                      value={section.id}
                      id={`section-${section.id}`}
                      autoComplete="off"
                      className="h-4 w-4 accent-blue-600"
                      defaultChecked={selectedSectionIds.has(section.id)}
                    />

                    <span className="flex items-center gap-2">
                      <UserRound
                        size={15}
                        className="text-[var(--app-text-soft)]"
                      />

                      <span className="text-sm font-bold text-[var(--app-text)]">
                        {section.className} - {section.name}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <p className="mt-2 text-xs leading-6 text-[var(--app-text-soft)]">
              اختر الشُعب التي يدرّس فيها هذا المدرس (اختياري).
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/30 to-sky-50/20 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-7 text-[var(--app-text-muted)]">
          بعد إضافة المدرس، يمكنك بناء الجدول الدراسي وربطه بالمحاضرات.
        </p>

        <button type="submit" className="btn btn-primary">
          <CheckCircle2 size={18} />
          حفظ المدرس
        </button>
      </div>
    </form>
  );
}

// ─── Stats ───────────────────────────────────────────────────────

type TeacherStatsProps = {
  total: number;
  active: number;
  inactive: number;
  withSubjects: number;
};

function TeacherStats({
  total,
  active,
  inactive,
  withSubjects,
}: TeacherStatsProps) {
  const stats = [
    {
      label: "إجمالي المدرسين",
      value: total,
      icon: GraduationCap,
      className: "bg-gradient-to-br from-blue-100 to-teal-100 text-blue-700",
    },
    {
      label: "مدرسين فعّالين",
      value: active,
      icon: CheckCircle2,
      className: "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700",
    },
    {
      label: "مدرسين متوقفين",
      value: inactive,
      icon: AlertTriangle,
      className: "bg-gradient-to-br from-sky-100 to-orange-100 text-sky-700",
    },
    {
      label: "مرتبطون بمواد",
      value: withSubjects,
      icon: BookOpen,
      className: "bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-700",
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

// ─── Search ──────────────────────────────────────────────────────

type TeacherSearchFormProps = {
  query: string;
};

function TeacherSearchForm({ query }: TeacherSearchFormProps) {
  return (
    <form action="/teachers" className="app-card p-5">
      <label
        htmlFor="q"
        className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
      >
        البحث في المدرسين
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
            placeholder="ابحث بالاسم أو الهاتف أو التخصص أو المادة..."
            className="input pr-11"
          />
        </div>

        <button type="submit" className="btn btn-secondary">
          بحث
        </button>
      </div>
    </form>
  );
}

// ─── List ────────────────────────────────────────────────────────

type TeacherListProps = {
  teachers: TeacherListItem[];
};

function TeacherList({ teachers }: TeacherListProps) {
  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-[var(--app-text)]">
            قائمة المدرسين
          </h3>

          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            تابع بيانات المدرسين وحالتهم والمواد المرتبطة بهم.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="badge badge-info">{teachers.length} مدرس</span>
        </div>
      </div>

      <div className="divide-y divide-[var(--app-border-soft)]">
        {teachers.map((teacher) => (
          <TeacherRow key={teacher.id} teacher={teacher} />
        ))}
      </div>
    </section>
  );
}

type TeacherRowProps = {
  teacher: TeacherListItem;
};

function TeacherRow({ teacher }: TeacherRowProps) {
  const status: TeacherStatus = teacher.isActive ? "active" : "inactive";
  const statusLabel = getTeacherStatusLabel(status);
  const statusClass = getTeacherStatusBadgeClass(status);

  return (
    <article className="grid gap-4 p-5 transition hover:bg-teal-50/40 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex min-w-0 gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700">
          <UserRound size={25} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-extrabold text-[var(--app-text)]">
              {teacher.fullName}
            </h4>

            <span className={["badge", statusClass].join(" ")}>
              {statusLabel}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-sm text-[var(--app-text-muted)]">
            {teacher.phone ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold" dir="ltr">
                <Phone size={14} />
                {teacher.phone}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {teacher.subjects.length > 0 ? (
              teacher.subjects.map((subject) => (
                <span
                  key={subject.id}
                  className="badge bg-blue-50 text-blue-700"
                >
                  <BookOpen size={12} />
                  {subject.name}
                </span>
              ))
            ) : (
              <span className="badge bg-slate-100 text-slate-500">
                لا توجد مواد مرتبطة
              </span>
            )}
          </div>

          {teacher.sections.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {teacher.sections.map((section) => (
                <span
                  key={section.id}
                  className="badge bg-purple-50 text-purple-700"
                >
                  {section.className} - {section.name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="badge bg-slate-100 text-slate-600">
              المحاضرات: {teacher.schedulesCount}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
        <form action={toggleTeacherStatusAction}>
          <input type="hidden" name="id" value={teacher.id} />

          <button type="submit" className="btn btn-secondary w-full">
            <Power size={17} />
            {teacher.isActive ? "تعطيل" : "تفعيل"}
          </button>
        </form>

        <DeleteConfirmButton
          action={deleteTeacherAction}
          itemId={teacher.id}
          entityName="المدرس"
          associations={[
            ...(teacher.gradesCount > 0 ? [{ label: "درجات طلاب", count: teacher.gradesCount }] : []),
            ...(teacher.examsCount > 0 ? [{ label: "امتحانات", count: teacher.examsCount }] : []),
            ...(teacher.schedulesCount > 0 ? [{ label: "محاضرات في الجدول", count: teacher.schedulesCount }] : []),
            ...(teacher.subjects.length > 0 ? [{ label: "ربط بمواد دراسية", count: teacher.subjects.length }] : []),
            ...(teacher.sections.length > 0 ? [{ label: "ربط بشُعب دراسية", count: teacher.sections.length }] : []),
          ]}
        />
      </div>
    </article>
  );
}
