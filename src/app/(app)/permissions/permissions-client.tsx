"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, KeyRound, ShieldCheck, UserCog, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";

type RoleKey = "system_admin" | "admin_user";

type ManagedUser = {
  id: string;
  username: string;
  role: RoleKey;
  roleLabel: string;
  isRoot: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type PermissionsClientProps = {
  initialUsers: ManagedUser[];
  currentAdminId: string;
  canManage: boolean;
};

const roles: Array<{
  key: RoleKey;
  title: string;
  description: string;
  permissions: string[];
}> = [
  {
    key: "system_admin",
    title: "مدير النظام",
    description: "صلاحية كاملة لإدارة المستخدمين والأدوار وكل صفحات النظام.",
    permissions: ["إضافة مستخدمين", "تعديل الأدوار", "إعادة تعيين كلمات المرور", "حذف مستخدمين"],
  },
  {
    key: "admin_user",
    title: "مستخدم إداري",
    description: "دخول إداري للنظام بدون صلاحيات التحكم بالمستخدمين والأدوار.",
    permissions: ["الدخول للنظام", "إدارة بيانات المدرسة", "مشاهدة التقارير", "بدون تحكم بالصلاحيات"],
  },
];

export function PermissionsClient({
  initialUsers,
  currentAdminId,
  canManage,
}: PermissionsClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isPending, setIsPending] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "admin_user" as RoleKey });
  const [passwords, setPasswords] = useState<Record<string, string>>({});

  const stats = useMemo(() => {
    return {
      total: users.length,
      systemAdmins: users.filter((user) => user.role === "system_admin").length,
      adminUsers: users.filter((user) => user.role === "admin_user").length,
    };
  }, [users]);

  function showSuccess(text: string) {
    setError(undefined);
    setMessage(text);
  }

  function showError(text: string) {
    setMessage(undefined);
    setError(text);
  }

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);

    try {
      const res = await fetch("/api/permissions/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "تعذر إنشاء المستخدم.");
        return;
      }

      setUsers((current) => [...current, data.user]);
      setNewUser({ username: "", password: "", role: "admin_user" });
      showSuccess("تم إنشاء المستخدم بنجاح.");
    } catch {
      showError("تعذر الاتصال بالخادم.");
    } finally {
      setIsPending(false);
    }
  }

  async function updateUser(id: string, payload: Partial<{ username: string; password: string; role: RoleKey }>) {
    setIsPending(true);

    try {
      const res = await fetch("/api/permissions/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "تعذر تعديل المستخدم.");
        return;
      }

      setUsers((current) => current.map((user) => (user.id === id ? data.user : user)));
      if (payload.password) {
        setPasswords((current) => ({ ...current, [id]: "" }));
      }
      showSuccess("تم حفظ التعديل بنجاح.");
    } catch {
      showError("تعذر الاتصال بالخادم.");
    } finally {
      setIsPending(false);
    }
  }

  async function deleteUser(id: string): Promise<{ ok: boolean; message?: string }> {
    const user = users.find((item) => item.id === id);
    if (!user) return { ok: false, message: "المستخدم غير موجود." };

    try {
      const res = await fetch(`/api/permissions/users?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        return { ok: false, message: data.error || "تعذر حذف المستخدم." };
      }

      setUsers((current) => current.filter((item) => item.id !== id));
      showSuccess("تم حذف المستخدم بنجاح.");
      return { ok: true };
    } catch {
      return { ok: false, message: "تعذر الاتصال بالخادم." };
    }
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {!canManage ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-800">
          حسابك الحالي ليس مدير نظام، لذلك تستطيع مشاهدة الصلاحيات فقط بدون إضافة أو تعديل أو حذف.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Users size={20} />} label="إجمالي المستخدمين" value={stats.total} />
        <StatCard icon={<ShieldCheck size={20} />} label="مدراء النظام" value={stats.systemAdmins} />
        <StatCard icon={<UserCog size={20} />} label="مستخدمون إداريون" value={stats.adminUsers} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {roles.map((role) => (
          <div key={role.key} className="app-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-amber-100 text-indigo-700">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[var(--app-text)]">{role.title}</h3>
                <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">{role.description}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {role.permissions.map((permission) => (
                <div key={permission} className="flex items-center gap-2 rounded-2xl border border-[var(--app-border-soft)] p-3 text-sm font-bold text-[var(--app-text)]">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  {permission}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="app-card overflow-hidden">
        <div className="border-b border-[var(--app-border-soft)] p-6">
          <h3 className="text-xl font-extrabold text-[var(--app-text)]">المستخدمون</h3>
          <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
            أضف مستخدمين جدد، غيّر أدوارهم، أو أعد تعيين كلمات المرور من مكان واحد.
          </p>
        </div>

        {canManage ? (
          <form onSubmit={createUser} className="grid gap-3 border-b border-[var(--app-border-soft)] bg-[var(--app-card-soft)] p-6 lg:grid-cols-[1fr_1fr_220px_auto]">
            <Input
              id="new-username"
              name="username"
              value={newUser.username}
              onChange={(e) => setNewUser((current) => ({ ...current, username: e.target.value }))}
              placeholder="اسم المستخدم الجديد"
              dir="ltr"
              disabled={isPending}
            />
            <Input
              id="new-password"
              name="password"
              value={newUser.password}
              onChange={(e) => setNewUser((current) => ({ ...current, password: e.target.value }))}
              placeholder="كلمة المرور"
              type="password"
              dir="ltr"
              disabled={isPending}
            />
            <Select
              id="new-role"
              name="role"
              value={newUser.role}
              onChange={(e) => setNewUser((current) => ({ ...current, role: e.target.value as RoleKey }))}
              disabled={isPending}
            >
              <option value="admin_user">مستخدم إداري</option>
              <option value="system_admin">مدير النظام</option>
            </Select>
            <Button type="submit" disabled={isPending}>إضافة مستخدم</Button>
          </form>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right">
            <thead className="bg-[var(--app-card-soft)] text-xs font-extrabold text-[var(--app-text-muted)]">
              <tr>
                <th className="px-5 py-4">المستخدم</th>
                <th className="px-5 py-4">الدور</th>
                <th className="px-5 py-4">تغيير كلمة المرور</th>
                <th className="px-5 py-4">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border-soft)]">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-4">
                    <div className="font-extrabold text-[var(--app-text)]">
                      {user.username}
                      {user.id === currentAdminId ? (
                        <span className="mr-2 rounded-full bg-indigo-50 px-2 py-1 text-[10px] text-indigo-700">حسابك الحالي</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Select
                      id={`role-${user.id}`}
                      name={`role-${user.id}`}
                      value={user.role}
                      onChange={(e) => updateUser(user.id, { role: e.target.value as RoleKey })}
                      disabled={!canManage || isPending}
                    >
                      <option value="admin_user">مستخدم إداري</option>
                      <option value="system_admin">مدير النظام</option>
                    </Select>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <Input
                        id={`password-${user.id}`}
                        name={`password-${user.id}`}
                        value={passwords[user.id] || ""}
                        onChange={(e) => setPasswords((current) => ({ ...current, [user.id]: e.target.value }))}
                        type="password"
                        placeholder="كلمة مرور جديدة"
                        dir="ltr"
                        disabled={!canManage || isPending}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!canManage || isPending || !passwords[user.id]}
                        onClick={() => updateUser(user.id, { password: passwords[user.id] })}
                        title="حفظ كلمة المرور"
                      >
                        <KeyRound size={16} />
                      </Button>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <DeleteConfirmButton
                      onConfirm={() => deleteUser(user.id)}
                      confirmTitle={`هل أنت متأكد من حذف المستخدم "${user.username}"؟`}
                      confirmDescription="سيتم حذف هذا المستخدم نهائيًا ولن يتمكن من الدخول للنظام بعد الحذف."
                      confirmLabel="نعم، احذف"
                      cancelLabel="تراجع"
                      disabled={!canManage || user.id === currentAdminId}
                      className="btn border-red-100 bg-gradient-to-r from-red-50 to-indigo-50 text-red-700 hover:from-red-100 hover:to-indigo-100"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="app-card flex items-center gap-4 p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-amber-100 text-indigo-700">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-[var(--app-text-muted)]">{label}</p>
        <p className="mt-1 text-2xl font-extrabold text-[var(--app-text)]">{value}</p>
      </div>
    </div>
  );
}
