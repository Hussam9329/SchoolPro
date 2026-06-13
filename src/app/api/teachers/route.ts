import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth";
import { ensureDatabase } from "@/lib/db";
import {
  createTeacher,
  deleteTeacher,
  getActiveTeachers,
  getTeacherDetails,
  getTeachers,
  getTeachersBySubjectId,
  getTeachersCount,
  searchTeachers,
  toggleTeacherStatus,
  updateTeacher,
} from "@/services/teacher-service";
import type { TeacherFormInput } from "@/types/teacher";

export const GET = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (id) {
      const details = await getTeacherDetails(id);

      if (!details) {
        return NextResponse.json(
          { ok: false, message: "لم يتم العثور على المدرس." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        message: "تم جلب تفاصيل المدرس بنجاح.",
        data: details,
      });
    }

    const action = searchParams.get("action");

    if (action === "counts") {
      const counts = await getTeachersCount();

      return NextResponse.json({
        ok: true,
        message: "تم جلب إحصائيات المدرسين بنجاح.",
        data: counts,
      });
    }

    if (action === "active") {
      const teachers = await getActiveTeachers();

      return NextResponse.json({
        ok: true,
        message: "تم جلب المدرسين الفعّالين بنجاح.",
        data: teachers,
      });
    }

    const subjectId = searchParams.get("subjectId");

    if (subjectId) {
      const teachers = await getTeachersBySubjectId(subjectId);

      return NextResponse.json({
        ok: true,
        message: "تم جلب مدرسي المادة بنجاح.",
        data: teachers,
      });
    }

    const query = searchParams.get("q") ?? "";

    if (query.trim()) {
      const teachers = await searchTeachers(query);

      return NextResponse.json({
        ok: true,
        message: "تم البحث بنجاح.",
        data: teachers,
      });
    }

    const teachers = await getTeachers();

    return NextResponse.json({
      ok: true,
      message: "تم جلب المدرسين بنجاح.",
      data: teachers,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "حدث خطأ أثناء جلب المدرسين." },
      { status: 500 },
    );
  }
});

export const POST = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const body = await request.json();

    const input: TeacherFormInput = {
      fullName: String(body.fullName ?? ""),
      phone: body.phone ?? "",
      subjectIds: Array.isArray(body.subjectIds) ? body.subjectIds : [],
      sectionIds: Array.isArray(body.sectionIds) ? body.sectionIds : [],
    };

    const result = await createTeacher(input);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, message: "حدث خطأ أثناء إضافة المدرس." },
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
        { ok: false, message: "معرّف المدرس مطلوب." },
        { status: 400 },
      );
    }

    const body = await request.json();

    const input: TeacherFormInput = {
      fullName: String(body.fullName ?? ""),
      phone: body.phone ?? "",
      subjectIds: Array.isArray(body.subjectIds) ? body.subjectIds : [],
      sectionIds: Array.isArray(body.sectionIds) ? body.sectionIds : [],
    };

    const result = await updateTeacher(id, input);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { ok: false, message: "حدث خطأ أثناء تحديث بيانات المدرس." },
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
        { ok: false, message: "معرّف المدرس مطلوب." },
        { status: 400 },
      );
    }

    if (action === "toggle-status") {
      const result = await toggleTeacherStatus(id);

      if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { ok: false, message: "إجراء غير معروف." },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "حدث خطأ أثناء تنفيذ الإجراء." },
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
        { ok: false, message: "معرّف المدرس مطلوب." },
        { status: 400 },
      );
    }

    const result = await deleteTeacher(id);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { ok: false, message: "حدث خطأ أثناء حذف المدرس." },
      { status: 500 },
    );
  }
});
