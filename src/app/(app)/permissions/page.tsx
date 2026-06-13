
import { PageHeader } from "@/components/layout/page-header";
import { requireAdmin } from "@/lib/auth";
import { db, safeQuery } from "@/lib/db";
import { PermissionsClient } from "./permissions-client";

export const dynamic = "force-dynamic";

type RoleKey = "system_admin" | "admin_user";

export default async function PermissionsPage() {
  const session = await requireAdmin();
  const [currentAdmin, users] = await Promise.all([
    safeQuery(
      () => db.admin.findUnique({ where: { id: session.adminId } }),
      null,
    ),
    safeQuery(
      () => db.admin.findMany({ orderBy: { createdAt: "asc" } }),
      [],
    ),
  ]);

  const preparedUsers = users.map((user: any) => ({
    id: user.id,
    username: user.username,
    role: (user.isRoot ? "system_admin" : "admin_user") as RoleKey,
    roleLabel: user.isRoot ? "مدير النظام" : "مستخدم إداري",
    isRoot: Boolean(user.isRoot),
    createdAt: user.createdAt ?? null,
    updatedAt: user.updatedAt ?? null,
  }));

  return (
    <div className="mx-auto flex w-full max-w-[1350px] flex-col gap-6">
        <PageHeader
          title="الصلاحيات"
          description="إدارة أدوار النظام والمستخدمين المسموح لهم بالدخول إلى لوحة الإدارة."
          icon="permissions"
          badge="مدير النظام"
        />

        <PermissionsClient
          initialUsers={preparedUsers}
          currentAdminId={session.adminId}
          canManage={Boolean(currentAdmin?.isRoot)}
        />
      </div>
  );
}
