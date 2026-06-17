import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { safeQuery } from "@/lib/db";
import { getClassFeeSettings } from "@/services/class-fee-service";
import { PrintButton } from "@/components/reports/print-button";
import { formatMoney, getCurrentAcademicYear } from "@/types/payment";

export const dynamic = "force-dynamic";

type FeesPrintPageProps = {
  searchParams?: Promise<{ academicYear?: string }>;
};

export default async function FeesPrintPage({ searchParams }: FeesPrintPageProps) {
  await requireAdmin();
  const resolvedSearchParams = await searchParams;
  const academicYear = resolvedSearchParams?.academicYear?.trim() || getCurrentAcademicYear();
  const settings = await safeQuery(() => getClassFeeSettings(academicYear), []);

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/fees?academicYear=${encodeURIComponent(academicYear)}`} className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--app-text-muted)] hover:text-[var(--app-primary)]">
          <ArrowRight size={16} />
          العودة إلى إعدادات الأقساط
        </Link>
        <PrintButton label="طباعة" />
      </div>

      <section className="app-card overflow-hidden print:border print:shadow-none">
        <div className="border-b border-[var(--app-border-soft)] p-6 text-center">
          <h1 className="text-2xl font-extrabold text-[var(--app-text)]">جدول أقساط المراحل الدراسية</h1>
          <p className="mt-2 text-sm font-bold text-[var(--app-text-muted)]">السنة / النظام: {academicYear}</p>
          <p className="mt-1 text-xs text-[var(--app-text-muted)]">نسخة قابلة للطباعة وتسليمها لولي الأمر للعلم بكامل الرسوم.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-[var(--app-text-muted)]">
              <tr>
                <th className="p-4 text-right font-extrabold">الصف / المرحلة</th>
                <th className="p-4 text-right font-extrabold">الرسوم الدراسية</th>
                <th className="p-4 text-right font-extrabold">الزي</th>
                <th className="p-4 text-right font-extrabold">الرسم المخصص</th>
                <th className="p-4 text-right font-extrabold">التوتال الكامل</th>
                <th className="p-4 text-right font-extrabold">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border-soft)]">
              {settings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center font-bold text-[var(--app-text-muted)]">لا توجد إعدادات أقساط لهذه السنة.</td>
                </tr>
              ) : settings.map((setting: any) => {
                const tuition = Number(setting.tuitionAmount ?? setting.amount ?? 0) || 0;
                const uniform = Number(setting.uniformAmount ?? setting.uniform_amount ?? 0) || 0;
                const customTitle = String(setting.customFeeTitle ?? setting.custom_fee_title ?? "رسوم مخصصة");
                const customAmount = Number(setting.customFeeAmount ?? setting.custom_fee_amount ?? 0) || 0;
                const total = tuition + uniform + customAmount;
                return (
                  <tr key={setting.id}>
                    <td className="p-4 font-extrabold text-[var(--app-text)]">{setting.class?.name ?? "صف غير محدد"}<br /><span className="text-xs text-[var(--app-text-muted)]">{setting.class?.level ?? ""}</span></td>
                    <td className="p-4">{formatMoney(tuition)}</td>
                    <td className="p-4">{formatMoney(uniform)}</td>
                    <td className="p-4">{customTitle}: {formatMoney(customAmount)}</td>
                    <td className="p-4 font-extrabold text-teal-700">{formatMoney(total)}</td>
                    <td className="p-4">{setting.notes ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 border-t border-[var(--app-border-soft)] p-6 text-sm font-bold text-[var(--app-text-muted)] md:grid-cols-3">
          <SignatureBox label="توقيع ولي الأمر" />
          <SignatureBox label="توقيع المحاسب" />
          <SignatureBox label="توقيع المدير / المعاون" />
        </div>
      </section>
    </div>
  );
}

function SignatureBox({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-center">
      <p>{label}</p>
      <div className="mt-10 border-t border-slate-300 pt-2">الاسم والتوقيع</div>
    </div>
  );
}
