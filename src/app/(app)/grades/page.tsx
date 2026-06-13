import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Layers,
  Search,
  Star,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { safeQuery } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SmartAlert } from "@/components/shared/smart-alert";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { getExams } from "@/services/exam-service";
import { deleteGrade, getGrades, getGradesCount } from "@/services/grade-service";
import { getSections } from "@/services/class-service";
import { getActiveSubjects } from "@/services/subject-service";
import { getActiveTeachers } from "@/services/teacher-service";
import {
  EXAM_TYPES,
  formatGradeShortDate,
  getGradeLevelLabel,
  getGradeWarning,
  type GradeListItem,
} from "@/types/grade";
import { getSectionDisplayName } from "@/types/class";


export const dynamic = "force-dynamic";


type GradesPageProps = {
  searchParams?: Promise<{
    q?: string;
    examType?: string;
    sectionId?: string;
    subjectId?: string;
    teacherId?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
};

export default async function GradesPage({ searchParams }: GradesPageProps) {
  await requireAdmin();
  const resolvedSearchParams = await searchParams;

  const query = resolvedSearchParams?.q?.trim() ?? "";
  const examType = resolvedSearchParams?.examType?.trim() ?? "";
  const sectionId = resolvedSearchParams?.sectionId?.trim() ?? "";
  const subjectId = resolvedSearchParams?.subjectId?.trim() ?? "";
  const teacherId = resolvedSearchParams?.teacherId?.trim() ?? "";

  const [exams, grades, counts, sections, subjects, teachers] = await Promise.all([
    safeQuery(
      () => getExams({
        sectionId: sectionId || undefined,
        subjectId: subjectId || undefined,
        teacherId: teacherId || undefined,
        type: examType || undefined,
      }),
      [],
    ),
    safeQuery(
      () => getGrades({
        query,
        examType: examType || undefined,
        sectionId: sectionId || undefined,
        subjectId: subjectId || undefined,
        teacherId: teacherId || undefined,
      }),
      [],
    ),
    safeQuery(() => getGradesCount(), {
      total: 0,
      excellent: 0,
      passed: 0,
      failed: 0,
      averagePercentage: 0,
    }),
    safeQuery(() => getSections(), []),
    safeQuery(() => getActiveSubjects(), []),
    safeQuery(() => getActiveTeachers(), []),
  ]);

  const selectedFiltersCount = [sectionId, subjectId, teacherId, examType].filter(Boolean).length;

  return (
    <div className="mx-auto flex w-full max-w-[1350px] flex-col gap-6">
        <PageHeader
          title="الدرجات"
          description="اختر الصف ثم المادة أو المدرس ونوع الامتحان، وبعدها أدخل درجات جميع طلاب الصف من شاشة الامتحان."
          icon="grades"
          badge="مرتبطة بالامتحانات"
        />

        <GradesFeedback deleted={resolvedSearchParams?.deleted} error={resolvedSearchParams?.error} saved={resolvedSearchParams?.saved} />

        <SmartAlert
          tone="info"
          title="تم تغيير آلية الدرجات"
          description="إدخال الدرجات الفردي تم إلغاؤه من هذه التبويبة. الآن تُنشئ الامتحان أولًا، ثم تدخل درجات كل طلاب الصف دفعة واحدة."
          actionLabel="إضافة امتحان"
          actionHref="/exams"
        />

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <GradeExamFilterForm
            sections={sections}
            subjects={subjects}
            teachers={teachers}
            sectionId={sectionId}
            subjectId={subjectId}
            teacherId={teacherId}
            examType={examType}
            query={query}
          />

          <div className="flex flex-col gap-6">
            <GradesStats
              total={counts.total}
              excellent={counts.excellent}
              passed={counts.passed}
              failed={counts.failed}
              averagePercentage={counts.averagePercentage}
            />
            <GradeSearchForm
              query={query}
              sectionId={sectionId}
              subjectId={subjectId}
              teacherId={teacherId}
              examType={examType}
            />
          </div>
        </section>

        <MatchingExams exams={exams as any[]} selectedFiltersCount={selectedFiltersCount} />

        {grades.length === 0 ? (
          <EmptyState
            icon="grades"
            title="لا توجد درجات مطابقة"
            description="اختر امتحانًا من القائمة أعلاه لإدخال درجات الطلاب، أو غيّر الفلاتر لعرض درجات أخرى."
            actionLabel="إدارة الامتحانات"
            actionHref="/exams"
          />
        ) : (
          <GradesList grades={grades} />
        )}
      </div>
  );
}

async function deleteGradeAction(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  "use server";

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "معرّف الدرجة مفقود." };

  let result;
  try {
    result = await deleteGrade(id);
  } catch (error) {
    console.error("[deleteGradeAction] Error:", error);
    return { ok: false, message: "حدث خطأ أثناء حذف الدرجة." };
  }

  if (!result.ok) return { ok: false, message: result.message || "لا يمكن حذف الدرجة حاليًا." };

  revalidatePath("/");
  revalidatePath("/grades");
  revalidatePath("/reports");
  redirect("/grades?deleted=1");
}

function GradesFeedback({ saved, deleted, error }: { saved?: string; deleted?: string; error?: string }) {
  if (saved === "1") {
    return <SmartAlert tone="success" title="تم حفظ الدرجات" description="تم تحديث سجل الدرجات المرتبط بالامتحان." />;
  }
  if (deleted === "1") {
    return <SmartAlert tone="success" title="تم حذف الدرجة" description="تم حذف الدرجة من سجل الطالب بنجاح." />;
  }
  if (error) {
    return <SmartAlert tone="warning" title="لم تكتمل العملية" description="راجع بيانات الامتحان والدرجات ثم حاول مرة أخرى." />;
  }
  return null;
}

type GradeExamFilterFormProps = {
  sections: Awaited<ReturnType<typeof getSections>>;
  subjects: Awaited<ReturnType<typeof getActiveSubjects>>;
  teachers: Awaited<ReturnType<typeof getActiveTeachers>>;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  examType: string;
  query: string;
};

function GradeExamFilterForm({ sections, subjects, teachers, sectionId, subjectId, teacherId, examType, query }: GradeExamFilterFormProps) {
  return (
    <form action="/grades" className="app-card overflow-hidden">
      <div className="border-b border-[var(--app-border-soft)] bg-gradient-to-l to-indigo-50/40 to-amber-50/20 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700">
            <ClipboardList size={24} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[var(--app-text)]">اختيار الامتحان لإدخال الدرجات</h3>
            <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
              الفلاتر هنا تبحث في الامتحانات التي تمت إضافتها من تبويبة الامتحانات.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div>
          <label htmlFor="sectionId" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
            <Layers size={14} className="ml-1 inline-block" /> الصف / الشعبة
          </label>
          <select id="sectionId" name="sectionId" defaultValue={sectionId} className="input">
            <option value="">كل الصفوف</option>
            {sections.map((section) => <option key={section.id} value={section.id}>{getSectionDisplayName(section)}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="subjectId" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
            <BookOpen size={14} className="ml-1 inline-block" /> المادة
          </label>
          <select id="subjectId" name="subjectId" defaultValue={subjectId} className="input">
            <option value="">كل المواد</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="teacherId" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
            <GraduationCap size={14} className="ml-1 inline-block" /> المدرس
          </label>
          <select id="teacherId" name="teacherId" defaultValue={teacherId} className="input">
            <option value="">كل المدرسين</option>
            {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="examType" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">نوع الامتحان</label>
          <select id="examType" name="examType" defaultValue={examType} className="input">
            <option value="">كل الأنواع</option>
            {EXAM_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>

        <input type="hidden" name="q" value={query} />
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--app-border-soft)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-7 text-[var(--app-text-muted)]">بعد ظهور الامتحان المطلوب اضغط “إدخال الدرجات” لفتح جدول الطلاب.</p>
        <div className="flex flex-wrap gap-2">
          <a href="/grades" className="btn btn-secondary">تصفير</a>
          <button type="submit" className="btn btn-primary">عرض الامتحانات</button>
        </div>
      </div>
    </form>
  );
}

function GradeSearchForm({ query, sectionId, subjectId, teacherId, examType }: {
  query: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  examType: string;
}) {
  return (
    <form action="/grades" className="app-card p-5">
      <label htmlFor="q" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">بحث داخل الدرجات المحفوظة</label>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]" />
          <input id="q" name="q" defaultValue={query} placeholder="اسم طالب، رمز، مادة، مدرس..." className="input pr-11" autoComplete="off" />
        </div>
        <button type="submit" className="btn btn-secondary">بحث</button>
      </div>
      {sectionId && <input type="hidden" name="sectionId" value={sectionId} />}
      {subjectId && <input type="hidden" name="subjectId" value={subjectId} />}
      {teacherId && <input type="hidden" name="teacherId" value={teacherId} />}
      {examType && <input type="hidden" name="examType" value={examType} />}
    </form>
  );
}

function MatchingExams({ exams, selectedFiltersCount }: { exams: any[]; selectedFiltersCount: number }) {
  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-[var(--app-text)]">الامتحانات المطابقة</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            {selectedFiltersCount > 0 ? "هذه نتيجة الفلاتر المختارة." : "تظهر أحدث الامتحانات. استخدم الفلاتر للوصول السريع."}
          </p>
        </div>
        <a href="/exams" className="btn btn-secondary">إضافة امتحان</a>
      </div>

      {exams.length === 0 ? (
        <div className="p-6">
          <EmptyState icon="grades" title="لا يوجد امتحان مطابق" description="أضف امتحانًا جديدًا أو غيّر الفلاتر حتى تظهر النتائج." actionLabel="إضافة امتحان" actionHref="/exams" />
        </div>
      ) : (
        <div className="grid gap-4 p-6 lg:grid-cols-2">
          {exams.map((exam) => {
            const studentsCount = exam.section?.students?.filter((student: any) => student.status !== "inactive").length;
            const savedCount = exam._count?.grades ?? exam.grades?.length ?? 0;
            return (
              <article key={exam.id} className="rounded-3xl border border-[var(--app-border-soft)] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-lg font-extrabold text-[var(--app-text)]">{exam.name}</h4>
                    <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
                      {exam.subject?.name ?? "مادة غير محددة"} — {exam.teacher?.fullName ?? "مدرس غير محدد"}
                    </p>
                  </div>
                  <span className="badge badge-info">{EXAM_TYPES.find((type) => type.value === exam.type)?.label ?? exam.type}</span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-[var(--app-text-muted)] sm:grid-cols-2">
                  <p><Layers size={14} className="ml-1 inline-block" /> {exam.section ? `${exam.section.class?.name ?? "صف غير محدد"} / شعبة ${exam.section.name}` : "صف غير محدد"}</p>
                  <p><Award size={14} className="ml-1 inline-block" /> الدرجة {exam.maxScore} / النجاح {exam.passScore}</p>
                  <p><BarChart3 size={14} className="ml-1 inline-block" /> محفوظ: {savedCount}{studentsCount ? ` من ${studentsCount}` : ""}</p>
                  <p>التاريخ: {exam.date ? formatGradeShortDate(new Date(exam.date)) : "غير محدد"}</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <a href={`/exams/${exam.id}/grades`} className="btn btn-primary">إدخال الدرجات <ArrowLeft size={16} /></a>
                  <a href="/exams" className="btn btn-secondary">تفاصيل الامتحانات</a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function GradesStats({ total, excellent, passed, failed, averagePercentage }: {
  total: number;
  excellent: number;
  passed: number;
  failed: number;
  averagePercentage: number;
}) {
  const stats = [
    { label: "إجمالي الدرجات", value: total, icon: BarChart3, className: "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700" },
    { label: "ممتاز", value: excellent, icon: Star, className: "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700" },
    { label: "ناجح", value: passed, icon: TrendingUp, className: "bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-700" },
    { label: "راسب", value: failed, icon: TrendingDown, className: "bg-indigo-100 text-indigo-700" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="app-card app-card-hover p-5">
              <div className="flex items-center gap-4">
                <div className={["flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", stat.className].join(" ")}><Icon size={22} /></div>
                <div>
                  <p className="text-sm font-bold text-[var(--app-text-muted)]">{stat.label}</p>
                  <p className="mt-1 text-3xl font-extrabold text-[var(--app-text)]">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="app-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Award size={20} /></div>
            <div>
              <p className="text-sm font-bold text-[var(--app-text-muted)]">متوسط النسبة المئوية</p>
              <p className="text-2xl font-extrabold text-[var(--app-text)]">{averagePercentage}%</p>
            </div>
          </div>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${averagePercentage}%` }} />
        </div>
      </div>
    </div>
  );
}

function GradesList({ grades }: { grades: GradeListItem[] }) {
  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-[var(--app-text)]">الدرجات المحفوظة</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">مراجعة الدرجات المسجلة من الامتحانات.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-info">{grades.length} درجة</span>
        </div>
      </div>
      <div className="divide-y divide-[var(--app-border-soft)]">
        {grades.map((grade) => <GradeRow key={grade.id} grade={grade} />)}
      </div>
    </section>
  );
}

function GradeRow({ grade }: { grade: GradeListItem }) {
  const percentage = grade.percentage;
  const warningMessage = getGradeWarning(percentage);
  const ratingBadgeClass =
    grade.ratingClass === "badge-success" ? "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700" :
    grade.ratingClass === "badge-info" ? "bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-700" :
    grade.ratingClass === "badge-warning" ? "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700" : "bg-indigo-100 text-indigo-700";

  return (
    <article className="grid gap-4 p-5 transition hover:bg-indigo-50/40 xl:grid-cols-[1fr_auto] xl:items-center">
      <div className="flex min-w-0 gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-700"><ClipboardList size={25} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-extrabold text-[var(--app-text)]">{grade.title}</h4>
            <span className={["badge", ratingBadgeClass].join(" ")}>{grade.rating}</span>
            <span className="badge bg-slate-100 text-slate-600">{grade.examTypeLabel}</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-sm text-[var(--app-text-muted)]">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold"><UserRound size={14} />{grade.studentName}</span>
            {grade.sectionName && grade.className && <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 font-bold text-indigo-700"><Layers size={14} />{grade.className} / شعبة {grade.sectionName}</span>}
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold"><BookOpen size={14} />{grade.subjectName}</span>
            {grade.teacherName && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold"><GraduationCap size={14} />{grade.teacherName}</span>}
          </div>

          <div className="mt-3 grid gap-2 text-sm leading-6 text-[var(--app-text-muted)] md:grid-cols-4">
            <p>الدرجة: <span className="font-bold text-[var(--app-text)]">{grade.score} / {grade.maxScore}</span></p>
            <p>النسبة: <span className="font-bold text-[var(--app-text)]">{percentage}%</span></p>
            <p>التقويم: <span className="font-bold text-[var(--app-text)]">{getGradeLevelLabel(percentage)}</span></p>
            <p>التاريخ: <span className="font-bold text-[var(--app-text)]">{formatGradeShortDate(grade.date)}</span></p>
          </div>

          {warningMessage && percentage < 60 && <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" /><span className="text-amber-800">{warningMessage}</span></div>}
          {grade.notes && <p className="mt-2 text-sm leading-6 text-[var(--app-text-soft)]">{grade.notes}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
        {grade.examId && <a href={`/exams/${grade.examId}/grades`} className="btn btn-secondary">تعديل الامتحان</a>}
        <DeleteConfirmButton action={deleteGradeAction} itemId={grade.id} entityName="الدرجة" associations={[]} />
      </div>
    </article>
  );
}
