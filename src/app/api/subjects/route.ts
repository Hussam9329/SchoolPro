import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/lib/db";
import { withApiAuth } from "@/lib/api-auth";
import {
  createSubject,
  deleteSubject,
  getSubjects,
  searchSubjects,
  updateSubject,
} from "@/services/subject-service";
import type { SubjectFormInput } from "@/types/subject";

export const GET = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") ?? "";

    const subjects = query.trim()
      ? await searchSubjects(query)
      : await getSubjects();

    return NextResponse.json({
      ok: true,
      message: "تم جلب المواد الدراسية بنجاح.",
      data: subjects,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء جلب المواد الدراسية.",
      },
      { status: 500 },
    );
  }
});

export const POST = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const body = (await request.json()) as Partial<SubjectFormInput>;

    const result = await createSubject({
      name: body.name ?? "",
      description: body.description ?? "",
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء إضافة المادة الدراسية.",
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
          message: "معرّف المادة الدراسية مطلوب.",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Partial<SubjectFormInput>;

    const result = await updateSubject(id, {
      name: body.name ?? "",
      description: body.description ?? "",
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء تحديث المادة الدراسية.",
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
          message: "معرّف المادة الدراسية مطلوب.",
        },
        { status: 400 },
      );
    }

    const result = await deleteSubject(id);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء حذف المادة الدراسية.",
      },
      { status: 500 },
    );
  }
});
