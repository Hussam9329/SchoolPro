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
      <div className="flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-amber-600 text-white shadow-lg shadow-indigo-500/20 sm:flex">
            <Icon size={26} />
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {backHref ? (
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-white px-3 py-1.5 text-xs font-extrabold text-[var(--app-text-muted)] transition hover:border-indigo-200 hover:text-[var(--primary)] hover:shadow-sm hover:shadow-indigo-100/50"
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
        <h2 className="text-2xl font-extrabold tracking-tight text-[var(--app-text)]">
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
