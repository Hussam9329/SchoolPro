import type { ReactNode } from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildFormErrorRedirect } from "@/lib/redirect-message";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Layers3,
  Phone,
  Power,
  UserRound,
  Users,
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
import { TeacherAssignmentFields } from "./teacher-assignment-fields";
import { TeacherLiveSearch } from "./teacher-live-search";

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
        (teacher) =>
          teacher.fullName.includes(query) ||
          (teacher.phone && teacher.phone.includes(query)) ||
          (teacher.email && teacher.email.includes(query)) ||
          (teacher.specialty && teacher.specialty.includes(query)) ||
          teacher.subjects.some((subject) => subject.name.includes(query)) ||
          teacher.sections.some((section) => `${section.className} ${section.name}`.includes(query)),
      )
    : teachers;

  const hasTeachers = counts.total > 0;

  return (
    <div className="mx-auto flex w-full max-w-[1350px] flex-col gap-6">
      <PageHeader
        title="المدرسين"
        description="أضف المدرسين واربطهم بالمادة الصحيحة ثم بالشُعب المطابقة لنفس الصف والمرحلة."
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
        title="ربط المدرس صار حسب التخصص ثم المادة ثم الشُعب"
        description="اختر عام/علمي/أدبي/مهني أولًا، ثم اختر المادة المرتبطة بصف معيّن، وبعدها تظهر فقط شُعب هذا الصف أو المرحلة المطابقة."
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

          <TeacherSearchForm query={query} teachers={teachers} />
        </div>
      </section>

      {!hasTeachers ? (
        <EmptyState
          icon="teachers"
          title="لا يوجد مدرسين بعد"
          description="ابدأ بإضافة أول مدرس وربطه بالتخصص والمادة والشُعب المناسبة. بعد ذلك يمكنك بناء الجدول الدراسي."
          actionLabel="إضافة أول مدرس"
          actionHref="#teacher-form"
          secondaryLabel="إدارة المواد"
          secondaryHref="/subjects"
        />
      ) : filteredTeachers.length === 0 ? (
        <EmptyState
          icon="search"
          title="لا توجد نتائج مطابقة للبحث"
          description="البحث يعمل مباشرة أثناء الكتابة. امسح حقل البحث لعرض كل المدرسين."
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
        description="تم حفظ بيانات المدرس وربطه بالمادة والشُعب المطابقة."
      />
    );
  }

  if (deleted === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تم حذف المدرس"
        description="تم حذف المدرس وجميع الارتباطات التي وافقت عليها من قائمة الحذف."
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
      description = "لا يمكن حذف المدرس قبل مراجعة بياناته المرتبطة من قائمة الحذف.";
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
  const selectedSubjectIds = toArray(draft?.subjectIds);
  const selectedSectionIds = toArray(draft?.sectionIds);
  const subjectOptions = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    subjectBaseName: subject.subjectBaseName,
    schoolStage: subject.schoolStage,
    gradeLevel: subject.gradeLevel,
    studyTrack: subject.studyTrack,
  }));
  const sectionOptions = sections.map((section) => ({
    id: section.id,
    name: section.name,
    className: section.className,
    schoolStage: section.schoolStage,
    gradeLevel: section.gradeLevel,
    studyTrack: section.studyTrack,
    studentsCount: section.studentsCount,
  }));

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
              أدخل بيانات المدرس، ثم اختر التخصص والمادة لتظهر الشُعب المطابقة تلقائيًا.
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

        <TeacherAssignmentFields
          subjects={subjectOptions}
          sections={sectionOptions}
          selectedSubjectIds={selectedSubjectIds}
          selectedSectionIds={selectedSectionIds}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/30 to-sky-50/20 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-7 text-[var(--app-text-muted)]">
          بعد إضافة المدرس، ستظهر تفاصيله وارتباطاته ضمن بطاقة المدرس وقائمة الحذف.
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
  teachers: TeacherListItem[];
};

function TeacherSearchForm({ query, teachers }: TeacherSearchFormProps) {
  const teacherOptions = teachers.map((teacher) => ({
    id: teacher.id,
    fullName: teacher.fullName,
    phone: teacher.phone,
    specialty: teacher.specialty,
    subjectNames: teacher.subjects.map((subject) => subject.name),
  }));

  return <TeacherLiveSearch initialQuery={query} teachers={teacherOptions} />;
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
            اضغط على تفاصيل المدرس لمشاهدة المواد والشُعب والطلاب والمحاضرات والاختبارات.
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
    <article className="grid gap-4 p-5 transition hover:bg-teal-50/40 lg:grid-cols-[1fr_auto] lg:items-start">
      <div className="min-w-0">
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

            {teacher.sections.length > 0 ? (
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
            ) : null}

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="badge bg-slate-100 text-slate-600">
                المحاضرات: {teacher.schedulesCount}
              </span>
              <span className="badge bg-slate-100 text-slate-600">
                الاختبارات: {teacher.examsCount}
              </span>
              <span className="badge bg-slate-100 text-slate-600">
                الدرجات: {teacher.gradesCount}
              </span>
            </div>
          </div>
        </div>

        <TeacherDetailsPanel teacher={teacher} />
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
          associations={teacher.deleteAssociations}
        />
      </div>
    </article>
  );
}

type TeacherDetailsPanelProps = {
  teacher: TeacherListItem;
};

function TeacherDetailsPanel({ teacher }: TeacherDetailsPanelProps) {
  return (
    <details className="mt-4 rounded-3xl border border-[var(--app-border-soft)] bg-white/85 p-4 shadow-sm open:bg-teal-50/30">
      <summary className="cursor-pointer select-none text-sm font-extrabold text-teal-800">
        عرض كافة تفاصيل المدرس
      </summary>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <DetailCard
          icon={<BookOpen size={17} />}
          title="المواد التي يدرّسها"
          badge={`${teacher.subjectsCount} مادة`}
          items={teacher.subjects.map((subject) => [
            subject.name,
            [subject.schoolStage, subject.gradeLevel, subject.studyTrack].filter(Boolean).join(" / "),
          ].filter(Boolean).join(" — "))}
          empty="لا توجد مواد مرتبطة."
        />

        <DetailCard
          icon={<Layers3 size={17} />}
          title="الشُعب المرتبطة"
          badge={`${teacher.sectionsCount} شعبة`}
          items={teacher.sections.map((section) => `${section.className} - ${section.name} — ${section.studentsCount} طالب`)}
          empty="لا توجد شُعب مرتبطة."
        />

        <DetailCard
          icon={<Users size={17} />}
          title="طلاب الشُعب المرتبطة"
          badge="قائمة الطلاب"
          items={teacher.sections.flatMap((section) => section.studentDetails.map((student) => `${student} — ${section.className} / ${section.name}`))}
          empty="لا توجد أسماء طلاب متاحة ضمن الشُعب المرتبطة."
        />

        <DetailCard
          icon={<CalendarDays size={17} />}
          title="المحاضرات في الجدول"
          badge={`${teacher.schedulesCount} محاضرة`}
          items={teacher.scheduleDetails}
          empty="لا توجد محاضرات مرتبطة."
        />

        <DetailCard
          icon={<ClipboardList size={17} />}
          title="الاختبارات"
          badge={`${teacher.examsCount} اختبار`}
          items={teacher.examDetails}
          empty="لا توجد اختبارات مرتبطة."
        />

        <DetailCard
          icon={<GraduationCap size={17} />}
          title="الدرجات"
          badge={`${teacher.gradesCount} درجة`}
          items={teacher.gradeDetails}
          empty="لا توجد درجات مرتبطة."
        />
      </div>
    </details>
  );
}

type DetailCardProps = {
  icon: ReactNode;
  title: string;
  badge: string;
  items: string[];
  empty: string;
};

function DetailCard({ icon, title, badge, items, empty }: DetailCardProps) {
  const visibleItems = items.filter(Boolean);

  return (
    <div className="rounded-2xl border border-[var(--app-border-soft)] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--app-text)]">
          <span className="text-teal-700">{icon}</span>
          {title}
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-extrabold text-teal-700 ring-1 ring-teal-100">
          {badge}
        </span>
      </div>

      {visibleItems.length > 0 ? (
        <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
          {visibleItems.map((item) => (
            <span key={`${title}-${item}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold leading-5 text-slate-700">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-6 text-[var(--app-text-muted)]">{empty}</p>
      )}
    </div>
  );
}
