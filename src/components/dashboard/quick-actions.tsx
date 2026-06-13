import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  Landmark,
  Receipt,
  Users,
} from "lucide-react";
import {
  primaryQuickActions,
  type NavigationIcon,
} from "@/lib/navigation";

const quickActionIcons: Partial<Record<NavigationIcon, React.ElementType>> = {
  book: BookOpen,
  classes: Landmark,
  teachers: GraduationCap,
  students: Users,
  attendance: CalendarCheck,
  grades: ClipboardList,
  fees: Receipt,
  reports: BarChart3,
};

export function QuickActions() {
  return (
    <div className="app-card p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-[var(--app-text)]">
            الانتقال السريع
          </h3>

          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            أهم الأعمال اليومية في مكان واحد حتى لا يضيع المستخدم بين الصفحات.
          </p>
        </div>

        <span className="badge badge-success w-fit">اختصارات</span>
      </div>

      <div className="quick-grid">
        {primaryQuickActions.map((action) => {
          const Icon = quickActionIcons[action.icon] ?? BookOpen;

          return (
            <Link
              key={action.title}
              href={action.href}
              className="group relative overflow-hidden rounded-3xl border border-[var(--app-border-soft)] bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_8px_24px_rgba(99,102,241,0.1),0_4px_12px_rgba(99,102,241,0.06)]"
            >
              {/* Gradient border on hover - top accent */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-l from-indigo-400 to-amber-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-amber-100 text-indigo-700 transition-all duration-200 group-hover:bg-gradient-to-br group-hover:to-indigo-500 group-hover:to-amber-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-500/20">
                  <Icon size={22} />
                </div>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-500 transition group-hover:bg-indigo-50 group-hover:text-indigo-600">
                  فتح
                </span>
              </div>

              <h4 className="font-extrabold text-[var(--app-text)]">
                {action.title}
              </h4>

              <p className="mt-2 text-sm leading-7 text-[var(--app-text-muted)]">
                {action.hint}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 rounded-3xl border border-indigo-100 bg-gradient-to-l to-indigo-50/80 to-amber-50/60 p-4">
        <p className="text-sm font-extrabold text-indigo-800">
          نصيحة لتجربة أفضل
        </p>

        <p className="mt-2 text-sm leading-7 text-indigo-700">
          استخدم الاختصارات حسب الترتيب: مادة، صف، مدرس، طالب. بعدها يصبح
          تسجيل الحضور والدرجات أسهل بكثير.
        </p>
      </div>
    </div>
  );
}
