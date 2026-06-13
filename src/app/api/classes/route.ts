import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/lib/db";
import { withApiAuth } from "@/lib/api-auth";
import {
  createClass,
  deleteClass,
  getClasses,
  searchClasses,
  updateClass,
} from "@/services/class-service";
import type { ClassFormInput } from "@/types/class";

export const GET = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    if (action === "search") {
      const q = searchParams.get("q") ?? "";
      const results = await searchClasses(q);
      return NextResponse.json({ ok: true, data: results });
    }

    const classes = await getClasses();
    return NextResponse.json({ ok: true, data: classes });
  } catch {
    return NextResponse.json(
      { ok: false, message: "حدث خطأ أثناء جلب الصفوف." },
      { status: 500 },
    );
  }
});

export const POST = withApiAuth(async (request: NextRequest) => {
  await ensureDatabase();
  try {
    const body = (await request.json()) as Partial<ClassFormInput>;
    const result = await createClass({
      name: body.name ?? "",
      level: body.level ?? "",
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, message: "حدث خطأ أثناء إضافة الصف." },
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
        { ok: false, message: "معرّف الصف مطلوب." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Partial<ClassFormInput>;
    const result = await updateClass(id, {
      name: body.name ?? "",
      level: body.level ?? "",
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { ok: false, message: "حدث خطأ أثناء تحديث الصف." },
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
        { ok: false, message: "معرّف الصف مطلوب." },
        { status: 400 },
      );
    }

    const result = await deleteClass(id);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { ok: false, message: "حدث خطأ أثناء حذف الصف." },
      { status: 500 },
    );
  }
});
