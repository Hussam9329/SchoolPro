/* ─────────────────────────────────────────────
 *  Reports API Route  (file 52)
 * ───────────────────────────────────────────── */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/lib/db";
import { withApiAuth } from "@/lib/api-auth";
import {
  getAttendanceReport,
  getClassesReport,
  getDashboardCharts,
  getDashboardSummary,
  getGradesReport,
  getPaymentsReport,
  getTeachersReport,
} from "@/services/report-service";
import type { ReportFilter, ReportPeriod } from "@/types/report";

const VALID_PERIODS: ReportPeriod[] = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "semester",
  "annual",
  "custom",
];

const VALID_TYPES = [
  "all",
  "summary",
  "attendance",
  "grades",
  "payments",
  "classes",
  "teachers",
  "charts",
];

export const GET = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const { searchParams } = request.nextUrl;

    const type = searchParams.get("type") ?? "summary";
    const period = searchParams.get("period") ?? "monthly";
    const fromDate = searchParams.get("fromDate") ?? undefined;
    const toDate = searchParams.get("toDate") ?? undefined;
    const classId = searchParams.get("classId") ?? undefined;
    const sectionId = searchParams.get("sectionId") ?? undefined;
    const subjectId = searchParams.get("subjectId") ?? undefined;
    const teacherId = searchParams.get("teacherId") ?? undefined;
    const studentId = searchParams.get("studentId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const term = searchParams.get("term") ?? undefined;
    const source = searchParams.get("source") ?? undefined;
    const missingCheckOut = searchParams.get("missingCheckOut") === "yes";

    // Validate type
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        {
          ok: false,
          message: `نوع التقرير غير صحيح. الأنواع المتاحة: ${VALID_TYPES.join("، ")}`,
        },
        { status: 400 },
      );
    }

    // Validate period
    if (!VALID_PERIODS.includes(period as ReportPeriod)) {
      return NextResponse.json(
        {
          ok: false,
          message: `الفترة غير صحيحة. الفترات المتاحة: ${VALID_PERIODS.join("، ")}`,
        },
        { status: 400 },
      );
    }

    const filter: ReportFilter = {
      period: period as ReportPeriod,
      fromDate,
      toDate,
      classId,
      sectionId,
      subjectId,
      teacherId,
      studentId,
      status,
      term,
      source,
      missingCheckOut,
    };

    switch (type) {
      case "all": {
        const [summary, charts, attendance, grades, payments, classes, teachers] =
          await Promise.all([
            getDashboardSummary(filter),
            getDashboardCharts(filter),
            getAttendanceReport(filter),
            getGradesReport(filter),
            getPaymentsReport(filter),
            getClassesReport(),
            getTeachersReport(),
          ]);

        return NextResponse.json({
          ok: true,
          data: {
            summary,
            charts,
            attendance,
            grades,
            payments,
            classes,
            teachers,
          },
        });
      }

      case "summary": {
        const summary = await getDashboardSummary(filter);
        return NextResponse.json({
          ok: true,
          data: summary,
        });
      }

      case "charts": {
        const charts = await getDashboardCharts(filter);
        return NextResponse.json({
          ok: true,
          data: charts,
        });
      }

      case "attendance": {
        const attendance = await getAttendanceReport(filter);
        return NextResponse.json({
          ok: true,
          data: attendance,
        });
      }

      case "grades": {
        const grades = await getGradesReport(filter);
        return NextResponse.json({
          ok: true,
          data: grades,
        });
      }

      case "payments": {
        const payments = await getPaymentsReport(filter);
        return NextResponse.json({
          ok: true,
          data: payments,
        });
      }

      case "classes": {
        const classes = await getClassesReport();
        return NextResponse.json({
          ok: true,
          data: classes,
        });
      }

      case "teachers": {
        const teachers = await getTeachersReport();
        return NextResponse.json({
          ok: true,
          data: teachers,
        });
      }

      default: {
        return NextResponse.json(
          {
            ok: false,
            message: "نوع التقرير غير مدعوم.",
          },
          { status: 400 },
        );
      }
    }
  } catch (error) {
    console.error("[Reports API] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء إنشاء التقرير. حاول مرة أخرى.",
      },
      { status: 500 },
    );
  }
});
