import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "تسجيل الدخول",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--app-bg)] p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-900/20" />
        <div className="absolute -bottom-32 -right-32 h-[30rem] w-[30rem] rounded-full bg-teal-200/50 blur-3xl dark:bg-teal-900/20" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60 blur-3xl dark:bg-teal-800/10" />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/70 bg-white/72 shadow-[0_30px_90px_rgba(15,118,110,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-[var(--color-app-card)] lg:grid-cols-[1fr_0.86fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#073b37] via-[#0f4d48] to-[#075985] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -left-20 top-12 h-64 w-64 rounded-full bg-sky-300/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-teal-200/15 blur-3xl" />

          <div className="relative">
            <div className="mb-8 inline-flex items-center gap-3 rounded-3xl border border-white/10 bg-white/10 p-3 shadow-inner shadow-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-black">SchoolPro</p>
                <p className="mt-1 text-xs font-semibold text-teal-50/70">
                  ثانوية SchoolPro الأهلية
                </p>
              </div>
            </div>

            <h1 className="max-w-md text-4xl font-black leading-tight tracking-tight">
              لوحة إدارة مدرسية هادئة، واضحة، وسريعة الاستخدام.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-8 text-teal-50/75">
              تصميم جديد يركز على راحة العين، وضوح الإجراءات، والوصول السريع للمهام اليومية بدون ازدحام بصري.
            </p>
          </div>

          <div className="relative grid grid-cols-3 gap-3 text-center">
            {[
              ["منظم", "تدفق واضح"],
              ["سريع", "تنقل مختصر"],
              ["مريح", "ألوان هادئة"],
            ].map(([title, text]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm font-black">{title}</p>
                <p className="mt-1 text-[11px] font-semibold text-teal-50/65">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 sm:p-8 lg:p-10">
          <div className="mb-8 text-center lg:text-right">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-600 to-sky-500 text-white shadow-xl shadow-teal-700/20 lg:mx-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5" />
              </svg>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-[var(--app-text)]">
              تسجيل دخول المدير
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--app-text-muted)]">
              أدخل بيانات الدخول للوصول إلى لوحة التحكم وإدارة المدرسة.
            </p>
          </div>

          <div className="rounded-[28px] border border-[var(--app-border-soft)] bg-white/80 p-6 shadow-sm dark:bg-[var(--color-app-card-soft)] sm:p-7">
            <LoginForm />

            <div className="mt-6 border-t border-[var(--app-border-soft)] pt-5 text-center">
              <p className="text-xs text-[var(--app-text-soft)]">
                نظام إدارة ثانوية SchoolPro الأهلية © {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
