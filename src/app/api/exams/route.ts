import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth";
import { ensureDatabase } from "@/lib/db";
import { createExam, getExams } from "@/services/exam-service";

export const GET = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();

  try {
    const subjectId =
      request.nextUrl.searchParams.get("subjectId") || undefined;
    const sectionId =
      request.nextUrl.searchParams.get("sectionId") || undefined;
    const exams = await getExams({ subjectId, sectionId });
    return NextResponse.json({ ok: true, data: exams });
  } catch {
    return NextResponse.json(
      { ok: false, message: "حدث خطأ أثناء جلب الامتحانات." },
      { status: 500 },
    );
  }
});

export const POST = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();

  try {
    const body = await request.json();
    const result = await createExam(body);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, message: "حدث خطأ أثناء إنشاء الامتحان." },
      { status: 500 },
    );
  }
});
