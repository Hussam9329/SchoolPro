import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "تسجيل الدخول",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-amber-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-900/20" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-900/20" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/20 blur-3xl dark:bg-indigo-800/10" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & School Name */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-amber-600 shadow-xl shadow-indigo-500/25">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            SchoolPro
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            ثانوية SchoolPro الأهلية
          </p>
        </div>

        {/* Login Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-8 shadow-xl shadow-indigo-100/30 dark:border-slate-700/60 dark:bg-slate-800/80 dark:shadow-indigo-900/20">
          {/* Gradient border effect at top */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l to-indigo-500 via-amber-500 to-indigo-500" />

          <LoginForm />

          {/* Footer */}
          <div className="mt-6 border-t border-slate-100 pt-5 text-center dark:border-slate-700/60">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              نظام إدارة ثانوية SchoolPro الأهلية © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
