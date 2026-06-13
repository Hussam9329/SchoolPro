"use client";

import { useState } from "react";

export function LoginForm() {
  const [error, setError] = useState<string | undefined>();
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const rememberMe = formData.get("rememberMe") === "on";

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "حدث خطأ أثناء تسجيل الدخول.");
        return;
      }

      // Success - redirect to dashboard
      window.location.href = "/";
    } catch {
      setError("تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-gradient-to-l from-red-50 to-indigo-50 p-4 dark:border-red-800/40 dark:from-red-950/30 dark:to-indigo-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <p className="text-sm font-bold text-red-700 dark:text-red-400">
              {error}
            </p>
          </div>
        </div>
      ) : null}

      {/* Username Field */}
      <div>
        <label
          htmlFor="username"
          className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
        >
          اسم المستخدم
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoFocus
          placeholder="أدخل اسم المستخدم"
          className="input pr-4"
          dir="ltr"
          disabled={isPending}
        />
      </div>

      {/* Password Field */}
      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
        >
          كلمة المرور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="أدخل كلمة المرور"
          className="input pr-4"
          dir="ltr"
          disabled={isPending}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--app-border-soft)] bg-[var(--app-card-soft)] p-4 transition hover:border-indigo-200">
        <input
          name="rememberMe"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-[var(--app-border)] accent-indigo-700"
          disabled={isPending}
        />
        <span>
          <span className="block text-sm font-extrabold text-[var(--app-text)]">
            تذكرني
          </span>
          <span className="mt-1 block text-xs leading-6 text-[var(--app-text-muted)]">
            إبقاء الجلسة مفتوحة لمدة أطول حتى لا تحتاج إلى تكرار إدخال كلمة المرور كثيرًا على نفس الجهاز.
          </span>
        </span>
      </label>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="btn btn-primary w-full text-base"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            جارٍ الدخول...
          </span>
        ) : (
          "دخول المدير"
        )}
      </button>
    </form>
  );
}
