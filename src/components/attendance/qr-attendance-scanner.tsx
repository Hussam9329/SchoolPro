"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import type { AttendanceScanResult } from "@/types/attendance";
import { getLocalTimeISO, formatAttendanceTime } from "@/types/attendance";

type QrAttendanceScannerProps = {
  mode: "check-in" | "check-out";
  checkoutWarningTime: string;
  title: string;
  description: string;
  scheduleId: string;
  attendanceDate: string;
};

export function QrAttendanceScanner({
  mode,
  checkoutWarningTime,
  title,
  description,
  scheduleId,
  attendanceDate,
}: QrAttendanceScannerProps) {
  const router = useRouter();
  const [, startRefreshTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<any>(null);
  const lastScanRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AttendanceScanResult | null>(null);

  const getAttendanceClientTime = useCallback(() => {
    const localTime = getLocalTimeISO();
    return attendanceDate ? `${attendanceDate}${localTime.slice(10)}` : localTime;
  }, [attendanceDate]);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (readerRef.current) {
      readerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const confirmEarlyCheckout = useCallback(() => {
    if (mode !== "check-out") return true;

    const [hourText, minuteText] = checkoutWarningTime.split(":");
    const warningHour = Number(hourText);
    const warningMinute = Number(minuteText);
    const warningTotalMinutes = Number.isFinite(warningHour) && Number.isFinite(warningMinute)
      ? warningHour * 60 + warningMinute
      : 12 * 60;

    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    if (currentTotalMinutes >= warningTotalMinutes) return true;

    return window.confirm(`هل أنت متأكد أن الطالب سينصرف قبل الوقت المحدد للانصراف (${checkoutWarningTime})؟`);
  }, [checkoutWarningTime, mode]);

  const handleScan = useCallback(
    async (studentCode: string) => {
      if (!confirmEarlyCheckout()) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/attendance/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentCode, mode, source: "qr", clientTime: getAttendanceClientTime(), scheduleId }),
        });

        const data: AttendanceScanResult = await res.json();
        setResult(data);

        if (!data.ok) {
          setError(data.message);
        } else {
          startRefreshTransition(() => router.refresh());
        }
      } catch {
        setError("حدث خطأ في الاتصال بالخادم.");
      } finally {
        setLoading(false);
      }
    },
    [mode, router, confirmEarlyCheckout, startRefreshTransition, getAttendanceClientTime, scheduleId],
  );

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      setError(null);
      setResult(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Dynamic import of @zxing/browser
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      setScanning(true);

      reader.decodeFromVideoElement(
        videoRef.current!,
        (result) => {
          if (!result) return;

          const text = result.getText();
          if (!text) return;

          const now = Date.now();
          // Debounce: ignore same code within 3 seconds
          if (
            text === lastScanRef.current &&
            now - lastScanTimeRef.current < 3000
          ) {
            return;
          }

          lastScanRef.current = text;
          lastScanTimeRef.current = now;

          handleScan(text);
        },
      );
    } catch (err: any) {
      setCameraError(
        err?.name === "NotAllowedError"
          ? "لم يتم السماح بالوصول إلى الكاميرا."
          : "تعذر تشغيل الكاميرا. تأكدي من أن الجهاز يحتوي على كاميرا.",
      );
      setScanning(false);
    }
  }, [handleScan]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const ModeIcon = mode === "check-in" ? CheckCircle2 : XCircle;
  const modeColor =
    mode === "check-in"
      ? "from-emerald-100 to-teal-100 text-emerald-700"
      : "from-sky-100 to-orange-100 text-sky-700";

  return (
    <div className="app-card overflow-hidden">
      <div className="border-b border-[var(--app-border-soft)] bg-gradient-to-l from-teal-50/40 to-sky-50/20 p-6">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${modeColor}`}
          >
            <ModeIcon size={24} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[var(--app-text)]">
              {title}
            </h3>
            <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
              {description} {mode === "check-out" ? `قبل ${checkoutWarningTime} سيظهر تأكيد انصراف مبكر.` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Camera View */}
        <div className="relative mb-4 overflow-hidden rounded-2xl border border-[var(--app-border-soft)] bg-slate-900">
          {scanning ? (
            <video
              ref={videoRef}
              className="h-[300px] w-full object-cover"
              playsInline
              muted
            />
          ) : (
            <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-slate-400">
              <Camera size={48} />
              <p className="text-sm font-bold">الكاميرا غير مفعّلة</p>
            </div>
          )}

          {/* Scanning overlay indicator */}
          {scanning && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 rounded-2xl border-2 border-emerald-400/60" />
            </div>
          )}

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 text-sm font-bold text-slate-700">
                <RefreshCw size={16} className="animate-spin" />
                جارٍ التسجيل...
              </div>
            </div>
          )}
        </div>

        {/* Camera Error */}
        {cameraError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            {cameraError}
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className={`mb-4 rounded-xl border p-4 ${
              result.ok
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <p
              className={`font-extrabold ${
                result.ok ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {result.message}
            </p>
            {result.ok && (
              <div className="mt-2 text-sm text-emerald-800">
                <p>
                  الطالب: <span className="font-bold">{result.studentName}</span>
                </p>
                <p>
                  الرمز: <span className="font-bold">{result.studentCode}</span>
                </p>
                {result.checkInAt && (
                  <p>
                    وقت الحضور:{" "}
                    <span className="font-bold">
                      {formatAttendanceTime(result.checkInAt)}
                    </span>
                  </p>
                )}
                {result.checkOutAt && (
                  <p>
                    وقت الانصراف:{" "}
                    <span className="font-bold">
                      {formatAttendanceTime(result.checkOutAt)}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Scan Error */}
        {error && !result?.ok && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {!scanning ? (
            <button
              type="button"
              onClick={startCamera}
              className="btn btn-primary flex-1"
            >
              <Camera size={18} />
              تشغيل الكاميرا
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="btn btn-secondary flex-1"
            >
              إيقاف الكاميرا
            </button>
          )}

          {scanning && (
            <button
              type="button"
              onClick={() => {
                stopCamera();
                startCamera();
              }}
              className="btn btn-secondary"
            >
              <RefreshCw size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
