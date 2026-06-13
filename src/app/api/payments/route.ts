import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/lib/db";
import { withApiAuth } from "@/lib/api-auth";
import {
  createPayment,
  deletePayment,
  getPayments,
  updatePayment,
} from "@/services/payment-service";
import type { PaymentFormInput } from "@/types/payment";

export const GET = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const searchParams = request.nextUrl.searchParams;

    const overdueOnly = searchParams.get("overdueOnly") === "true";

    const payments = await getPayments({
      query: searchParams.get("q") ?? "",
      studentId: searchParams.get("studentId") ?? "",
      sectionId: searchParams.get("sectionId") ?? "",
      classId: searchParams.get("classId") ?? "",
      feeType: searchParams.get("feeType") ?? "",
      status: searchParams.get("status") ?? "",
      method: searchParams.get("method") ?? "",
      academicYear: searchParams.get("academicYear") ?? "",
      fromDate: searchParams.get("fromDate") ?? "",
      toDate: searchParams.get("toDate") ?? "",
      dueFromDate: searchParams.get("dueFromDate") ?? "",
      dueToDate: searchParams.get("dueToDate") ?? "",
      overdueOnly,
    });

    return NextResponse.json({
      ok: true,
      message: "تم جلب المدفوعات بنجاح.",
      data: payments,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء جلب المدفوعات.",
      },
      { status: 500 },
    );
  }
});

export const POST = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const body = (await request.json()) as Partial<PaymentFormInput>;

    const result = await createPayment({
      feeTitle: body.feeTitle ?? "",
      feeType: body.feeType ?? "tuition",
      amount: body.amount ?? 0,
      status: body.status ?? "paid",
      method: body.method ?? "cash",
      academicYear: body.academicYear ?? "",
      dueDate: body.dueDate ?? "",
      paidAt: body.paidAt ?? "",
      notes: body.notes ?? "",
      studentId: body.studentId ?? "",
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء إضافة الدفعة.",
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
          message: "معرّف الدفعة مطلوب.",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Partial<PaymentFormInput>;

    const result = await updatePayment(id, {
      feeTitle: body.feeTitle ?? "",
      feeType: body.feeType ?? "tuition",
      amount: body.amount ?? 0,
      status: body.status ?? "paid",
      method: body.method ?? "cash",
      academicYear: body.academicYear ?? "",
      dueDate: body.dueDate ?? "",
      paidAt: body.paidAt ?? "",
      notes: body.notes ?? "",
      studentId: body.studentId ?? "",
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء تحديث بيانات الدفعة.",
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
          message: "معرّف الدفعة مطلوب.",
        },
        { status: 400 },
      );
    }

    const result = await deletePayment(id);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء حذف الدفعة.",
      },
      { status: 500 },
    );
  }
});
