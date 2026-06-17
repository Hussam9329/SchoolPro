import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const student = await db.student.findUnique({
    where: { id },
    select: { studentCode: true },
  });

  if (!student || !student.studentCode) {
    return NextResponse.json(
      { ok: false, message: "الطالب غير موجود أو لا يملك رمزًا." },
      { status: 404 },
    );
  }

  const svg = await QRCode.toString(student.studentCode, {
    type: "svg",
    width: 200,
    margin: 2,
    color: { dark: "#0f766e", light: "#ffffff" },
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
