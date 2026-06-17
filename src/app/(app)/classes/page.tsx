import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";
import { buildFormErrorRedirect } from "@/lib/redirect-message";
import {
  CheckCircle2,
  DoorOpen,
  GraduationCap,
  Layers3,
  ListTree,
  Users,
} from "lucide-react";
import { safeQuery } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SmartAlert } from "@/components/shared/smart-alert";
import {
  assignSubjectsToClass,
  createClass,
  createSection,
  deleteClass,
  deleteSection,
  getActiveClasses,
  getClassesCount,
  getSections,
  searchClasses,
  filterSubjectsForClass,
} from "@/services/class-service";
import { getActiveSubjects } from "@/services/subject-service";
import {
  getClassDisplayName,
  getSectionDisplayName,
  type ClassFormInput,
  type ClassListItem,
  type SchoolClass,
  type SectionFormInput,
  type SectionListItem,
} from "@/types/class";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { ClassCreateFields, ClassFilterControls, SectionNameSelect } from "./classes-client";

export const dynamic = "force-dynamic";

type ClassFilters = {
  stage?: string;
  track?: string;
  classId?: string;
  sectionId?: string;
};

function applyClassFilters(classes: ClassListItem[], sections: SectionListItem[], filters: ClassFilters): ClassListItem[] {
  const selectedSection = filters.sectionId
    ? sections.find((section) => section.id === filters.sectionId)
    : null;
  const classId = filters.classId || selectedSection?.classId || "";

  return classes.filter((schoolClass) => {
    if (filters.stage && schoolClass.schoolStage !== filters.stage) return false;
    if (filters.track && schoolClass.studyTrack !== filters.track) return false;
    if (classId && schoolClass.id !== classId) return false;
    return true;
  });
}

function applySectionFilters(sections: SectionListItem[], filters: ClassFilters): SectionListItem[] {
  return sections.filter((section) => {
    if (filters.stage && section.schoolStage !== filters.stage) return false;
    if (filters.track && section.studyTrack !== filters.track) return false;
    if (filters.classId && section.classId !== filters.classId) return false;
    if (filters.sectionId && section.id !== filters.sectionId) return false;
    return true;
  });
}

type ClassesPageProps = {
  searchParams?: Promise<{
    stage?: string;
    track?: string;
    classId?: string;
    sectionId?: string;
    classSaved?: string;
    sectionSaved?: string;
    deleted?: string;
    error?: string;
    reason?: string;
    draft_name?: string;
    draft_level?: string;
    draft_schoolStage?: string;
    draft_gradeLevel?: string;
    draft_studyTrack?: string;
    draft_customGradeName?: string;
    draft_description?: string;
    draft_classId?: string;
    draft_capacity?: string;
  }>;
};

export default async function ClassesPage({ searchParams }: ClassesPageProps) {
  await requireAdmin();
  const resolvedSearchParams = await searchParams;

  const filters = {
    stage: resolvedSearchParams?.stage?.trim() ?? "",
    track: resolvedSearchParams?.track?.trim() ?? "",
    classId: resolvedSearchParams?.classId?.trim() ?? "",
    sectionId: resolvedSearchParams?.sectionId?.trim() ?? "",
  };

  const [allClasses, activeClasses, allSections, counts, subjects] = await Promise.all([
    safeQuery(() => searchClasses(""), []),
    safeQuery(() => getActiveClasses(), []),
    safeQuery(() => getSections(), []),
    safeQuery(() => getClassesCount(), { total: 0, active: 0, inactive: 0, sections: 0 }),
    safeQuery(() => getActiveSubjects(), []),
  ]);

  const classes = applyClassFilters(allClasses, allSections, filters);
  const sections = applySectionFilters(allSections, filters);
  const hasClasses = counts.total > 0;

  return (
    <div className="mx-auto flex w-full max-w-[1350px] flex-col gap-6">
        <PageHeader
          title="الصفوف والشُعب"
          description="أنشئ الصفوف الدراسية ثم أضف الشُعب داخل كل صف، حتى يصبح تسجيل الطلاب وبناء الجدول أكثر ترتيبًا."
          icon="classes"
          badge="الخطوة الثالثة"
        />

        <ClassesFeedback
          classSaved={resolvedSearchParams?.classSaved}
          sectionSaved={resolvedSearchParams?.sectionSaved}
          deleted={resolvedSearchParams?.deleted}
          error={resolvedSearchParams?.error}
          reason={resolvedSearchParams?.reason}
        />

        <SmartAlert
          tone="info"
          title="الترتيب الذكي: صف ثم شعبة ثم طالب"
          description="يفضل إنشاء الصفوف أولًا، ثم الشُعب، وبعدها إضافة الطلاب داخل الشُعب المناسبة. تم تجهيز الصفوف الأساسية من الأول إلى السادس، ويمكنك إضافة شعب إضافية عند الحاجة."
          actionLabel="الخطوة التالية: الطلاب"
          actionHref="/students"
        />

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <ClassCreateForm draft={{
            name: resolvedSearchParams?.draft_name ?? "",
            level: resolvedSearchParams?.draft_level ?? "",
            schoolStage: resolvedSearchParams?.draft_schoolStage ?? "",
            gradeLevel: resolvedSearchParams?.draft_gradeLevel ?? "",
            studyTrack: resolvedSearchParams?.draft_studyTrack ?? "",
            customGradeName: resolvedSearchParams?.draft_customGradeName ?? "",
            description: resolvedSearchParams?.draft_description ?? "",
          }} />

          <div className="flex flex-col gap-6">
            <ClassesStats
              total={counts.total}
              sections={counts.sections}
            />

            <ClassFilterControls classes={allClasses} sections={allSections} filters={filters} />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCreateForm
            classes={activeClasses}
            draft={{
              classId: resolvedSearchParams?.draft_classId ?? "",
              name: resolvedSearchParams?.draft_name ?? "",
              capacity: resolvedSearchParams?.draft_capacity ?? "",
              description: resolvedSearchParams?.draft_description ?? "",
            }}
          />

          <SectionsPanel sections={sections} />
        </section>

        {!hasClasses ? (
          <EmptyState
            icon="classes"
            title="لا توجد صفوف بعد"
            description="ابدأ بإضافة أول صف مثل: الأول الابتدائي، الثاني المتوسط، أو السادس الإعدادي. بعد ذلك أضف الشُعب."
            actionLabel="إضافة أول صف"
            actionHref="#class-form"
            secondaryLabel="الرجوع إلى المواد"
            secondaryHref="/subjects"
          />
        ) : classes.length === 0 ? (
          <EmptyState
            icon="search"
            title="لا توجد صفوف مطابقة للبحث"
            description="غيّر المرحلة أو التخصص أو الصف من قوائم البحث المخصصة، أو صفّر البحث لعرض كل الصفوف."
            actionLabel="عرض كل الصفوف"
            actionHref="/classes"
          />
        ) : (
          <ClassesList classes={classes} subjects={subjects} />
        )}
      </div>
  );
}

async function createClassAction(formData: FormData) {
  "use server";

  const input: ClassFormInput = {
    name: String(formData.get("name") ?? ""),
    level: String(formData.get("level") ?? ""),
    schoolStage: String(formData.get("schoolStage") ?? ""),
    gradeLevel: String(formData.get("gradeLevel") ?? ""),
    studyTrack: String(formData.get("studyTrack") ?? ""),
    customGradeName: String(formData.get("customGradeName") ?? ""),
    description: String(formData.get("description") ?? ""),
  };

  const result = await createClass(input);

  if (!result.ok) {
    redirect(buildFormErrorRedirect("/classes", "create-class", formData, ["name", "level", "schoolStage", "gradeLevel", "studyTrack", "customGradeName", "description"], result.message));
  }

  revalidatePath("/");
  revalidatePath("/classes");
  revalidatePath("/reports");
  redirect("/classes?classSaved=1");
}

async function createSectionAction(formData: FormData) {
  "use server";

  const input: SectionFormInput = {
    name: String(formData.get("name") ?? ""),
    capacity: String(formData.get("capacity") ?? ""),
    description: String(formData.get("description") ?? ""),
    classId: String(formData.get("classId") ?? ""),
  };

  const result = await createSection(input);

  if (!result.ok) {
    redirect(buildFormErrorRedirect("/classes", "create-section", formData, ["classId", "name", "capacity", "description"], result.message));
  }

  revalidatePath("/");
  revalidatePath("/classes");
  revalidatePath("/reports");
  redirect("/classes?sectionSaved=1");
}

async function deleteClassAction(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  "use server";

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { ok: false, message: "معرّف الصف مفقود." };
  }

  let result;
  try {
    result = await deleteClass(id);
  } catch (error) {
    console.error("[deleteClassAction] Error:", error);
    return { ok: false, message: "حدث خطأ أثناء الحذف. تأكد من عدم وجود بيانات مرتبطة." };
  }

  if (!result.ok) {
    return { ok: false, message: result.message || "حدث خطأ أثناء الحذف." };
  }

  revalidatePath("/");
  revalidatePath("/classes");
  revalidatePath("/reports");
  redirect("/classes?deleted=1");
}

async function deleteSectionAction(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  "use server";

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { ok: false, message: "معرّف الشعبة مفقود." };
  }

  let result;
  try {
    result = await deleteSection(id);
  } catch (error) {
    console.error("[deleteSectionAction] Error:", error);
    return { ok: false, message: "حدث خطأ أثناء الحذف. تأكد من عدم وجود بيانات مرتبطة." };
  }

  if (!result.ok) {
    return { ok: false, message: result.message || "حدث خطأ أثناء الحذف." };
  }

  revalidatePath("/");
  revalidatePath("/classes");
  revalidatePath("/reports");
  redirect("/classes?deleted=1");
}

async function assignClassSubjectsAction(formData: FormData) {
  "use server";
  const classId = String(formData.get("classId") ?? "");
  const subjectIds = formData.getAll("subjectIds").map(String);

  if (!classId) {
    redirect("/classes?error=assign");
  }

  await assignSubjectsToClass(classId, subjectIds);
  revalidatePath("/");
  revalidatePath("/classes");
  revalidatePath("/reports");
  redirect("/classes?saved=1");
}

type ClassesFeedbackProps = {
  classSaved?: string;
  sectionSaved?: string;
  deleted?: string;
  error?: string;
  reason?: string;
};

function ClassesFeedback({
  classSaved,
  sectionSaved,
  deleted,
  error,
  reason,
}: ClassesFeedbackProps) {
  if (classSaved === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تمت إضافة الصف بنجاح"
        description="ممتاز، يمكنك الآن إضافة شعبة داخل هذا الصف."
      />
    );
  }

  if (sectionSaved === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تمت إضافة الشعبة بنجاح"
        description="تم إنشاء الشعبة وربطها بالصف المختار."
      />
    );
  }

  if (deleted === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تم الحذف بنجاح"
        description="تم حذف العنصر لأنه غير مرتبط بالطلاب أو جدول دراسي."
      />
    );
  }

  if (error) {
    let description: string;
    if (reason) {
      description = reason;
    } else if (error === "delete-class") {
      description = "لا يمكن حذف الصف إذا كان يحتوي على شُعب أو طلاب أو جدول أو مواد مرتبطة.";
    } else if (error === "delete-section") {
      description = "لا يمكن حذف الشعبة إذا كانت تحتوي على طلاب أو محاضرات في الجدول.";
    } else {
      description = "تأكد من إدخال البيانات بشكل صحيح، وعدم تكرار الصف أو الشعبة.";
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

function ClassCreateForm({ draft }: { draft?: { name?: string; level?: string; schoolStage?: string; gradeLevel?: string; studyTrack?: string; customGradeName?: string; description?: string } }) {
  return (
    <form
      id="class-form"
      action={createClassAction}
      className="app-card overflow-hidden"
    >
      <div className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/40 to-sky-50/20 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-teal-100 text-blue-700">
            <GraduationCap size={24} />
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-[var(--app-text)]">
              إضافة صف دراسي
            </h3>

            <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
              الصف هو المستوى الدراسي، مثل الأول الابتدائي أو الثالث المتوسط.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6">
        <ClassCreateFields
          draft={{
            schoolStage: draft?.schoolStage ?? "",
            gradeLevel: draft?.gradeLevel ?? "",
            studyTrack: draft?.studyTrack ?? "",
            customGradeName: draft?.customGradeName ?? "",
          }}
        />

        <div>
          <label
            htmlFor="class-description"
            className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
          >
            وصف مختصر
          </label>

          <textarea
            id="class-description"
            name="description"
            autoComplete="off"
            rows={4}
            maxLength={300}
            placeholder="ملاحظات بسيطة عن الصف..."
            className="input min-h-[110px] resize-y leading-7"
            defaultValue={draft?.description ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/30 to-sky-50/20 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-7 text-[var(--app-text-muted)]">
          بعد حفظ الصف، أضف شعبة واحدة على الأقل.
        </p>

        <button type="submit" className="btn btn-primary">
          <CheckCircle2 size={18} />
          حفظ الصف
        </button>
      </div>
    </form>
  );
}

type SectionCreateFormProps = {
  classes: SchoolClass[];
  draft?: { classId?: string; name?: string; capacity?: string; description?: string };
};

function SectionCreateForm({ classes, draft }: SectionCreateFormProps) {
  return (
    <form action={createSectionAction} className="app-card overflow-hidden">
      <div className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/40 to-sky-50/20 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-sky-100 text-teal-700">
            <DoorOpen size={24} />
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-[var(--app-text)]">
              إضافة شعبة
            </h3>

            <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
              الشعبة تكون داخل الصف، مثل شعبة أ أو ب.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6">
        <div>
          <label
            htmlFor="section-class"
            className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
          >
            الصف <span className="text-red-600">*</span>
          </label>

          <select
            id="section-class"
            name="classId"
            autoComplete="off"
            required
            disabled={classes.length === 0}
            className="input"
            defaultValue={draft?.classId ?? ""}
          >
            <option value="" disabled>
              اختر الصف
            </option>

            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {getClassDisplayName(schoolClass)}
              </option>
            ))}
          </select>

          {classes.length === 0 ? (
            <p className="mt-2 text-sm leading-6 text-sky-700">
              أضف صفًا أولًا حتى تتمكن من إنشاء الشُعب.
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
<SectionNameSelect defaultValue={draft?.name ?? ""} />

          <div>
            <label
              htmlFor="section-capacity"
              className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
            >
              السعة
            </label>

            <input
              id="section-capacity"
              name="capacity"
              autoComplete="off"
              type="number"
              min={1}
              placeholder="مثال: 30"
              className="input"
              defaultValue={draft?.capacity ?? ""}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="section-description"
            className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
          >
            وصف مختصر
          </label>

          <textarea
            id="section-description"
            name="description"
            autoComplete="off"
            rows={4}
            maxLength={300}
            placeholder="ملاحظات بسيطة عن الشعبة..."
            className="input min-h-[110px] resize-y leading-7"
            defaultValue={draft?.description ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/30 to-sky-50/20 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-7 text-[var(--app-text-muted)]">
          الشعبة ستُربط بالصف المختار مباشرة.
        </p>

        <button
          type="submit"
          disabled={classes.length === 0}
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle2 size={18} />
          حفظ الشعبة
        </button>
      </div>
    </form>
  );
}

type ClassesStatsProps = {
  total: number;
  sections: number;
};

function ClassesStats({ total, sections }: ClassesStatsProps) {
  const stats = [
    {
      label: "إجمالي الصفوف",
      value: total,
      icon: GraduationCap,
      className: "bg-gradient-to-br from-blue-100 to-teal-100 text-blue-700",
    },
    {
      label: "إجمالي الشُعب",
      value: sections,
      icon: DoorOpen,
      className: "bg-gradient-to-br from-teal-100 to-sky-100 text-teal-700",
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

type SectionsPanelProps = {
  sections: SectionListItem[];
};

function SectionsPanel({ sections }: SectionsPanelProps) {
  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-[var(--app-text)]">
            الشُعب المسجلة
          </h3>

          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            قائمة مختصرة بالشُعب المرتبطة بالصفوف.
          </p>
        </div>

        <span className="badge badge-info">{sections.length} شعبة</span>
      </div>

      {sections.length === 0 ? (
        <div className="p-6">
          <SmartAlert
            tone="info"
            title="لا توجد شُعب بعد"
            description="بعد إضافة الصف، أنشئ شعبة واحدة على الأقل حتى يمكن تسجيل الطلاب داخلها."
          />
        </div>
      ) : (
        <div className="divide-y divide-[var(--app-border-soft)]">
          {sections.map((section) => (
            <SectionRow key={section.id} section={section} />
          ))}
        </div>
      )}
    </section>
  );
}

type SectionRowProps = {
  section: SectionListItem;
};

function SectionRow({ section }: SectionRowProps) {
  return (
    <article className="grid gap-4 p-5 transition hover:bg-teal-50/40 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-100 to-sky-100 text-teal-700">
          <DoorOpen size={22} />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-extrabold text-[var(--app-text)]">
              {getSectionDisplayName(section)}
            </h4>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="badge bg-slate-100 text-slate-600">
              الطلاب: {section.studentsCount}
            </span>

            <span className="badge bg-slate-100 text-slate-600">
              المحاضرات: {section.schedulesCount}
            </span>

            <span className="badge bg-slate-100 text-slate-600">
              السعة: {section.capacity ?? "غير محددة"}
            </span>
          </div>

          {section.description ? (
            <p className="mt-3 text-sm leading-7 text-[var(--app-text-muted)]">
              {section.description}
            </p>
          ) : null}
        </div>
      </div>

      <details className="rounded-2xl border border-[var(--app-border-soft)] bg-white/70 p-4 lg:col-span-2">
        <summary className="cursor-pointer text-sm font-extrabold text-[var(--primary)] hover:underline">
          عرض تفاصيل الشعبة
        </summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailList title="الطلاب" items={section.studentDetails} empty="لا يوجد طلاب داخل هذه الشعبة." />
          <DetailList title="المدرسون" items={section.teacherDetails} empty="لا يوجد مدرسون مرتبطون بهذه الشعبة." />
          <DetailList title="المواد في الجدول" items={section.subjectDetails} empty="لا توجد مواد مرتبطة بجدول هذه الشعبة." />
          <DetailList title="المحاضرات" items={section.scheduleDetails} empty="لا توجد محاضرات مسجلة لهذه الشعبة." />
        </div>
      </details>

      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
        <DeleteConfirmButton
          action={deleteSectionAction}
          itemId={section.id}
          entityName="الشعبة"
          associations={section.deleteAssociations}
        />
      </div>
    </article>
  );
}


type DetailListProps = {
  title: string;
  items: string[];
  empty: string;
};

function DetailList({ title, items, empty }: DetailListProps) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-sm font-extrabold text-[var(--app-text)]">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">{empty}</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={`${title}-${item}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold leading-5 text-slate-700">
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type ClassesListProps = {
  classes: ClassListItem[];
  subjects: { id: string; name: string; schoolStage?: string | null; gradeLevel?: string | null; studyTrack?: string | null }[];
};

function ClassesList({ classes, subjects }: ClassesListProps) {
  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-[var(--app-text)]">
            قائمة الصفوف
          </h3>

          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            تابع الصفوف وعدد الشُعب والطلاب والمواد المرتبطة بها.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="badge badge-info">{classes.length} صف</span>
        </div>
      </div>

      <div className="divide-y divide-[var(--app-border-soft)]">
        {classes.map((schoolClass) => (
          <ClassRow key={schoolClass.id} schoolClass={schoolClass} subjects={subjects} />
        ))}
      </div>
    </section>
  );
}

type ClassRowProps = {
  schoolClass: ClassListItem;
  subjects: { id: string; name: string; schoolStage?: string | null; gradeLevel?: string | null; studyTrack?: string | null }[];
};

function ClassRow({ schoolClass, subjects }: ClassRowProps) {
  const availableSubjects = filterSubjectsForClass(subjects, schoolClass);

  return (
    <article className="grid gap-4 p-5 transition hover:bg-teal-50/40 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex min-w-0 gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 to-teal-100 text-blue-700">
          <GraduationCap size={25} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-extrabold text-[var(--app-text)]">
              {getClassDisplayName(schoolClass)}
            </h4>
          </div>

          {schoolClass.description ? (
            <p className="mt-3 text-sm leading-7 text-[var(--app-text-muted)]">
              {schoolClass.description}
            </p>
          ) : (
            <p className="mt-3 text-sm leading-7 text-[var(--app-text-soft)]">
              لا يوجد وصف لهذا الصف.
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="badge bg-slate-100 text-slate-600">
              <ListTree size={14} />
              الشُعب: {schoolClass.sectionsCount}
            </span>

            <span className="badge bg-slate-100 text-slate-600">
              <Users size={14} />
              الطلاب: {schoolClass.studentsCount}
            </span>

            <span className="badge bg-slate-100 text-slate-600">
              <Layers3 size={14} />
              المواد: {schoolClass.subjectsCount}
            </span>

            <span className="badge bg-slate-100 text-slate-600">
              المحاضرات: {schoolClass.schedulesCount}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
        <DeleteConfirmButton
          action={deleteClassAction}
          itemId={schoolClass.id}
          entityName="الصف"
          associations={schoolClass.deleteAssociations}
        />
      </div>

      <details className="rounded-2xl border border-[var(--app-border-soft)] bg-white/70 p-4 lg:col-span-2">
        <summary className="cursor-pointer text-sm font-extrabold text-[var(--primary)] hover:underline">
          عرض تفاصيل الصف
        </summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DetailList title="الشُعب" items={schoolClass.sectionDetails} empty="لا توجد شُعب داخل هذا الصف." />
          <DetailList title="الطلاب" items={schoolClass.studentDetails} empty="لا يوجد طلاب داخل هذا الصف." />
          <DetailList title="المدرسون" items={schoolClass.teacherDetails} empty="لا يوجد مدرسون مرتبطون بهذا الصف." />
          <DetailList title="المواد" items={schoolClass.subjectDetails} empty="لا توجد مواد مرتبطة بهذا الصف." />
          <DetailList title="المحاضرات" items={schoolClass.scheduleDetails} empty="لا توجد محاضرات لهذا الصف." />
        </div>
      </details>

      <details className="mt-3 rounded-2xl border border-teal-100 bg-teal-50/30 p-4 lg:col-span-2">
        <summary className="cursor-pointer text-sm font-bold text-[var(--primary)] hover:underline">
          ربط المواد المطابقة للمرحلة والتخصص
        </summary>
        <form action={assignClassSubjectsAction} className="mt-3 space-y-2">
          <input type="hidden" name="classId" value={schoolClass.id} />
          {availableSubjects.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-800">
              لا توجد مواد مطابقة لمرحلة وتخصص هذا الصف. أضف المواد من تبويب المواد الدراسية بنفس المرحلة والتخصص أولًا.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {availableSubjects.map((subject) => (
              <label key={subject.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="subjectIds"
                  value={subject.id}
                  id={`subject-${subject.id}`}
                  autoComplete="off"
                  defaultChecked={schoolClass.subjectIds?.includes(subject.id) ?? false}
                />
                {subject.name}
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="mt-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--primary-hover)]"
          >
            حفظ مواد الصف
          </button>
        </form>
      </details>
    </article>
  );
}
