import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/lib/db";
import { withApiAuth } from "@/lib/api-auth";
import {
  createGrade,
  deleteGrade,
  getGrades,
  getGradesCount,
  searchGrades,
  updateGrade,
} from "@/services/grade-service";
import type { GradeFormInput } from "@/types/grade";

export const GET = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") ?? "";
    const action = searchParams.get("action");

    if (action === "count") {
      const counts = await getGradesCount();

      return NextResponse.json({
        ok: true,
        message: "تم جلب إحصائيات الدرجات بنجاح.",
        data: counts,
      });
    }

    const filter = {
      query,
      studentId: searchParams.get("studentId") ?? undefined,
      subjectId: searchParams.get("subjectId") ?? undefined,
      teacherId: searchParams.get("teacherId") ?? undefined,
      sectionId: searchParams.get("sectionId") ?? undefined,
      classId: searchParams.get("classId") ?? undefined,
      examType: searchParams.get("examType") ?? undefined,
      term: searchParams.get("term") ?? undefined,
      fromDate: searchParams.get("fromDate") ?? undefined,
      toDate: searchParams.get("toDate") ?? undefined,
    };

    const grades = query.trim()
      ? await searchGrades(query)
      : await getGrades(filter);

    return NextResponse.json({
      ok: true,
      message: "تم جلب الدرجات بنجاح.",
      data: grades,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء جلب الدرجات.",
      },
      { status: 500 },
    );
  }
});

export const POST = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const body = (await request.json()) as Partial<GradeFormInput>;

    const result = await createGrade({
      title: body.title ?? "",
      score: body.score ?? 0,
      maxScore: body.maxScore ?? 100,
      examType: body.examType ?? "monthly",
      term: body.term ?? "first",
      date: body.date ?? "",
      notes: body.notes ?? "",
      studentId: body.studentId ?? "",
      subjectId: body.subjectId ?? "",
      teacherId: body.teacherId ?? "",
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء إضافة الدرجة.",
      },
      { status: 500 },
    );
  }
});

export const PUT = withApiAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          message: "معرّف الدرجة مطلوب.",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Partial<GradeFormInput>;

    const result = await updateGrade(id, {
      title: body.title ?? "",
      score: body.score ?? 0,
      maxScore: body.maxScore ?? 100,
      examType: body.examType ?? "monthly",
      term: body.term ?? "first",
      date: body.date ?? "",
      notes: body.notes ?? "",
      studentId: body.studentId ?? "",
      subjectId: body.subjectId ?? "",
      teacherId: body.teacherId ?? "",
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء تحديث الدرجة.",
      },
      { status: 500 },
    );
  }
});

export const DELETE = withApiAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          message: "معرّف الدرجة مطلوب.",
        },
        { status: 400 },
      );
    }

    const result = await deleteGrade(id);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء حذف الدرجة.",
      },
      { status: 500 },
    );
  }
});
