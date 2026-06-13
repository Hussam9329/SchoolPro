import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { getSession, revokeAllAdminSessions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type AdminRecord = {
  id: string;
  username: string;
  isRoot?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function sanitizeUser(user: AdminRecord) {
  return {
    id: user.id,
    username: user.username,
    role: user.isRoot ? "system_admin" : "admin_user",
    roleLabel: user.isRoot ? "مدير النظام" : "مستخدم إداري",
    isRoot: Boolean(user.isRoot),
    createdAt: user.createdAt ?? null,
    updatedAt: user.updatedAt ?? null,
  };
}

async function getCurrentAdmin() {
  await ensureDatabase();
  const session = await getSession();
  if (!session?.adminId) return null;

  return db.admin.findUnique({ where: { id: session.adminId } });
}

async function requireSystemAdmin() {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return { error: "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.", status: 401 as const };
  }

  if (!currentAdmin.isRoot) {
    return { error: "هذه الصفحة مخصصة لمدير النظام فقط.", status: 403 as const };
  }

  return { currentAdmin };
}

async function getSystemAdminsCount() {
  const users = await db.admin.findMany();
  return users.filter((user: AdminRecord) => Boolean(user.isRoot)).length;
}

export async function GET() {
  try {
    const currentAdmin = await getCurrentAdmin();
    if (!currentAdmin) {
      return NextResponse.json(
        { error: "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى." },
        { status: 401 }
      );
    }

    const users = await db.admin.findMany({ orderBy: { createdAt: "asc" } });

    return NextResponse.json({
      ok: true,
      currentAdminId: currentAdmin.id,
      canManage: Boolean(currentAdmin.isRoot),
      users: users.map(sanitizeUser),
    });
  } catch (error) {
    console.error("[permissions.users.GET] Error:", error);
    return NextResponse.json(
      { error: "تعذر تحميل مستخدمي النظام." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireSystemAdmin();
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const role = body.role === "system_admin" ? "system_admin" : "admin_user";

    if (!username || username.length < 3) {
      return NextResponse.json(
        { error: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل." },
        { status: 400 }
      );
    }

    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 4 أحرف على الأقل." },
        { status: 400 }
      );
    }

    const existing = await db.admin.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: "اسم المستخدم موجود مسبقًا." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.admin.create({
      data: {
        username,
        passwordHash,
        isRoot: role === "system_admin",
      },
    });

    return NextResponse.json({ ok: true, user: sanitizeUser(user) });
  } catch (error) {
    console.error("[permissions.users.POST] Error:", error);
    return NextResponse.json(
      { error: "تعذر إنشاء المستخدم." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await requireSystemAdmin();
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const id = String(body.id || "");
    const username = typeof body.username === "string" ? body.username.trim() : undefined;
    const password = typeof body.password === "string" ? body.password : undefined;
    const role = body.role === "system_admin" ? "system_admin" : body.role === "admin_user" ? "admin_user" : undefined;

    if (!id) {
      return NextResponse.json({ error: "لم يتم تحديد المستخدم." }, { status: 400 });
    }

    const target = await db.admin.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "المستخدم غير موجود." }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (username !== undefined) {
      if (username.length < 3) {
        return NextResponse.json(
          { error: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل." },
          { status: 400 }
        );
      }

      if (username !== target.username) {
        const existing = await db.admin.findUnique({ where: { username } });
        if (existing && existing.id !== id) {
          return NextResponse.json(
            { error: "اسم المستخدم موجود مسبقًا." },
            { status: 409 }
          );
        }
      }
      updateData.username = username;
    }

    if (password) {
      if (password.length < 4) {
        return NextResponse.json(
          { error: "كلمة المرور يجب أن تكون 4 أحرف على الأقل." },
          { status: 400 }
        );
      }
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    if (role) {
      if (target.isRoot && role === "admin_user" && (await getSystemAdminsCount()) <= 1) {
        return NextResponse.json(
          { error: "لا يمكن إلغاء آخر مدير نظام." },
          { status: 400 }
        );
      }
      updateData.isRoot = role === "system_admin";
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "لا توجد تغييرات لحفظها." },
        { status: 400 }
      );
    }

    const user = await db.admin.update({ where: { id }, data: updateData });

    // If password was changed, revoke all sessions for this admin
    if (password) {
      await revokeAllAdminSessions(id);
    }

    return NextResponse.json({ ok: true, user: sanitizeUser(user) });
  } catch (error) {
    console.error("[permissions.users.PATCH] Error:", error);
    return NextResponse.json(
      { error: "تعذر تعديل المستخدم." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await requireSystemAdmin();
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "";

    if (!id) {
      return NextResponse.json({ error: "لم يتم تحديد المستخدم." }, { status: 400 });
    }

    if (id === access.currentAdmin.id) {
      return NextResponse.json(
        { error: "لا يمكن حذف المستخدم الذي سجلت الدخول به حاليًا." },
        { status: 400 }
      );
    }

    const target = await db.admin.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "المستخدم غير موجود." }, { status: 404 });
    }

    if (target.isRoot && (await getSystemAdminsCount()) <= 1) {
      return NextResponse.json(
        { error: "لا يمكن حذف آخر مدير نظام." },
        { status: 400 }
      );
    }

    await db.admin.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[permissions.users.DELETE] Error:", error);
    return NextResponse.json(
      { error: "تعذر حذف المستخدم." },
      { status: 500 }
    );
  }
}
