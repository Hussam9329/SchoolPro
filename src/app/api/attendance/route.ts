import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/lib/db";
import { withApiAuth } from "@/lib/api-auth";
import {
  createAttendanceRecord,
  deleteAttendanceRecord,
  getAttendanceCounts,
  getAttendanceDetails,
  getAttendanceRecords,
  markAttendanceBatch,
  updateAttendanceRecord,
} from "@/services/attendance-service";
import type {
  AttendanceBatchInput,
  AttendanceFormInput,
} from "@/types/attendance";

export const GET = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (id) {
      const details = await getAttendanceDetails(id);

      if (!details) {
        return NextResponse.json(
          {
            ok: false,
            message: "لم يتم العثور على سجل الحضور.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        message: "تم جلب تفاصيل الحضور بنجاح.",
        data: details,
      });
    }

    const action = searchParams.get("action");

    if (action === "counts") {
      const counts = await getAttendanceCounts();

      return NextResponse.json({
        ok: true,
        message: "تم جلب إحصائيات الحضور بنجاح.",
        data: counts,
      });
    }

    const records = await getAttendanceRecords({
      query: searchParams.get("q") ?? "",
      date: searchParams.get("date") ?? "",
      fromDate: searchParams.get("fromDate") ?? "",
      toDate: searchParams.get("toDate") ?? "",
      status: searchParams.get("status") ?? "",
      studentId: searchParams.get("studentId") ?? "",
      scheduleId: searchParams.get("scheduleId") ?? "",
      sectionId: searchParams.get("sectionId") ?? "",
      classId: searchParams.get("classId") ?? "",
      subjectId: searchParams.get("subjectId") ?? "",
      teacherId: searchParams.get("teacherId") ?? "",
    });

    return NextResponse.json({
      ok: true,
      message: "تم جلب سجلات الحضور بنجاح.",
      data: records,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء جلب سجلات الحضور.",
      },
      { status: 500 },
    );
  }
});

export const POST = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    const body = await request.json();

    if (action === "batch") {
      const batchInput: AttendanceBatchInput = {
        date: body.date ?? new Date(),
        scheduleId: body.scheduleId ?? undefined,
        records: (body.records ?? []).map(
          (record: {
            studentId?: string;
            status?: string;
            notes?: string;
          }) => ({
            studentId: String(record.studentId ?? ""),
            status: String(record.status ?? "present"),
            notes: record.notes?.trim() || undefined,
          }),
        ),
      };

      const result = await markAttendanceBatch(batchInput);

      if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result, { status: 201 });
    }

    const input: AttendanceFormInput = {
      date: body.date ?? new Date(),
      status: body.status ?? "present",
      notes: body.notes ?? "",
      studentId: String(body.studentId ?? ""),
      mode: body.mode ?? "check-in",
    };

    const result = await createAttendanceRecord(input);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء تسجيل الحضور.",
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
          message: "معرّف سجل الحضور مطلوب.",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Partial<AttendanceFormInput>;

    const result = await updateAttendanceRecord(id, {
      date: body.date ?? new Date(),
      status: body.status ?? "present",
      notes: body.notes ?? "",
      studentId: String(body.studentId ?? ""),
      mode: body.mode ?? "check-in",
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء تحديث سجل الحضور.",
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
          message: "معرّف سجل الحضور مطلوب.",
        },
        { status: 400 },
      );
    }

    const result = await deleteAttendanceRecord(id);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء حذف سجل الحضور.",
      },
      { status: 500 },
    );
  }
});
