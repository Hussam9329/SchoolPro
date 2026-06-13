import { db, ensureDatabase } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, rememberMe } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "يرجى إدخال اسم المستخدم وكلمة المرور." },
        { status: 400 }
      );
    }

    // Ensure database is initialized (especially on Vercel)
    await ensureDatabase();

    const admin = await db.admin.findUnique({ where: { username } });
    if (!admin) {
      return NextResponse.json(
        { error: "اسم المستخدم أو كلمة المرور غير صحيحة." },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "اسم المستخدم أو كلمة المرور غير صحيحة." },
        { status: 401 }
      );
    }

    // Create session with jti-based revocation support
    await createSession(admin.id, Boolean(rememberMe));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[login] Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الدخول." },
      { status: 500 }
    );
  }
}
