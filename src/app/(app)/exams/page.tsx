import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";
import { buildErrorRedirect } from "@/lib/redirect-message";
import { ClipboardList, GraduationCap, Layers, PlusCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { safeQuery } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { SmartAlert } from "@/components/shared/smart-alert";
import { EmptyState } from "@/components/shared/empty-state";
import { createExam, getExams } from "@/services/exam-service";
import { getSections } from "@/services/class-service";
import { getActiveSubjects } from "@/services/subject-service";
import { getActiveTeachers } from "@/services/teacher-service";
import { EXAM_TYPES } from "@/types/grade";
import { getSectionDisplayName } from "@/types/class";

export const dynamic = "force-dynamic";


type ExamsPageProps = {
  searchParams?: Promise<{ saved?: string; error?: string; reason?: string; sectionId?: string; subjectId?: string }>;
};

export default async function ExamsPage({ searchParams }: ExamsPageProps) {
  await requireAdmin();
  const resolvedSearchParams = await searchParams;
  const sectionId = resolvedSearchParams?.sectionId?.trim() || "";
  const subjectId = resolvedSearchParams?.subjectId?.trim() || "";

  const [exams, sections, subjects, teachers] = await Promise.all([
    safeQuery(() => getExams({ sectionId: sectionId || undefined, subjectId: subjectId || undefined }), []),
    safeQuery(() => getSections(), []),
    safeQuery(() => getActiveSubjects(), []),
    safeQuery(() => getActiveTeachers(), []),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-6">
        <PageHeader
          title="الامتحانات"
          description="أنشئ امتحانًا مربوطًا بمادة ومدرس وصف، ثم أدخل درجات جميع طلاب الصف من شاشة واحدة."
          icon="grades"
          badge="تعريف الامتحانات"
        />

        {resolvedSearchParams?.saved === "1" && <SmartAlert tone="success" title="تم حفظ الامتحان" description="يمكنك الآن إدخال درجات الطلاب لهذا الامتحان." />}
        {resolvedSearchParams?.error && (
          <SmartAlert
            tone="warning"
            title="لم يتم الحفظ"
            description={resolvedSearchParams?.reason ?? "تأكد من اختيار الصف والمادة وإدخال الدرجة الكلية ودرجة النجاح."}
          />
        )}

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form action={createExamAction} className="app-card overflow-hidden">
            <div className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/40 to-sky-50/20 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700"><ClipboardList size={24} /></div>
                <div>
                  <h3 className="text-xl font-extrabold text-[var(--app-text)]">إضافة امتحان</h3>
                  <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">حدد الصف والمادة والمدرس ونوع الامتحان ودرجاته.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-extrabold text-[var(--app-text)]" htmlFor="name">اسم الامتحان</label>
                <input id="name" name="name" className="input" minLength={2} maxLength={120} required placeholder="مثال: امتحان الرياضيات الشهري" />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-extrabold text-[var(--app-text)]" htmlFor="sectionId"><Layers size={14} className="ml-1 inline" /> الصف / الشعبة</label>
                  <select id="sectionId" name="sectionId" className="input" required defaultValue="">
                    <option value="" disabled>اختر الصف</option>
                    {sections.map((section) => <option key={section.id} value={section.id}>{getSectionDisplayName(section)}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-extrabold text-[var(--app-text)]" htmlFor="subjectId">المادة</label>
                  <select id="subjectId" name="subjectId" className="input" required defaultValue="">
                    <option value="" disabled>اختر المادة</option>
                    {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-extrabold text-[var(--app-text)]" htmlFor="teacherId"><GraduationCap size={14} className="ml-1 inline" /> المدرس</label>
                  <select id="teacherId" name="teacherId" className="input" required defaultValue="">
                    <option value="" disabled>اختر المدرس</option>
                    {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-extrabold text-[var(--app-text)]" htmlFor="type">نوع الامتحان</label>
                  <select id="type" name="type" className="input" defaultValue="daily">
                    {EXAM_TYPES.slice(0, 5).map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-extrabold text-[var(--app-text)]" htmlFor="maxScore">الدرجة الكلية</label>
                  <input id="maxScore" name="maxScore" type="number" min={1} className="input" defaultValue={100} required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-extrabold text-[var(--app-text)]" htmlFor="passScore">درجة النجاح</label>
                  <input id="passScore" name="passScore" type="number" min={0} className="input" defaultValue={50} required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-extrabold text-[var(--app-text)]" htmlFor="date">تاريخ الامتحان</label>
                  <input id="date" name="date" type="date" className="input" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-extrabold text-[var(--app-text)]" htmlFor="notes">ملاحظات</label>
                <textarea id="notes" name="notes" rows={3} className="input min-h-[90px]" />
              </div>
            </div>

            <div className="border-t border-[var(--app-border-soft)] p-6">
              <button type="submit" className="btn btn-primary"><PlusCircle size={18} /> حفظ الامتحان</button>
            </div>
          </form>

          {exams.length === 0 ? (
            <EmptyState icon="grades" title="لا توجد امتحانات" description="أضف امتحانًا أولًا، ثم أدخل درجات الطلاب المرتبطين به." actionLabel="إضافة امتحان" actionHref="#" />
          ) : (
            <section className="app-card overflow-hidden">
              <div className="border-b border-[var(--app-border-soft)] p-6">
                <h3 className="text-xl font-extrabold text-[var(--app-text)]">قائمة الامتحانات</h3>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">اختر إدخال الدرجات لعرض كل طلاب الصف.</p>
              </div>
              <div className="divide-y divide-[var(--app-border-soft)]">
                {exams.map((exam: any) => (
                  <article key={exam.id} className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <h4 className="text-lg font-extrabold text-[var(--app-text)]">{exam.name}</h4>
                      <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
                        {exam.subject?.name ?? "مادة غير محددة"} — {exam.teacher?.fullName ?? "مدرس غير محدد"} — {exam.section?.class?.name ?? "صف غير محدد"} / {exam.section?.name ?? "شعبة غير محددة"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[var(--app-text-muted)]">
                        <span className="rounded-full bg-slate-100 px-3 py-1">الدرجة: {exam.maxScore}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">النجاح: {exam.passScore}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">النوع: {EXAM_TYPES.find((type) => type.value === exam.type)?.label ?? exam.type}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a href={`/exams/${exam.id}/grades`} className="btn btn-primary justify-center">إدخال الدرجات</a>
                      <a href={`/exams/teacher-grades?examId=${exam.id}`} target="_blank" rel="noreferrer" className="btn btn-secondary justify-center">رابط المدرس</a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
  );
}

async function createExamAction(formData: FormData) {
  "use server";
  const result = await createExam({
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? "daily"),
    date: String(formData.get("date") ?? "") || undefined,
    maxScore: Number(formData.get("maxScore") ?? 100),
    passScore: Number(formData.get("passScore") ?? 50),
    notes: String(formData.get("notes") ?? ""),
    subjectId: String(formData.get("subjectId") ?? ""),
    sectionId: String(formData.get("sectionId") ?? ""),
    teacherId: String(formData.get("teacherId") ?? ""),
  });

  if (!result.ok) redirect(buildErrorRedirect("/exams", "1", result.message));
  revalidatePath("/exams");
  revalidatePath("/grades");
  redirect("/exams?saved=1");
}
