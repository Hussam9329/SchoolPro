import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";
import { buildErrorRedirect } from "@/lib/redirect-message";
import { CalendarDays, Clock3, Save, Settings, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { safeQuery } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { SmartAlert } from "@/components/shared/smart-alert";
import { getSchoolSettings, isConfiguredHoliday } from "@/services/school-settings-service";
import {
  SCHOOL_DAY_OPTIONS,
  isSchoolDay,
  parseHolidayDatesText,
  serializeHolidayDatesForTextarea,
} from "@/types/settings";
import { saveSchoolSettings } from "@/services/school-settings-service";

export const dynamic = "force-dynamic";


type SettingsPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
    reason?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  await requireAdmin();
  const resolvedSearchParams = await searchParams;
  const settings = await safeQuery(() => getSchoolSettings(), {
    id: "main",
    weekendDays: ["friday", "saturday"],
    customHolidayDates: [],
    checkoutWarningTime: "12:00",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const today = new Date();
  const todayIsHoliday = isConfiguredHoliday(today, settings);

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
        <PageHeader
          title="الإعدادات"
          description="حدد أيام العطل ووقت الانصراف القياسي حتى يعتمد عليها الحضور والتنبيهات وحساب الغياب."
          icon="settings"
          badge="إعدادات المدرسة"
        />

        {resolvedSearchParams?.saved === "1" ? (
          <SmartAlert
            tone="success"
            title="تم حفظ الإعدادات"
            description="تم تحديث أيام العطل ووقت الانصراف، وسيتم اعتمادها مباشرة في تبويبة الحضور."
          />
        ) : null}

        {resolvedSearchParams?.error ? (
          <SmartAlert
            tone="warning"
            title="لم يتم حفظ الإعدادات"
            description={resolvedSearchParams?.reason ?? "تأكد من اختيار يوم دوام واحد على الأقل وإدخال وقت الانصراف بصيغة صحيحة مثل 12:00."}
          />
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="app-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <CalendarDays size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--app-text-muted)]">أيام العطل الأسبوعية</p>
                <p className="text-lg font-extrabold text-[var(--app-text)]">{settings.weekendDays.length} يوم</p>
              </div>
            </div>
          </div>

          <div className="app-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <Clock3 size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--app-text-muted)]">وقت تنبيه الانصراف المبكر</p>
                <p className="text-lg font-extrabold text-[var(--app-text)]">{settings.checkoutWarningTime}</p>
              </div>
            </div>
          </div>

          <div className="app-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--app-text-muted)]">حالة اليوم</p>
                <p className="text-lg font-extrabold text-[var(--app-text)]">{todayIsHoliday ? "عطلة" : "دوام"}</p>
              </div>
            </div>
          </div>
        </section>

        <form action={saveSchoolSettingsAction} className="app-card overflow-hidden">
          <div className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-indigo-50/60 to-blue-50/20 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <Settings size={24} />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[var(--app-text)]">إعدادات الحضور والعطل</h3>
                <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
                  أي يوم يتم وضعه كعطلة لن يدخل في حساب غياب اليوم السابق. أما أيام الدوام التي لا يوجد للطالب فيها سجل حضور فسيظهر تنبيه بأنه غائب.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6">
            <div>
              <p className="mb-3 text-sm font-extrabold text-[var(--app-text)]">أيام العطل الأسبوعية</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {SCHOOL_DAY_OPTIONS.map((day) => (
                  <label key={day.value} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--app-border-soft)] bg-white px-4 py-3 text-sm font-bold text-[var(--app-text)] transition hover:border-indigo-200 hover:bg-indigo-50/30">
                    <input
                      type="checkbox"
                      name="weekendDays"
                      value={day.value}
                      defaultChecked={settings.weekendDays.includes(day.value)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
              <div>
                <label htmlFor="checkoutWarningTime" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
                  وقت الانصراف القياسي
                </label>
                <input
                  id="checkoutWarningTime"
                  name="checkoutWarningTime"
                  type="time"
                  defaultValue={settings.checkoutWarningTime}
                  className="input"
                />
                <p className="mt-2 text-xs leading-6 text-[var(--app-text-muted)]">
                  الانصراف قبل هذا الوقت يبقى متاحًا، لكن النظام يعرض رسالة تأكيد للمستخدم.
                </p>
              </div>

              <div>
                <label htmlFor="customHolidayDates" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
                  تواريخ عطل إضافية
                </label>
                <textarea
                  id="customHolidayDates"
                  name="customHolidayDates"
                  rows={6}
                  className="input min-h-[150px]"
                  placeholder="2026-06-01&#10;2026-06-02"
                  defaultValue={serializeHolidayDatesForTextarea(settings.customHolidayDates)}
                />
                <p className="mt-2 text-xs leading-6 text-[var(--app-text-muted)]">
                  اكتب كل تاريخ بسطر مستقل بصيغة YYYY-MM-DD. هذه التواريخ لا تُحسب كغياب عند فحص آخر يوم دوام سابق.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
                ملاحظات داخلية
              </label>
              <input
                id="notes"
                name="notes"
                className="input"
                defaultValue={settings.notes ?? ""}
                placeholder="مثال: دوام السبت استثنائي خلال فترة الامتحانات"
              />
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary">
                <Save size={18} />
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </form>
      </div>
  );
}

async function saveSchoolSettingsAction(formData: FormData) {
  "use server";

  const weekendDays = formData.getAll("weekendDays").map((item) => String(item));
  const checkoutWarningTime = String(formData.get("checkoutWarningTime") ?? "12:00");
  const customHolidayDates = parseHolidayDatesText(String(formData.get("customHolidayDates") ?? ""));
  const notes = String(formData.get("notes") ?? "");

  if (weekendDays.length >= SCHOOL_DAY_OPTIONS.length || !/^([01]\d|2[0-3]):[0-5]\d$/.test(checkoutWarningTime)) {
    redirect(buildErrorRedirect("/settings", "1", "تأكد من اختيار يوم دوام واحد على الأقل وأن وقت التنبيه بصيغة HH:mm."));
  }

  await saveSchoolSettings({
    weekendDays: weekendDays.filter(isSchoolDay),
    customHolidayDates,
    checkoutWarningTime,
    notes,
  });

  revalidatePath("/settings");
  revalidatePath("/attendance");
  revalidatePath("/");
  redirect("/settings?saved=1");
}
