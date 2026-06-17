"use client";

import { useEffect, useState } from "react";
import { Smartphone, Monitor, Camera } from "lucide-react";
import dynamic from "next/dynamic";

// Lazy-load QR scanner — @zxing/browser is heavy (~100KB) and only needed on mobile
const QrAttendanceScanner = dynamic(
  () => import("./qr-attendance-scanner").then((mod) => ({ default: mod.QrAttendanceScanner })),
  { ssr: false },
);
import { QuickCodeAttendance } from "./quick-code-attendance";

/**
 * AttendanceEntryPanel — Smart wrapper that detects the device type
 * and shows the appropriate attendance entry methods:
 *
 * - Phone/Tablet: QR camera scanner + Quick manual code entry
 * - Desktop: Quick manual code entry only
 */
export function AttendanceEntryPanel({ checkoutWarningTime, scheduleId, attendanceDate }: { checkoutWarningTime: string; scheduleId: string; attendanceDate: string }) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkMobile = () => {
      const ua = navigator.userAgent;
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
        (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Avoid hydration mismatch — render a placeholder until mounted
  if (!mounted) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="app-card flex min-h-[300px] items-center justify-center p-6">
          <div className="text-center text-[var(--app-text-muted)]">
            <div className="mx-auto mb-3 h-10 w-10 animate-pulse-soft rounded-full bg-slate-100" />
            <p className="text-sm font-bold">جارٍ تحميل واجهة الحضور...</p>
          </div>
        </div>
        <div className="app-card flex min-h-[300px] items-center justify-center p-6">
          <div className="text-center text-[var(--app-text-muted)]">
            <div className="mx-auto mb-3 h-10 w-10 animate-pulse-soft rounded-full bg-slate-100" />
            <p className="text-sm font-bold">جارٍ تحميل واجهة الحضور...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Device indicator */}
      <div className="mb-4 flex items-center gap-2">
        {isMobile ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            <Smartphone size={16} />
            وضع الهاتف — كاميرا QR + إدخال يدوي
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm font-bold text-teal-700">
            <Monitor size={16} />
            وضع الحاسوب — بحث بالاسم أو الرمز
          </div>
        )}
      </div>

      {isMobile ? (
        /* ── Mobile Layout: QR Scanner + Quick Code Entry ── */
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column: QR Scanners */}
          <div className="flex flex-col gap-6">
            <QrAttendanceScanner
              mode="check-in"
              checkoutWarningTime={checkoutWarningTime}
              scheduleId={scheduleId}
              attendanceDate={attendanceDate}
              title="تسجيل حضور (QR)"
              description="وجّه الكاميرا نحو رمز QR الخاص بالطالب لتسجيل حضوره."
            />
            <QrAttendanceScanner
              mode="check-out"
              checkoutWarningTime={checkoutWarningTime}
              scheduleId={scheduleId}
              attendanceDate={attendanceDate}
              title="تسجيل انصراف (QR)"
              description="وجّه الكاميرا نحو رمز QR الخاص بالطالب لتسجيل انصرافه."
            />
          </div>

          {/* Right column: Quick Code Entry */}
          <QuickCodeAttendance qrAvailable checkoutWarningTime={checkoutWarningTime} scheduleId={scheduleId} attendanceDate={attendanceDate} />
        </div>
      ) : (
        /* ── Desktop Layout: Quick Code Entry Only ── */
        <div className="mx-auto max-w-[700px]">
          <QuickCodeAttendance qrAvailable={false} checkoutWarningTime={checkoutWarningTime} scheduleId={scheduleId} attendanceDate={attendanceDate} />

          {/* Hint about mobile QR */}
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <Camera size={20} className="mt-0.5 shrink-0 text-blue-500" />
            <div>
              <p className="text-sm font-bold text-blue-800">
                مسح QR متاح على الهاتف فقط
              </p>
              <p className="mt-1 text-xs leading-6 text-blue-600">
                لاستخدام ماسح رمز QR بالكاميرا، افتح الموقع من هاتفك أو جهازك اللوحي. على الحاسوب يمكنك البحث عن الطالب بالاسم أو إدخال رمزه مباشرة لتسجيل الحضور والانصراف فورًا.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
