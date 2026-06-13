import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth";
import { safeQuery } from "@/lib/db";
import { getStudents } from "@/services/student-service";
import { searchTeachers } from "@/services/teacher-service";
import { searchClasses } from "@/services/class-service";

export const dynamic = "force-dynamic";

export const GET = withApiAuth(async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ ok: true, data: [] });
  }

  const [students, teachers, classes] = await Promise.all([
    safeQuery(() => getStudents({ query: q, status: "active" }), []),
    safeQuery(() => searchTeachers(q), []),
    safeQuery(() => searchClasses(q), []),
  ]);

  const data = [
    ...students.slice(0, 5).map((student) => ({
      type: "طالب",
      title: student.fullName,
      subtitle: student.className ? `${student.className}${student.sectionName ? ` / ${student.sectionName}` : ""}` : "بدون صف",
      href: `/students/${student.id}`,
    })),
    ...teachers
      .slice(0, 4)
      .map((teacher) => ({ type: "مدرس", title: teacher.fullName, subtitle: teacher.specialty ?? "", href: "/teachers" })),
    ...classes
      .slice(0, 4)
      .map((schoolClass) => ({ type: "صف", title: schoolClass.name, subtitle: schoolClass.level ?? "", href: "/classes" })),
  ].slice(0, 10);

  return NextResponse.json({ ok: true, data });
});
