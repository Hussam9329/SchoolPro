import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth";
import { scanAttendanceByStudentCode, scanAttendanceByStudentId } from "@/services/attendance-service";
import type { AttendanceScanInput } from "@/types/attendance";

export const POST = withApiAuth(async (request: NextRequest) => {
  const body = await request.json();
  const { studentCode, studentId, mode, source, clientTime, scheduleId } = body;

  // Support both studentCode (from QR/manual code) and studentId (from name search)
  if (studentId) {
    if (!mode) {
      return NextResponse.json(
        { ok: false, message: "نوع العملية مطلوب." },
        { status: 400 },
      );
    }

    const result = await scanAttendanceByStudentId({
      studentId,
      mode,
      source: source || "manual-name",
      clientTime: clientTime || undefined,
      scheduleId: scheduleId || undefined,
    });

    return NextResponse.json(result);
  }

  if (!studentCode || !mode) {
    return NextResponse.json(
      { ok: false, message: "الرمز أو معرّف الطالب ونوع العملية مطلوبان." },
      { status: 400 },
    );
  }

  const input: AttendanceScanInput = { studentCode, mode, source: source || "qr", clientTime: clientTime || undefined, scheduleId: scheduleId || undefined };
  const result = await scanAttendanceByStudentCode(input);

  return NextResponse.json(result);
});
