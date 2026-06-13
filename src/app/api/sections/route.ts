import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth";
import { ensureDatabase } from "@/lib/db";
import {
  createSection,
  deleteSection,
  getSections,
  getSectionsByClassId,
  updateSection,
} from "@/services/class-service";
import type { SectionFormInput } from "@/types/class";

export const GET = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get("classId");

    const sections = classId
      ? await getSectionsByClassId(classId)
      : await getSections();

    return NextResponse.json({
      ok: true,
      message: "تم جلب الشُعب بنجاح.",
      data: sections,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء جلب الشُعب.",
      },
      { status: 500 },
    );
  }
});

export const POST = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const body = (await request.json()) as Partial<SectionFormInput>;

    const result = await createSection({
      name: body.name ?? "",
      capacity: body.capacity ?? "",
      description: body.description ?? "",
      classId: body.classId ?? "",
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء إضافة الشعبة.",
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
          message: "معرّف الشعبة مطلوب.",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Partial<SectionFormInput>;

    const result = await updateSection(id, {
      name: body.name ?? "",
      capacity: body.capacity ?? "",
      description: body.description ?? "",
      classId: body.classId ?? "",
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء تحديث الشعبة.",
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
          message: "معرّف الشعبة مطلوب.",
        },
        { status: 400 },
      );
    }

    const result = await deleteSection(id);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء حذف الشعبة.",
      },
      { status: 500 },
    );
  }
});
