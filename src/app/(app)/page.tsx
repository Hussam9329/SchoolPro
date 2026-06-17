import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  Clock3,
  GraduationCap,
  Receipt,
  School,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { requireAdmin } from "@/lib/auth";
import { getDashboardStats } from "@/services/dashboard-service";
import { formatMoney } from "@/types/payment";

export const dynamic = "force-dynamic";



const setupSteps = [
  {
    title: "أضف المواد الدراسية",
    description: "المواد هي الأساس قبل ربط المدرسين والدرجات.",
    status: "ابدأ هنا",
    active: true,
  },
  {
    title: "أنشئ الصفوف والشُعب",
    description: "حتى تتمكن من توزيع الطلاب وتنظيم الحضور.",
    status: "بعد المواد",
  },
  {
    title: "أضف المدرسين",
    description: "اربط المدرسين بالمواد والصفوف المناسبة.",
    status: "بعد الصفوف",
  },
  {
    title: "أضف الطلاب",
    description: "أدخل الطلاب واربط كل طالب بصفه وشعبته.",
    status: "بعد الصفوف",
  },
];

const recentActivities = [
  {
    title: "التوجيه الذكي مفعّل",
    description: "سيظهر للمستخدم ترتيب العمل الصحيح داخل النظام.",
    time: "الآن",
    icon: Clock3,
  },
];

export default async function DashboardPage() {
  await requireAdmin();

  const stats = await getDashboardStats();

  const dashboardStats = [
    {
      title: "إجمالي الطلاب",
      value: String(stats.studentsTotal),
      description: "طالب مسجل في النظام",
      icon: Users,
      tone: "blue",
    },
    {
      title: "المدرسين",
      value: String(stats.teachersTotal),
      description: "مدرس جاهز للتوزيع",
      icon: GraduationCap,
      tone: "green",
    },
    {
      title: "الصفوف والشُعب",
      value: String(stats.classesTotal + stats.sectionsTotal),
      description: `${stats.classesTotal} صف و ${stats.sectionsTotal} شعبة`,
      icon: School,
      tone: "teal",
    },
    {
      title: "حضور اليوم",
      value: `${stats.todayAttendanceRate}%`,
      description: "نسبة الحضور المسجلة اليوم",
      icon: CalendarCheck,
      tone: "emerald",
    },
    {
      title: "داخل بناية المدرسة",
      value: String(stats.insideSchoolNow),
      description: "طلاب سجلوا دخولًا ولم ينصرفوا بعد",
      icon: ShieldCheck,
      tone: "green",
    },
    {
      title: "الدرجات المدخلة",
      value: String(stats.gradesThisMonth),
      description: "درجة محفوظة هذا الشهر",
      icon: BarChart3,
      tone: "violet",
    },
    {
      title: "الأقساط المستلمة",
      value: formatMoney(stats.totalPaid),
      description: "إجمالي المدفوعات المسجلة",
      icon: Receipt,
      tone: "sky",
    },
    {
      title: "جاهزية النظام",
      value: `${stats.readinessRate}%`,
      description: "اكتملت خطوات التأسيس",
      icon: TrendingUp,
      tone: "cyan",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          {/* Hero card with gradient border effect */}
          <div className="relative overflow-hidden rounded-[var(--radius-lg)] p-px">
            <div className="absolute inset-0 bg-gradient-to-l from-teal-500/20 via-sky-500/10 to-teal-500/20" />
            <div className="app-card relative p-6 sm:p-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-gradient-to-l from-teal-50 to-sky-50 px-3 py-2 text-xs font-extrabold text-teal-700">
                    <span className="h-2 w-2 rounded-full bg-gradient-to-r from-teal-500 to-sky-500" />
                    نظام إدارة ثانوية SchoolPro
                  </div>

                  <h2 className="app-title">
                    أهلًا بك في لوحة تحكم SchoolPro
                  </h2>

                  <p className="app-subtitle mt-3 max-w-3xl">
                    هذه هي نقطة البداية. من هنا تستطيع متابعة الإحصائيات، معرفة
                    الخطوة التالية، والانتقال بسرعة إلى أهم أعمال المدرسة اليومية.
                  </p>
                </div>

                {/* Suggested step - dramatic gradient card */}
                <div className="relative overflow-hidden rounded-3xl border border-teal-300/30 bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 p-5 text-white shadow-xl shadow-teal-900/20 lg:min-w-[260px]">
                  {/* Decorative circles */}
                  <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-white/[0.06]" />
                  <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-white/[0.04]" />

                  <div className="relative">
                    <p className="text-sm font-bold text-teal-200">
                      الخطوة المقترحة الآن
                    </p>

                    <h3 className="mt-3 text-xl font-extrabold">
                      أضف المواد الدراسية أولًا
                    </h3>

                    <p className="mt-2 text-sm leading-7 text-teal-100">
                      لأن المدرسين والدرجات والجدول يعتمدون عليها لاحقًا.
                    </p>

                    <a
                      href="/subjects"
                      className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-white px-5 text-sm font-extrabold text-teal-700 shadow-lg shadow-teal-900/20 transition hover:bg-teal-50 hover:shadow-xl"
                    >
                      إضافة أول مادة
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning card */}
          <div className="app-card p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-orange-100 text-sky-700">
                <AlertTriangle size={22} />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-[var(--app-text)]">
                  تنبيه مهم للمستخدم
                </h3>

                <p className="mt-2 text-sm leading-7 text-[var(--app-text-muted)]">
                  لا تضف الطلاب قبل إنشاء الصفوف والشُعب. الترتيب الصحيح يجعل
                  النظام أسهل وأسرع ويمنع الأخطاء لاحقًا.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="stat-grid">
          {dashboardStats.map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
              tone={stat.tone}
            />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <QuickActions />

          <div className="app-card p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-extrabold text-[var(--app-text)]">
                  دليل التأسيس السريع
                </h3>

                <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
                  اتبع هذه الخطوات بالترتيب حتى تبني النظام بدون ارتباك.
                </p>
              </div>

              <span className="badge badge-info">إرشاد</span>
            </div>

            <div className="space-y-3">
              {setupSteps.map((step, index) => (
                <div
                  key={step.title}
                  className={[
                    "flex gap-4 rounded-2xl border p-4 transition",
                    step.active
                      ? "border-teal-200 bg-gradient-to-l from-teal-50/80 from-sky-50/50"
                      : "border-[var(--app-border-soft)] bg-[var(--color-app-card)]",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold",
                      step.active
                        ? "bg-gradient-to-br from-teal-500 to-sky-600 text-white shadow-md shadow-teal-500/25"
                        : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-extrabold text-[var(--app-text)]">
                        {step.title}
                      </h4>

                      <span
                        className={[
                          "badge",
                          step.active ? "badge-info" : "bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        {step.status}
                      </span>
                    </div>

                    <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="app-card p-6">
            <div className="mb-5">
              <h3 className="text-xl font-extrabold text-[var(--app-text)]">
                آخر النشاطات
              </h3>

              <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
                هنا تظهر آخر العمليات المهمة داخل النظام.
              </p>
            </div>

            <div className="space-y-3">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;

                return (
                  <div
                    key={activity.title}
                    className="flex items-start gap-3 rounded-2xl border border-[var(--app-border-soft)] bg-[var(--color-app-card)] p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700">
                      <Icon size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="font-extrabold text-[var(--app-text)]">
                          {activity.title}
                        </h4>

                        <span className="text-xs font-bold text-[var(--app-text-soft)]">
                          {activity.time}
                        </span>
                      </div>

                      <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="app-card overflow-hidden">
            <div className="border-b border-[var(--app-border-soft)] p-6">
              <h3 className="text-xl font-extrabold text-[var(--app-text)]">
                حالة النظام اليوم
              </h3>

              <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
                ملخص مبسط يساعد المستخدم يعرف شنو ناقص بدون تعقيد.
              </p>
            </div>

            <div className="grid gap-0 sm:grid-cols-2">
              <StatusTile
                label="التأسيس"
                value="غير مكتمل"
                description="ابدأ بالمواد والصفوف"
                tone="warning"
              />

              <StatusTile
                label="الحضور"
                value="لم يسجل بعد"
                description="يحتاج طلاب داخل صفوف"
                tone="info"
              />

              <StatusTile
                label="الدرجات"
                value="بانتظار المواد"
                description="أضف المواد أولًا"
                tone="info"
              />

              <StatusTile
                label="الأقساط"
                value="بانتظار الطلاب"
                description="أضف الطلاب ثم الأقساط"
                tone="success"
              />
            </div>
          </div>
        </section>
      </div>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  tone: string;
};

function StatCard({ title, value, description, icon: Icon, tone }: StatCardProps) {
  const toneClass = getToneClass(tone);
  const toneBorderClass = getToneBorderClass(tone);

  return (
    <article className="app-card app-card-hover relative overflow-hidden p-5">
      {/* Top gradient border */}
      <div className={`absolute inset-x-0 top-0 h-1 ${toneBorderClass}`} />
      {/* Decorative circle */}
      <div className={`absolute -left-6 -top-6 h-20 w-20 rounded-full opacity-[0.06] ${toneBorderClass}`} />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--app-text-muted)]">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--app-text)]">
            {value}
          </h3>

          <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
            {description}
          </p>
        </div>

        <div
          className={[
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
            toneClass,
          ].join(" ")}
        >
          <Icon size={22} />
        </div>
      </div>
    </article>
  );
}

type StatusTileProps = {
  label: string;
  value: string;
  description: string;
  tone: "success" | "warning" | "info";
};

function StatusTile({ label, value, description, tone }: StatusTileProps) {
  const badgeClass =
    tone === "success"
      ? "badge-success"
      : tone === "warning"
        ? "badge-warning"
        : "badge-info";

  const bgClass =
    tone === "success"
      ? "bg-gradient-to-br from-emerald-50/60 to-teal-50/40"
      : tone === "warning"
        ? "bg-gradient-to-br from-sky-50/60 to-orange-50/40"
        : "bg-gradient-to-br from-teal-50/60 to-sky-50/40";

  return (
    <div className={`border-b border-l border-[var(--app-border-soft)] p-5 ${bgClass}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-[var(--app-text-muted)]">{label}</p>
        <span className={["badge", badgeClass].join(" ")}>{value}</span>
      </div>

      <p className="text-sm leading-7 text-[var(--app-text-muted)]">
        {description}
      </p>
    </div>
  );
}

function getToneClass(tone: string) {
  const tones: Record<string, string> = {
    blue: "bg-gradient-to-br from-blue-100 to-teal-100 text-blue-700",
    green: "bg-gradient-to-br from-green-100 to-emerald-100 text-green-700",
    teal: "bg-gradient-to-br from-teal-100 to-sky-100 text-teal-700",
    emerald: "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700",
    violet: "bg-gradient-to-br from-sky-100 to-teal-100 text-teal-700",
    sky: "bg-gradient-to-br from-sky-100 to-orange-100 text-sky-700",
    rose: "bg-gradient-to-br from-teal-100 to-teal-100 text-teal-700",
    cyan: "bg-gradient-to-br from-cyan-100 to-sky-100 text-cyan-700",
  };

  return tones[tone] ?? tones.blue;
}

function getToneBorderClass(tone: string) {
  const tones: Record<string, string> = {
    blue: "bg-gradient-to-l from-blue-400 to-teal-400",
    green: "bg-gradient-to-l from-green-400 to-emerald-400",
    teal: "bg-gradient-to-l from-teal-400 to-sky-400",
    emerald: "bg-gradient-to-l from-emerald-400 to-teal-400",
    violet: "bg-gradient-to-l from-sky-400 to-teal-400",
    sky: "bg-gradient-to-l from-sky-400 to-orange-400",
    rose: "bg-gradient-to-l from-teal-400 to-teal-400",
    cyan: "bg-gradient-to-l from-cyan-400 to-sky-400",
  };

  return tones[tone] ?? tones.blue;
}
