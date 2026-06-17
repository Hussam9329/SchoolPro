import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";
import { Banknote, CheckCircle2, FileText, Settings, Shirt, WalletCards } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { safeQuery } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { SmartAlert } from "@/components/shared/smart-alert";
import { EmptyState } from "@/components/shared/empty-state";
import { getActiveClasses } from "@/services/class-service";
import { getClassFeeSettings, upsertClassFeeSetting } from "@/services/class-fee-service";
import { formatMoney, getAcademicYearOptions, getCurrentAcademicYear } from "@/types/payment";

export const dynamic = "force-dynamic";


type FeesPageProps = {
  searchParams?: Promise<{
    academicYear?: string;
    saved?: string;
    error?: string;
  }>;
};

export default async function FeesPage({ searchParams }: FeesPageProps) {
  await requireAdmin();
  const resolvedSearchParams = await searchParams;
  const academicYear = resolvedSearchParams?.academicYear?.trim() || getCurrentAcademicYear();

  const academicYearOptions = getAcademicYearOptions(academicYear);

  const [classes, settings] = await Promise.all([
    safeQuery(() => getActiveClasses(), []),
    safeQuery(() => getClassFeeSettings(academicYear), []),
  ]);

  const settingByClassId = new Map(settings.map((setting: any) => [setting.classId, setting]));

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <PageHeader
          title="إدارة الأقساط"
          description="حدد الرسوم الدراسية الكاملة وسعر الزي لكل صف وسنة دراسية حتى تظهر تلقائيًا في تبويبة الأقساط."
          icon="settings"
          badge="إعدادات مالية"
        />

        {resolvedSearchParams?.saved === "1" && (
          <SmartAlert tone="success" title="تم الحفظ" description="تم تحديث رسوم الصف والزي المدرسي بنجاح." />
        )}

        {resolvedSearchParams?.error && (
          <SmartAlert tone="warning" title="لم يتم الحفظ" description="تأكد من اختيار الصف وإدخال مبالغ صحيحة ثم حاول مرة أخرى." />
        )}

        <form action="/fees" className="app-card p-5">
          <label htmlFor="academicYear" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">السنة الدراسية / النظام</label>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <select id="academicYear" name="academicYear" className="input" defaultValue={academicYear}>
              {academicYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <button className="btn btn-secondary" type="submit">عرض السنة</button>
            <a href={`/fees/print?academicYear=${encodeURIComponent(academicYear)}`} className="btn btn-primary justify-center">
              <FileText size={18} />
              طباعة جدول الأقساط
            </a>
          </div>
        </form>

        {classes.length === 0 ? (
          <EmptyState
            icon="classes"
            title="لا توجد صفوف فعالة"
            description="أضف الصفوف والشعب أولًا حتى تتمكن من تحديد الرسوم الدراسية وسعر الزي."
            actionLabel="إدارة الصفوف"
            actionHref="/classes"
          />
        ) : (
          <section className="grid gap-4">
            {classes.map((schoolClass: any) => {
              const setting = settingByClassId.get(schoolClass.id) as any;
              const tuitionAmount = Number(setting?.tuitionAmount ?? setting?.amount ?? 0) || 0;
              const uniformAmount = Number(setting?.uniformAmount ?? setting?.uniform_amount ?? 0) || 0;
              const customFeeTitle = String(setting?.customFeeTitle ?? setting?.custom_fee_title ?? "رسوم مخصصة");
              const customFeeAmount = Number(setting?.customFeeAmount ?? setting?.custom_fee_amount ?? 0) || 0;
              const totalAmount = tuitionAmount + uniformAmount + customFeeAmount;

              return (
                <form key={schoolClass.id} action={saveClassFeeSettingAction} className="app-card app-card-hover p-5">
                  <input type="hidden" name="classId" value={schoolClass.id} />
                  <input type="hidden" name="academicYear" value={academicYear} />

                  <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                          <Settings size={22} />
                        </div>
                        <div>
                          <h3 className="text-lg font-extrabold text-[var(--app-text)]">{schoolClass.name}</h3>
                          <p className="text-sm text-[var(--app-text-muted)]">{schoolClass.level || "مرحلة غير محددة"}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-extrabold text-[var(--app-text)]" htmlFor={`tuition-${schoolClass.id}`}>الرسوم الدراسية</label>
                      <div className="relative">
                        <Banknote size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]" />
                        <input id={`tuition-${schoolClass.id}`} name="tuitionAmount" type="number" min={0} className="input pr-10" defaultValue={tuitionAmount || ""} placeholder="مثال: 1000000" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-extrabold text-[var(--app-text)]" htmlFor={`uniform-${schoolClass.id}`}>سعر الزي</label>
                      <div className="relative">
                        <Shirt size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]" />
                        <input id={`uniform-${schoolClass.id}`} name="uniformAmount" type="number" min={0} className="input pr-10" defaultValue={uniformAmount || ""} placeholder="مثال: 75000" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-extrabold text-[var(--app-text)]" htmlFor={`custom-title-${schoolClass.id}`}>اسم الرسم المخصص</label>
                      <input id={`custom-title-${schoolClass.id}`} name="customFeeTitle" className="input" defaultValue={customFeeTitle} placeholder="مثال: قرطاسية" />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-extrabold text-[var(--app-text)]" htmlFor={`custom-amount-${schoolClass.id}`}>مبلغ مخصص</label>
                      <div className="relative">
                        <WalletCards size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]" />
                        <input id={`custom-amount-${schoolClass.id}`} name="customFeeAmount" type="number" min={0} className="input pr-10" defaultValue={customFeeAmount || ""} placeholder="مثال: 50000" />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary justify-center">
                      <CheckCircle2 size={18} />
                      حفظ
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-extrabold text-[var(--app-text-muted)]">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">الدراسية: {formatMoney(tuitionAmount)}</span>
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">الزي: {formatMoney(uniformAmount)}</span>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">{customFeeTitle}: {formatMoney(customFeeAmount)}</span>
                    <span className="rounded-full bg-teal-100 px-3 py-1 text-teal-800">التوتال: {formatMoney(totalAmount)}</span>
                  </div>
                </form>
              );
            })}
          </section>
        )}
      </div>
  );
}

async function saveClassFeeSettingAction(formData: FormData) {
  "use server";

  const classId = String(formData.get("classId") ?? "");
  const academicYear = String(formData.get("academicYear") ?? getCurrentAcademicYear());
  const tuitionAmount = Number(formData.get("tuitionAmount") ?? 0);
  const uniformAmount = Number(formData.get("uniformAmount") ?? 0);
  const customFeeTitle = String(formData.get("customFeeTitle") ?? "");
  const customFeeAmount = Number(formData.get("customFeeAmount") ?? 0);
  const notes = String(formData.get("notes") ?? "");

  if (!classId || tuitionAmount < 0 || uniformAmount < 0 || customFeeAmount < 0) {
    redirect(`/fees?academicYear=${encodeURIComponent(academicYear)}&error=1`);
  }

  await upsertClassFeeSetting({
    classId,
    tuitionAmount,
    uniformAmount,
    customFeeTitle,
    customFeeAmount,
    academicYear,
    notes,
  });

  revalidatePath("/fees");
  revalidatePath("/payments");
  redirect(`/fees?academicYear=${encodeURIComponent(academicYear)}&saved=1`);
}
