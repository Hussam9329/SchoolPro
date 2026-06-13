"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-8 text-center shadow-xl shadow-red-100/20">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-red-100 to-indigo-100 text-red-600">
          <AlertTriangle size={32} />
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900">
          حدث خطأ غير متوقع
        </h2>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          عذرًا، لم يتم تحميل هذه الصفحة بشكل صحيح. قد يكون السبب مشكلة في
          الاتصال بمصدر البيانات أو خطأ مؤقت في الخادم.
        </p>

        {error?.message && (
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 ltr:text-left rtl:text-right" dir="ltr">
            {error.message}
          </p>
        )}

        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-indigo-700 to-amber-600 px-6 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/25 transition hover:from-indigo-800 hover:to-amber-700 hover:shadow-xl"
        >
          <RefreshCw size={18} />
          إعادة المحاولة
        </button>

        <p className="mt-5 text-xs text-slate-400">
          إذا استمرت المشكلة، حاول تحديث الصفحة أو العودة للصفحة الرئيسية.
        </p>
      </div>
    </div>
  );
}
