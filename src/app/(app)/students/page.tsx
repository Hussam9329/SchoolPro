import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";
import { buildFormErrorRedirect } from "@/lib/redirect-message";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileText,
  GraduationCap,
  MessageCircle,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SmartAlert } from "@/components/shared/smart-alert";
import { safeQuery } from "@/lib/db";
import {
  getClasses,
  getOrCreateDefaultSectionForClass,
  getSections,
} from "@/services/class-service";
import {
  createStudent,
  deleteStudent,
  getStudents,
  getStudentsCount,
  updateStudentStatus,
} from "@/services/student-service";
import {
  calculateAge,
  getStudentClassDisplay,
  getStudentStatusBadgeClass,
  getStudentStatusLabel,
  type StudentFormInput,
  type StudentListItem,
} from "@/types/student";
import { CopyCodeButton, GenerateBadgeButton } from "@/components/students/student-actions";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { StudentQrImage } from "@/components/students/student-qr-image";
import {
  getClassDisplayName,
  type ClassListItem,
  type SectionListItem,
} from "@/types/class";

export const dynamic = "force-dynamic";



type StudentsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    saved?: string;
    deleted?: string;
    statusUpdated?: string;
    error?: string;
    reason?: string;
    draft_fullName?: string;
    draft_phone?: string;
    draft_guardianPhone?: string;
    draft_birthDate?: string;
    draft_placementId?: string;
  }>;
};

export default async function StudentsPage({
  searchParams,
}: StudentsPageProps) {
  await requireAdmin();
  const resolvedSearchParams = await searchParams;

  const query = resolvedSearchParams?.q?.trim() ?? "";
  const status = resolvedSearchParams?.status?.trim() ?? "";

  const [students, classes, sections, counts] = await Promise.all([
    safeQuery(() => getStudents({
      query,
      status,
    }), []),
    safeQuery(() => getClasses(), []),
    safeQuery(() => getSections(), []),
    safeQuery(() => getStudentsCount(), { total: 0, active: 0, inactive: 0, graduated: 0, transferred: 0, withoutSection: 0 }),
  ]);

  const hasStudents = counts.total > 0;

  return (
    <div className="mx-auto flex w-full max-w-[1350px] flex-col gap-6">
        <PageHeader
          title="الطلاب"
          description="أضف الطلاب واربط كل طالب بالشعبة المناسبة، مع متابعة الحالة والمعلومات الأساسية."
          icon="students"
          badge="الخطوة الرابعة"
        />

        <StudentsFeedback
          saved={resolvedSearchParams?.saved}
          deleted={resolvedSearchParams?.deleted}
          statusUpdated={resolvedSearchParams?.statusUpdated}
          error={resolvedSearchParams?.error}
          reason={resolvedSearchParams?.reason}
        />

        <SmartAlert
          tone="info"
          title="الطلاب يعتمدون على الشُعب"
          description="يمكنك إضافة الطالب بدون شعبة مؤقتًا، لكن الأفضل ربطه بشعبة حتى تعمل الحضور والدرجات والتقارير بشكل أدق."
          actionLabel="إدارة الصفوف والشُعب"
          actionHref="/classes"
        />

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <StudentCreateForm
            classes={classes}
            sections={sections}
            draft={{
              fullName: resolvedSearchParams?.draft_fullName,
              phone: resolvedSearchParams?.draft_phone,
              guardianPhone: resolvedSearchParams?.draft_guardianPhone,
              birthDate: resolvedSearchParams?.draft_birthDate,
              placementId: resolvedSearchParams?.draft_placementId,
            }}
          />

          <div className="flex flex-col gap-6">
            <StudentsStats
              total={counts.total}
              active={counts.active}
              inactive={counts.inactive}
              graduated={counts.graduated}
              transferred={counts.transferred}
              withoutSection={counts.withoutSection}
            />

            <StudentSearchForm query={query} status={status} />
          </div>
        </section>

        {!hasStudents ? (
          <EmptyState
            icon="students"
            title="لا يوجد طلاب بعد"
            description="ابدأ بإضافة أول طالب، ثم اربطه بالشعبة المناسبة. بعدها يصبح تسجيل الحضور والدرجات والأقساط أسهل."
            actionLabel="إضافة أول طالب"
            actionHref="#student-form"
            secondaryLabel="إدارة الشُعب"
            secondaryHref="/classes"
          />
        ) : students.length === 0 ? (
          <EmptyState
            icon="search"
            title="لا توجد نتائج مطابقة"
            description="جرّب البحث باسم الطالب أو رقم الطالب أو ولي الأمر، أو غيّر فلتر الحالة."
            actionLabel="عرض كل الطلاب"
            actionHref="/students"
          />
        ) : (
          <StudentsList students={students} />
        )}
      </div>
  );
}

async function createStudentAction(formData: FormData) {
  "use server";

  const placementId = String(formData.get("placementId") ?? "");
  const [placementType, selectedId] = placementId.split(":");

  let sectionId = "";

  if (placementType === "section" && selectedId) {
    sectionId = selectedId;
  } else if (placementType === "class" && selectedId) {
    const defaultSectionResult = await getOrCreateDefaultSectionForClass(selectedId);

    if (!defaultSectionResult.ok || !defaultSectionResult.data) {
      redirect(buildFormErrorRedirect("/students", "create", formData, ["fullName", "phone", "guardianPhone", "birthDate", "placementId"], defaultSectionResult.message));
    }

    sectionId = defaultSectionResult.data.id;
  }

  const input: StudentFormInput = {
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    guardianPhone: String(formData.get("guardianPhone") ?? ""),
    birthDate: String(formData.get("birthDate") ?? ""),
    sectionId,
  };

  const result = await createStudent(input);

  if (!result.ok) {
    redirect(buildFormErrorRedirect("/students", "create", formData, ["fullName", "phone", "guardianPhone", "birthDate", "placementId"], result.message));
  }

  revalidatePath("/");
  revalidatePath("/students");
  revalidatePath("/reports");
  redirect("/students?saved=1");
}

async function updateStudentStatusAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !status) {
    redirect("/students?error=missing-data");
  }

  const result = await updateStudentStatus(id, status);

  if (!result.ok) {
    redirect("/students?error=status");
  }

  revalidatePath("/");
  revalidatePath("/students");
  revalidatePath("/reports");
  redirect("/students?statusUpdated=1");
}

async function deleteStudentAction(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  "use server";

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { ok: false, message: "معرّف الطالب مفقود." };
  }

  let result;
  try {
    result = await deleteStudent(id);
  } catch (error) {
    console.error("[deleteStudentAction] Error:", error);
    return { ok: false, message: "حدث خطأ أثناء الحذف. تأكد من عدم وجود بيانات مرتبطة." };
  }

  if (!result.ok) {
    return { ok: false, message: result.message || "حدث خطأ أثناء الحذف." };
  }

  revalidatePath("/");
  revalidatePath("/students");
  revalidatePath("/reports");
  redirect("/students?deleted=1");
}

type StudentsFeedbackProps = {
  saved?: string;
  deleted?: string;
  statusUpdated?: string;
  error?: string;
  reason?: string;
};

function StudentsFeedback({
  saved,
  deleted,
  statusUpdated,
  error,
  reason,
}: StudentsFeedbackProps) {
  if (saved === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تمت إضافة الطالب بنجاح"
        description="تم حفظ بيانات الطالب وربطه بالشعبة المحددة إن وُجدت."
      />
    );
  }

  if (deleted === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تم حذف الطالب"
        description="تم حذف الطالب لأنه لا يملك سجلات حضور أو درجات أو أقساط مرتبطة."
      />
    );
  }

  if (statusUpdated === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تم تحديث حالة الطالب"
        description="تم تغيير حالة الطالب بنجاح."
      />
    );
  }

  if (error) {
    let description: string;
    if (reason) {
      description = reason;
    } else if (error === "delete") {
      description = "لا يمكن حذف الطالب إذا كان لديه درجات أو حضور أو أقساط. غيّر حالته بدل الحذف.";
    } else if (error === "status") {
      description = "تعذر تغيير حالة الطالب. تأكد من اختيار حالة صحيحة.";
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

type StudentClassGroup = {
  classId: string;
  className: string;
  sections: SectionListItem[];
};

type StudentCreateFormProps = {
  classes: ClassListItem[];
  sections: SectionListItem[];
  draft?: {
    fullName?: string;
    phone?: string;
    guardianPhone?: string;
    birthDate?: string;
    placementId?: string;
  };
};

function StudentCreateForm({ classes, sections, draft }: StudentCreateFormProps) {
  const todayInputValue = new Date().toISOString().slice(0, 10);
  const sectionsByClassId = sections.reduce<Record<string, SectionListItem[]>>(
    (groups, section) => {
      if (!groups[section.classId]) {
        groups[section.classId] = [];
      }

      groups[section.classId].push(section);
      return groups;
    },
    {},
  );

  const classGroups: StudentClassGroup[] = classes.map((schoolClass) => ({
    classId: schoolClass.id,
    className: getClassDisplayName(schoolClass),
    sections: sectionsByClassId[schoolClass.id] ?? [],
  }));

  return (
    <form
      id="student-form"
      action={createStudentAction}
      className="app-card overflow-hidden"
    >
      <div className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/40 to-sky-50/20 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-teal-100 text-blue-700">
            <UserRound size={24} />
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-[var(--app-text)]">
              إضافة طالب
            </h3>

            <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
              أدخل بيانات الطالب الأساسية المطلوبة فقط.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6">
        {/* Smart Alert */}
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-l from-teal-50/80 from-sky-50/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <AlertTriangle size={16} />
            </div>
            <p className="text-sm leading-7 text-teal-800">
              اختر الصف مباشرة. إذا كان الصف لا يحتوي على شعبة، سيتم إنشاء شعبة عامة تلقائيًا عند حفظ الطالب.
            </p>
          </div>
        </div>

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

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
            >
              رقم هاتف الطالب <span className="text-red-600">*</span>
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

          <div>
            <label
              htmlFor="guardianPhone"
              className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
            >
              رقم هاتف ولي الأمر <span className="text-red-600">*</span>
            </label>
            <input
              id="guardianPhone"
              name="guardianPhone"
              type="tel"
              autoComplete="off"
              required
              pattern="07\d{9}"
              maxLength={11}
              placeholder="مثال: 07801234567"
              className="input"
              dir="ltr"
              defaultValue={draft?.guardianPhone ?? ""}
            />
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">11 رقم ويبدأ بـ 07</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="birthDate"
              className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
            >
              تاريخ الميلاد <span className="text-red-600">*</span>
            </label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              autoComplete="off"
              required
              max={todayInputValue}
              className="input"
              defaultValue={draft?.birthDate ?? ""}
            />
          </div>

          <div>
            <span className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
              الصف / الشعبة <span className="text-red-600">*</span>
            </span>

            {classGroups.length === 0 ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-7 text-sky-800">
                لا توجد صفوف مضافة حاليًا. أضف الصف من صفحة إدارة الصفوف أولًا.
              </div>
            ) : (
              <select
                id="placementId"
                name="placementId"
                autoComplete="off"
                required
                className="input"
                defaultValue={draft?.placementId ?? ""}
              >
                <option value="" disabled>
                  اختر الصف / الشعبة
                </option>
                {classGroups.map((group) => (
                  <optgroup key={group.classId} label={group.className}>
                    {group.sections.length === 0 ? (
                      <option value={`class:${group.classId}`}>
                        {group.className} — إنشاء شعبة عامة تلقائيًا
                      </option>
                    ) : (
                      group.sections.map((section) => {
                        const studentLabel = section.studentsCount === 1 ? "طالب واحد" : `${section.studentsCount} طالب`;
                        const capacityLabel = section.capacity ? ` / السعة ${section.capacity}` : "";

                        return (
                          <option key={section.id} value={`section:${section.id}`}>
                            {group.className} / شعبة {section.name} — {studentLabel}{capacityLabel}
                          </option>
                        );
                      })
                    )}
                  </optgroup>
                ))}
              </select>
            )}

            <p className="mt-2 text-xs leading-6 text-[var(--app-text-muted)]">
              القائمة صارت مرتبة بدل بطاقات كثيرة؛ اختر الشعبة مباشرة أو الصف لإنشاء شعبة عامة تلقائيًا.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/30 to-sky-50/20 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-7 text-[var(--app-text-muted)]">
          بعد إضافة الطلاب، يمكن استخدامهم في الحضور والدرجات والأقساط.
        </p>

        <button type="submit" className="btn btn-primary">
          <CheckCircle2 size={18} />
          حفظ الطالب
        </button>
      </div>
    </form>
  );
}

type StudentsStatsProps = {
  total: number;
  active: number;
  inactive: number;
  graduated: number;
  transferred: number;
  withoutSection: number;
};

function StudentsStats({
  total,
  active,
  inactive,
  graduated,
  transferred,
  withoutSection,
}: StudentsStatsProps) {
  const stats = [
    {
      label: "إجمالي الطلاب",
      value: total,
      icon: Users,
      className: "bg-gradient-to-br from-blue-100 to-teal-100 text-blue-700",
    },
    {
      label: "مستمرون",
      value: active,
      icon: CheckCircle2,
      className: "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700",
    },
    {
      label: "متوقفون",
      value: inactive,
      icon: AlertTriangle,
      className: "bg-gradient-to-br from-sky-100 to-orange-100 text-sky-700",
    },
    {
      label: "متخرجون",
      value: graduated,
      icon: GraduationCap,
      className: "bg-gradient-to-br from-teal-100 to-sky-100 text-teal-700",
    },
    {
      label: "منقولون",
      value: transferred,
      icon: AlertTriangle,
      className: "bg-gradient-to-br from-teal-100 to-teal-100 text-teal-700",
    },
    {
      label: "بدون شعبة",
      value: withoutSection,
      icon: UserRound,
      className: "bg-gradient-to-br from-slate-100 to-slate-50 text-slate-700",
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

type StudentSearchFormProps = {
  query: string;
  status: string;
};

function StudentSearchForm({ query, status }: StudentSearchFormProps) {
  return (
    <form action="/students" className="app-card p-5">
      <label
        htmlFor="q"
        className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
      >
        البحث والتصفية
      </label>

      <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]"
          />

          <input
            id="q"
            name="q"
            autoComplete="off"
            defaultValue={query}
            placeholder="اسم الطالب، الرقم، الهاتف، ولي الأمر..."
            className="input pr-11"
          />
        </div>

        <select id="student-status-filter" name="status" autoComplete="off" defaultValue={status} className="input">
          <option value="">كل الحالات</option>
          <option value="active">مستمر</option>
          <option value="inactive">متوقف</option>
          <option value="graduated">متخرج</option>
          <option value="transferred">منقول</option>
        </select>

        <button type="submit" className="btn btn-secondary">
          بحث
        </button>
      </div>
    </form>
  );
}

type StudentsListProps = {
  students: StudentListItem[];
};

function StudentsList({ students }: StudentsListProps) {
  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-[var(--app-text)]">
            قائمة الطلاب
          </h3>

          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            تابع الطلاب وحالاتهم وربطهم بالشُعب والسجلات المرتبطة.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="badge badge-info">{students.length} طالب</span>
        </div>
      </div>

      <div className="divide-y divide-[var(--app-border-soft)]">
        {students.map((student) => (
          <StudentRow key={student.id} student={student} />
        ))}
      </div>
    </section>
  );
}

type StudentRowProps = {
  student: StudentListItem;
};

function getWhatsappUrl(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("964")
    ? digits
    : digits.startsWith("0")
      ? `964${digits.slice(1)}`
      : digits;
  return `https://wa.me/${normalized}`;
}

function StudentRow({ student }: StudentRowProps) {
  const age = calculateAge(student.birthDate);
  const statusClass = getStudentStatusBadgeClass(student.status);

  return (
    <article className="grid gap-4 p-5 transition hover:bg-teal-50/40 xl:grid-cols-[1fr_auto] xl:items-center">
      <div className="flex min-w-0 gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 to-teal-100 text-blue-700">
          <UserRound size={25} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-extrabold text-[var(--app-text)]">
              {student.fullName}
            </h4>

            <span className={["badge", statusClass].join(" ")}>
              {getStudentStatusLabel(student.status)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-sm text-[var(--app-text-muted)]">
            {student.studentCode ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold text-[var(--app-text-muted)]">
                {student.studentCode}
              </span>
            ) : null}

            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold">
              <GraduationCap size={14} />
              {getStudentClassDisplay({
                className: student.className,
                classLevel: student.classLevel,
                sectionName: student.sectionName,
              })}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold">
              <CalendarDays size={14} />
              العمر: {age ?? "غير محدد"}
            </span>
          </div>

          {student.studentCode ? (
            <div className="mt-2 flex items-center gap-2">
              <CopyCodeButton studentCode={student.studentCode} />
              <GenerateBadgeButton
                fullName={student.fullName}
                studentCode={student.studentCode}
              />
              <StudentQrImage studentId={student.id} studentCode={student.studentCode} />
            </div>
          ) : null}

          <div className="mt-3 grid gap-2 text-sm leading-6 text-[var(--app-text-muted)] md:grid-cols-2">
            <p>
              هاتف الطالب:{" "}
              <span className="font-bold text-[var(--app-text)]" dir="ltr">
                {student.phone || "غير مضاف"}
              </span>
            </p>

            <p>
              هاتف ولي الأمر:{" "}
              <span className="font-bold text-[var(--app-text)]" dir="ltr">
                {student.guardianPhone || "غير مضاف"}
              </span>
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="badge bg-slate-100 text-slate-600">
              الحضور: {student.attendanceCount}
            </span>

            <span className="badge bg-slate-100 text-slate-600">
              الدرجات: {student.gradesCount}
            </span>

            <span className="badge bg-slate-100 text-slate-600">
              الأقساط: {student.feesCount}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:w-[280px] xl:grid-cols-1">
        <form action={updateStudentStatusAction} className="flex gap-2">
          <input type="hidden" name="id" value={student.id} />

          <select
            id={`status-${student.id}`}
            name="status"
            autoComplete="off"
            defaultValue={student.status}
            className="input h-11 flex-1 py-0 text-sm"
          >
            <option value="active">مستمر</option>
            <option value="inactive">متوقف</option>
            <option value="graduated">متخرج</option>
            <option value="transferred">منقول</option>
          </select>

          <button type="submit" className="btn btn-secondary h-11 px-3">
            حفظ
          </button>
        </form>

        <a
          href={`/students/${student.id}`}
          className="btn btn-secondary w-full"
        >
          <FileText size={17} />
          ملف الطالب
        </a>

        <a
          href={getWhatsappUrl(student.guardianPhone || student.phone)}
          target="_blank"
          rel="noreferrer"
          className={[
            "btn btn-secondary w-full",
            !getWhatsappUrl(student.guardianPhone || student.phone)
              ? "pointer-events-none opacity-60"
              : "",
          ].join(" ")}
        >
          <MessageCircle size={17} />
          تواصل مع ولي الأمر على واتساب
        </a>

        <DeleteConfirmButton
          action={deleteStudentAction}
          itemId={student.id}
          entityName="الطالب"
          associations={[
            ...(student.gradesCount > 0 ? [{ label: "درجات", count: student.gradesCount }] : []),
            ...(student.attendanceCount > 0 ? [{ label: "سجلات حضور", count: student.attendanceCount }] : []),
            ...(student.feesCount > 0 ? [{ label: "أقساط ومدفوعات", count: student.feesCount }] : []),
          ]}
        />
      </div>
    </article>
  );
}
