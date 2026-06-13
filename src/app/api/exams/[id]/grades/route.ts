import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth";
import { ensureDatabase } from "@/lib/db";
import { getExamById, saveExamGrades } from "@/services/exam-service";

export const POST = withApiAuth(async (
  request: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => {
  await ensureDatabase();

  try {
    const { id } = await ctx.params;
    const body = await request.json();

    const grades = Array.isArray(body.grades)
      ? body.grades
      : [{ studentId: String(body.studentId ?? ""), score: Number(body.score), notes: String(body.notes ?? "") }];

    if (!grades.length || grades.some((grade) => !grade.studentId || !Number.isFinite(Number(grade.score)))) {
      return NextResponse.json(
        { ok: false, message: "بيانات الدرجة غير مكتملة." },
        { status: 400 },
      );
    }

    const result = await saveExamGrades(
      id,
      grades.map((grade) => ({
        studentId: String(grade.studentId),
        score: Number(grade.score),
        notes: String(grade.notes ?? ""),
      })),
    );

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, message: "حدث خطأ أثناء حفظ الدرجات." },
      { status: 500 },
    );
  }
});

export const GET = withApiAuth(async (
  _request: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => {
  await ensureDatabase();

  try {
    const { id } = await ctx.params;
    const exam = await getExamById(id);

    if (!exam) {
      return NextResponse.json(
        { ok: false, message: "الامتحان غير موجود." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: exam });
  } catch {
    return NextResponse.json(
      { ok: false, message: "حدث خطأ أثناء جلب بيانات الامتحان." },
      { status: 500 },
    );
  }
});
