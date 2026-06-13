import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/lib/db";
import { withApiAuth } from "@/lib/api-auth";
import {
  createSchedule,
  deleteSchedule,
  findScheduleConflicts,
  getSchedules,
  toggleScheduleStatus,
  updateSchedule,
} from "@/services/schedule-service";
import type { ScheduleFormInput } from "@/types/schedule";

export const GET = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const searchParams = request.nextUrl.searchParams;

    const schedules = await getSchedules({
      query: searchParams.get("q") ?? "",
      dayOfWeek: searchParams.get("dayOfWeek") ?? "",
      classId: searchParams.get("classId") ?? "",
      sectionId: searchParams.get("sectionId") ?? "",
      subjectId: searchParams.get("subjectId") ?? "",
      teacherId: searchParams.get("teacherId") ?? "",
    });

    return NextResponse.json({
      ok: true,
      message: "تم جلب الجدول الدراسي بنجاح.",
      data: schedules,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء جلب الجدول الدراسي.",
      },
      { status: 500 },
    );
  }
});

export const POST = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const body = (await request.json()) as Partial<ScheduleFormInput>;

    const result = await createSchedule({
      dayOfWeek: body.dayOfWeek ?? "",
      startTime: body.startTime ?? "",
      endTime: body.endTime ?? "",
      room: body.room ?? "",
      notes: body.notes ?? "",
      isActive: body.isActive ?? true,
      sectionId: body.sectionId ?? "",
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
        message: "حدث خطأ أثناء إضافة المحاضرة.",
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
          message: "معرّف المحاضرة مطلوب.",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Partial<ScheduleFormInput>;

    const result = await updateSchedule(id, {
      dayOfWeek: body.dayOfWeek ?? "",
      startTime: body.startTime ?? "",
      endTime: body.endTime ?? "",
      room: body.room ?? "",
      notes: body.notes ?? "",
      isActive: body.isActive ?? true,
      sectionId: body.sectionId ?? "",
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
        message: "حدث خطأ أثناء تحديث المحاضرة.",
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

    if (action === "check-conflicts") {
      const body = (await request.json()) as Partial<ScheduleFormInput>;

      const conflicts = await findScheduleConflicts({
        dayOfWeek: body.dayOfWeek ?? "",
        startTime: body.startTime ?? "",
        endTime: body.endTime ?? "",
        room: body.room ?? "",
        notes: body.notes ?? "",
        isActive: body.isActive ?? true,
        sectionId: body.sectionId ?? "",
        subjectId: body.subjectId ?? "",
        teacherId: body.teacherId ?? "",
      });

      return NextResponse.json({
        ok: true,
        message:
          conflicts.length > 0
            ? "توجد تعارضات في الجدول."
            : "لا توجد تعارضات.",
        data: conflicts,
      });
    }

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          message: "معرّف المحاضرة مطلوب.",
        },
        { status: 400 },
      );
    }

    if (action === "toggle-status") {
      const result = await toggleScheduleStatus(id);

      if (!result.ok) {
        return NextResponse.json(result, { status: 404 });
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
        message: "حدث خطأ أثناء تنفيذ العملية على الجدول.",
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
          message: "معرّف المحاضرة مطلوب.",
        },
        { status: 400 },
      );
    }

    const result = await deleteSchedule(id);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء حذف المحاضرة.",
      },
      { status: 500 },
    );
  }
});
