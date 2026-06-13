import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureDatabase();

    const body = await request.json().catch(() => ({}));
    const resetPassword = body?.resetPassword === true;

    if (resetPassword) {
      // Reset admin password
      const username = process.env.INITIAL_ADMIN_USERNAME || "admin";
      const password = process.env.INITIAL_ADMIN_PASSWORD || "admin1234";
      const passwordHash = await bcrypt.hash(password, 12);

      const existing = await db.admin.findUnique({ where: { username } });
      if (existing) {
        await db.admin.update({
          where: { username },
          data: { passwordHash },
        });
        return NextResponse.json({
          ok: true,
          message: `Password for "${username}" has been reset to the default`,
        });
      } else {
        await db.admin.create({
          data: {
            username,
            passwordHash,
            isRoot: true,
          },
        });
        return NextResponse.json({
          ok: true,
          message: `Admin user "${username}" created with default password`,
        });
      }
    }

    const count = await db.admin.count();
    if (count > 0) {
      const admins = await db.admin.findMany({ select: { username: true } });
      return NextResponse.json({
        ok: true,
        message: "Admin users already exist",
        admins: admins.map((a: { username: string }) => a.username),
      });
    }

    const newUsername = process.env.INITIAL_ADMIN_USERNAME || "admin";
    const newPassword = process.env.INITIAL_ADMIN_PASSWORD || "admin1234";
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await db.admin.create({
      data: {
        username: newUsername,
        passwordHash: newPasswordHash,
        isRoot: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Admin user "${newUsername}" created successfully`,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      message: "Failed to seed admin",
      error: error?.message || String(error),
    }, { status: 500 });
  }
}
