import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookOpen, CheckCircle2, GraduationCap, Layers } from "lucide-react";
import { ExamGradeEntryTable } from "@/components/grades/exam-grade-entry-table";
import { getExamById, saveExamGrades } from "@/services/exam-service";
import { EXAM_TYPES } from "@/types/grade";

export const dynamic = "force-dynamic";

type TeacherGradesPageProps = {
  searchParams?: Promise<{
    examId?: string;
    saved?: string;
    error?: string;
  }>;
};

export default async function TeacherGradesPage({ searchParams }: TeacherGradesPageProps) {
  const resolvedSearchParams = await searchParams;
  const examId = resolvedSearchParams?.examId?.trim() ?? "";

  if (!examId) {
    return <PublicShell><EmptyMessage title="رابط الدرجات غير مكتمل" description="افتح الرابط من تبويبة الامتحانات حتى يصل رقم الامتحان تلقائيًا." /></PublicShell>;
  }

  const exam = await getExamById(examId);

  if (!exam) {
    return <PublicShell><EmptyMessage title="الامتحان غير موجود" description="تأكد من الرابط أو اطلب رابط جديد من الإدارة." /></PublicShell>;
  }

  const gradeByStudentId = new Map((exam.grades ?? []).map((grade: any) => [grade.studentId, grade]));
  const students = ((exam.section?.students ?? []) as any[])
    .filter((student) => student.status !== "inactive")
    .sort((a, b) => String(a.fullName).localeCompare(String(b.fullName), "ar"))
    .map((student) => {
      const existing = gradeByStudentId.get(student.id) as any;
      return {
        id: student.id,
        fullName: student.fullName,
        studentCode: student.studentCode ?? null,
        existingScore: existing?.score ?? null,
        existingNotes: existing?.notes ?? null,
      };
    });

  const savedGradesCount = students.filter((student) => student.existingScore !== null && student.existingScore !== "").length;
  const sectionName = exam.section
    ? `${exam.section.class?.name ?? "صف غير محدد"} / شعبة ${exam.section.name}`
    : "صف غير محدد";
  const examTypeLabel = EXAM_TYPES.find((type) => type.value === exam.type)?.label ?? exam.type;

  return (
    <PublicShell>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--app-border-soft)] bg-white shadow-xl">
          <div className="bg-gradient-to-l from-teal-600 to-sky-600 p-6 text-white">
            <p className="text-sm font-extrabold text-teal-100">رابط خاص لإدخال درجات المدرس</p>
            <h1 className="mt-2 text-2xl font-extrabold">{exam.name}</h1>
            <p className="mt-2 text-sm font-bold text-teal-50">
              {exam.subject?.name ?? "مادة غير محددة"} — {sectionName} — {exam.teacher?.fullName ?? "مدرس غير محدد"}
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-4">
            <InfoCard icon={<Layers size={20} />} label="الصف / الشعبة" value={sectionName} />
            <InfoCard icon={<BookOpen size={20} />} label="المادة" value={exam.subject?.name ?? "مادة غير محددة"} />
            <InfoCard icon={<GraduationCap size={20} />} label="المدرس" value={exam.teacher?.fullName ?? "غير محدد"} />
            <InfoCard icon={<CheckCircle2 size={20} />} label="التقدم" value={`${savedGradesCount} / ${students.length}`} hint={`${examTypeLabel} — الكلية ${exam.maxScore}`} />
          </div>
        </section>

        {resolvedSearchParams?.saved === "1" ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-extrabold text-emerald-800">
            تم حفظ الدرجات بنجاح.
          </div>
        ) : null}

        {resolvedSearchParams?.error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-extrabold text-red-800">
            لم يتم حفظ الدرجات، تأكد من أن الدرجات لا تتجاوز الدرجة الكلية.
          </div>
        ) : null}

        <ExamGradeEntryTable
          examId={exam.id}
          maxScore={Number(exam.maxScore) || 100}
          passScore={Number(exam.passScore) || 50}
          students={students}
          action={saveTeacherExamGradesAction}
          enableAutoSave={false}
          submitLabel="حفظ درجات الطلاب"
        />
      </div>
    </PublicShell>
  );
}

async function saveTeacherExamGradesAction(formData: FormData) {
  "use server";
  const examId = String(formData.get("examId") ?? "").trim();
  const studentIds = formData.getAll("studentIds").map((value) => String(value));
  const grades = studentIds
    .map((studentId) => ({
      studentId,
      score: Number(formData.get(`score_${studentId}`) ?? NaN),
      notes: String(formData.get(`notes_${studentId}`) ?? ""),
    }))
    .filter((grade) => Number.isFinite(grade.score));

  const result = await saveExamGrades(examId, grades);
  if (!result.ok) redirect(`/exams/teacher-grades?examId=${encodeURIComponent(examId)}&error=1`);

  revalidatePath("/grades");
  revalidatePath("/reports");
  redirect(`/exams/teacher-grades?examId=${encodeURIComponent(examId)}&saved=1`);
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return <main dir="rtl" className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">{children}</main>;
}

function EmptyMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto mt-16 max-w-xl rounded-[2rem] border border-[var(--app-border-soft)] bg-white p-8 text-center shadow-xl">
      <h1 className="text-2xl font-extrabold text-[var(--app-text)]">{title}</h1>
      <p className="mt-3 text-sm font-bold leading-7 text-[var(--app-text-muted)]">{description}</p>
    </div>
  );
}

function InfoCard({ icon, label, value, hint }: { icon?: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-[var(--app-border-soft)] bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        {icon ? <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">{icon}</div> : null}
        <div>
          <p className="text-xs font-bold text-[var(--app-text-soft)]">{label}</p>
          <p className="mt-1 text-base font-extrabold text-[var(--app-text)]">{value}</p>
          {hint ? <p className="mt-1 text-xs font-bold text-[var(--app-text-muted)]">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}
