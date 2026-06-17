import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  Landmark,
  Plus,
  Receipt,
  School,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { NavigationIcon } from "@/lib/navigation";

type PageHeaderProps = {
  title: string;
  description?: string;
  icon?: NavigationIcon;
  badge?: string;
  actionLabel?: string;
  actionHref?: string;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
};

const iconMap: Record<NavigationIcon, React.ElementType> = {
  dashboard: School,
  book: BookOpen,
  classes: Landmark,
  teachers: GraduationCap,
  students: Users,
  schedule: CalendarDays,
  attendance: CheckSquare,
  grades: ClipboardList,
  fees: Receipt,
  payments: CreditCard,
  reports: FileText,
  settings: Settings,
  permissions: ShieldCheck,
};

export function PageHeader({
  title,
  description,
  icon = "dashboard",
  badge,
  actionLabel,
  actionHref,
  backHref,
  backLabel = "رجوع",
  children,
}: PageHeaderProps) {
  const Icon = iconMap[icon];

  return (
    <section className="app-card overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-teal-400 via-sky-300 to-teal-400" />
      <div className="pointer-events-none absolute left-0 top-0 h-32 w-32 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-900/20" />

      <div className="relative flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="hidden h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[22px] border border-teal-100 bg-gradient-to-br from-teal-50 to-sky-50 text-teal-700 shadow-sm sm:flex dark:border-teal-900/50 dark:from-teal-950/30 dark:to-sky-950/20 dark:text-teal-200">
            <Icon size={27} />
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {backHref ? (
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-white/80 px-3 py-1.5 text-xs font-black text-[var(--app-text-muted)] transition hover:border-teal-200 hover:bg-teal-50 hover:text-[var(--primary)] dark:bg-[var(--color-app-card)] dark:hover:bg-teal-950/30"
                >
                  <ArrowRight size={14} />
                  {backLabel}
                </Link>
              ) : null}

              {badge ? (
                <span className="badge badge-info">{badge}</span>
              ) : null}
            </div>

            <h2 className="app-title">{title}</h2>

            {description ? (
              <p className="app-subtitle mt-2 max-w-3xl">{description}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
          {children}

          {actionLabel && actionHref ? (
            <Link href={actionHref} className="btn btn-primary">
              <Plus size={18} />
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

type SimplePageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function SimplePageHeader({
  title,
  description,
  action,
}: SimplePageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-[var(--app-text)]">
          {title}
        </h2>

        {description ? (
          <p className="mt-2 text-sm leading-7 text-[var(--app-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
