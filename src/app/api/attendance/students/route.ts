import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth";
import { safeQuery } from "@/lib/db";
import { findStudentForAttendance } from "@/services/attendance-service";

export const dynamic = "force-dynamic";

export const GET = withApiAuth(async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2 && !q.startsWith("MarSch-")) {
    return NextResponse.json({ ok: true, data: [] });
  }

  const students = await safeQuery(() => findStudentForAttendance(q), []);

  return NextResponse.json({
    ok: true,
    message: "تم جلب الطلاب بسرعة.",
    data: students,
  });
});
