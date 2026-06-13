import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/lib/db";
import { withApiAuth } from "@/lib/api-auth";
import {
  createStudent,
  deleteStudent,
  getStudents,
  moveStudentToSection,
  updateStudent,
  updateStudentStatus,
} from "@/services/student-service";
import type { StudentFormInput } from "@/types/student";

export const GET = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const searchParams = request.nextUrl.searchParams;

    const students = await getStudents({
      query: searchParams.get("q") ?? "",
      classId: searchParams.get("classId") ?? "",
      sectionId: searchParams.get("sectionId") ?? "",
      status: searchParams.get("status") ?? "",
    });

    return NextResponse.json({
      ok: true,
      message: "تم جلب الطلاب بنجاح.",
      data: students,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء جلب الطلاب.",
      },
      { status: 500 },
    );
  }
});

export const POST = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const body = (await request.json()) as Partial<StudentFormInput>;

    const result = await createStudent({
      fullName: body.fullName ?? "",
      phone: body.phone ?? "",
      guardianPhone: body.guardianPhone ?? "",
      birthDate: body.birthDate ?? "",
      sectionId: body.sectionId ?? "",
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء إضافة الطالب.",
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
          message: "معرّف الطالب مطلوب.",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Partial<StudentFormInput>;

    const result = await updateStudent(id, {
      fullName: body.fullName ?? "",
      phone: body.phone ?? "",
      guardianPhone: body.guardianPhone ?? "",
      birthDate: body.birthDate ?? "",
      sectionId: body.sectionId ?? "",
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء تحديث بيانات الطالب.",
      },
      { status: 500 },
    );
  }
});

export const PATCH = withApiAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const action = searchParams.get("action");

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          message: "معرّف الطالب مطلوب.",
        },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));

    if (action === "status") {
      const result = await updateStudentStatus(id, String(body.status ?? ""));

      if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result);
    }

    if (action === "move") {
      const sectionId =
        body.sectionId === null || body.sectionId === ""
          ? null
          : String(body.sectionId);

      const result = await moveStudentToSection(id, sectionId);

      if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result);
    }

    return NextResponse.json(
      {
        ok: false,
        message: "نوع العملية غير معروف.",
      },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء تنفيذ العملية على الطالب.",
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
          message: "معرّف الطالب مطلوب.",
        },
        { status: 400 },
      );
    }

    const result = await deleteStudent(id);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء حذف الطالب.",
      },
      { status: 500 },
    );
  }
});
