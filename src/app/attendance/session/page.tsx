import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, GraduationCap, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { markAttendanceBatch } from "@/services/attendance-service";
import { ATTENDANCE_STATUSES } from "@/types/attendance";
import { formatScheduleTime, getDayLabel } from "@/types/schedule";

export const dynamic = "force-dynamic";

type AttendanceSessionPageProps = {
  searchParams?: Promise<{
    scheduleId?: string;
    date?: string;
    saved?: string;
    error?: string;
  }>;
};

export default async function AttendanceSessionPage({ searchParams }: AttendanceSessionPageProps) {
  const resolvedSearchParams = await searchParams;
  const scheduleId = resolvedSearchParams?.scheduleId?.trim() ?? "";
  const date = resolvedSearchParams?.date?.trim() || getTodayInputValue();

  if (!scheduleId) {
    return <PublicShell><EmptyPublicMessage title="رابط الحضور غير مكتمل" description="افتح الرابط من الجدول الدراسي حتى يصل معرّف الدرس تلقائيًا." /></PublicShell>;
  }

  const schedule = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      subject: true,
      teacher: true,
      section: {
        include: {
          class: true,
          students: {
            where: { status: "active" },
            orderBy: { fullName: "asc" },
          },
        },
      },
    },
  });

  if (!schedule) {
    return <PublicShell><EmptyPublicMessage title="الدرس غير موجود" description="تأكد من الرابط أو اطلب رابط جديد من الإدارة." /></PublicShell>;
  }

  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const existingRecords = await db.attendanceRecord.findMany({
    where: {
      scheduleId,
      date: { gte: start, lt: end },
    },
  });
  const recordByStudentId = new Map(existingRecords.map((record: any) => [record.studentId, record]));

  return (
    <PublicShell>
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
        {resolvedSearchParams?.saved === "1" ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-extrabold text-emerald-800">
            تم حفظ حضور الدرس بنجاح.
          </div>
        ) : null}

        {resolvedSearchParams?.error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-extrabold text-red-800">
            لم يتم حفظ الحضور، تأكد من اختيار حالة لكل طالب.
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[2rem] border border-[var(--app-border-soft)] bg-white shadow-xl">
          <div className="bg-gradient-to-l from-teal-600 to-sky-600 p-6 text-white">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-extrabold text-teal-100">رابط حضور خاص بالدرس</p>
                <h1 className="mt-2 text-2xl font-extrabold">{schedule.subject.name}</h1>
                <p className="mt-2 text-sm font-bold text-teal-50">
                  {schedule.section.class.name} / شعبة {schedule.section.name} — {schedule.teacher.fullName}
                </p>
              </div>
              <div className="rounded-3xl bg-white/15 p-4 text-sm font-extrabold leading-7">
                <p>{getDayLabel(schedule.dayOfWeek)}</p>
                <p>{formatScheduleTime(schedule.startTime, schedule.endTime)}</p>
                <p>{date}</p>
              </div>
            </div>
          </div>

          <form action={saveTeacherAttendanceAction}>
            <input type="hidden" name="scheduleId" value={schedule.id} />
            <input type="hidden" name="date" value={date} />

            <div className="grid gap-3 p-6 md:grid-cols-3">
              <InfoChip icon={CalendarClock} label="المادة" value={schedule.subject.name} />
              <InfoChip icon={GraduationCap} label="الصف والشعبة" value={`${schedule.section.class.name} / ${schedule.section.name}`} />
              <InfoChip icon={UserRound} label="المدرس" value={schedule.teacher.fullName} />
            </div>

            <div className="overflow-x-auto border-t border-[var(--app-border-soft)]">
              <table className="w-full min-w-[780px] text-sm">
                <thead className="bg-slate-50 text-[var(--app-text-muted)]">
                  <tr>
                    <th className="p-4 text-right font-extrabold">الطالب</th>
                    <th className="p-4 text-center font-extrabold">الحالة</th>
                    <th className="p-4 text-right font-extrabold">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--app-border-soft)]">
                  {schedule.section.students.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center font-bold text-[var(--app-text-muted)]">
                        لا يوجد طلاب مستمرون داخل هذه الشعبة.
                      </td>
                    </tr>
                  ) : schedule.section.students.map((student: any) => {
                    const existing = recordByStudentId.get(student.id) as any;
                    return (
                      <tr key={student.id} className="transition hover:bg-teal-50/40">
                        <td className="p-4">
                          <input type="hidden" name="studentIds" value={student.id} />
                          <p className="font-extrabold text-[var(--app-text)]">{student.fullName}</p>
                          <p className="text-xs font-bold text-[var(--app-text-muted)]">{student.studentCode ?? "بدون رمز"}</p>
                        </td>
                        <td className="p-4">
                          <select name={`status_${student.id}`} defaultValue={existing?.status ?? "present"} className="input mx-auto max-w-[180px]">
                            {ATTENDANCE_STATUSES.map((status) => (
                              <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4">
                          <input name={`notes_${student.id}`} defaultValue={existing?.notes ?? ""} className="input" placeholder="اختياري" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--app-border-soft)] bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-bold text-[var(--app-text-muted)]">
                يقدر المدرس أو المراقب يفتح هذا الرابط ويسجل حضور الدرس بدون الدخول لتعقيدات لوحة الإدارة.
              </p>
              <button type="submit" className="btn btn-primary" disabled={schedule.section.students.length === 0}>
                <CheckCircle2 size={18} />
                حفظ حضور الدرس
              </button>
            </div>
          </form>
        </section>
      </div>
    </PublicShell>
  );
}

async function saveTeacherAttendanceAction(formData: FormData) {
  "use server";

  const scheduleId = String(formData.get("scheduleId") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const studentIds = formData.getAll("studentIds").map(String).filter(Boolean);

  if (!scheduleId || !date || studentIds.length === 0) {
    redirect(`/attendance/session?scheduleId=${encodeURIComponent(scheduleId)}&date=${encodeURIComponent(date)}&error=1`);
  }

  const records = studentIds.map((studentId) => ({
    studentId,
    status: String(formData.get(`status_${studentId}`) ?? "present"),
    notes: String(formData.get(`notes_${studentId}`) ?? ""),
  }));

  const result = await markAttendanceBatch({ date, scheduleId, records });

  if (!result.ok) {
    redirect(`/attendance/session?scheduleId=${encodeURIComponent(scheduleId)}&date=${encodeURIComponent(date)}&error=1`);
  }

  revalidatePath("/attendance");
  revalidatePath("/reports");
  redirect(`/attendance/session?scheduleId=${encodeURIComponent(scheduleId)}&date=${encodeURIComponent(date)}&saved=1`);
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return <main dir="rtl" className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">{children}</main>;
}

function EmptyPublicMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto mt-16 max-w-xl rounded-[2rem] border border-[var(--app-border-soft)] bg-white p-8 text-center shadow-xl">
      <h1 className="text-2xl font-extrabold text-[var(--app-text)]">{title}</h1>
      <p className="mt-3 text-sm font-bold leading-7 text-[var(--app-text-muted)]">{description}</p>
    </div>
  );
}

function InfoChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[var(--app-border-soft)] bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
          <Icon size={18} />
        </div>
        <div>
          <p className="text-xs font-bold text-[var(--app-text-muted)]">{label}</p>
          <p className="mt-1 font-extrabold text-[var(--app-text)]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function getTodayInputValue(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
