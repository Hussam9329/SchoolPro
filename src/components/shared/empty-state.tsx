import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  Landmark,
  Plus,
  Receipt,
  School,
  SearchX,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { NavigationIcon } from "@/lib/navigation";

type EmptyStateIcon =
  | NavigationIcon
  | "search"
  | "file"
  | "plus";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: EmptyStateIcon;
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
};

const iconMap: Record<EmptyStateIcon, React.ElementType> = {
  dashboard: School,
  book: BookOpen,
  classes: Landmark,
  teachers: GraduationCap,
  students: Users,
  schedule: CalendarDays,
  attendance: ClipboardList,
  grades: ClipboardList,
  fees: Receipt,
  payments: Receipt,
  reports: FileText,
  settings: Settings,
  permissions: ShieldCheck,
  search: SearchX,
  file: FileText,
  plus: Plus,
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon = "file",
  secondaryLabel,
  secondaryHref,
  className,
}: EmptyStateProps) {
  const Icon = iconMap[icon];

  return (
    <section
      className={[
        "app-card flex min-h-[320px] flex-col items-center justify-center px-6 py-10 text-center",
        className ?? "",
      ].join(" ")}
    >
      <div className="relative mb-6">
        {/* Decorative background circles */}
        <div className="absolute inset-0 -m-4 rounded-full bg-indigo-200/30 blur-2xl" />
        <div className="absolute inset-0 -m-2 rounded-full bg-amber-200/20 blur-xl" />

        <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-amber-100 text-indigo-700 shadow-[var(--shadow-soft)] animate-pulse-soft">
          <Icon size={34} />
        </div>
      </div>

      <h3 className="max-w-xl text-xl font-extrabold text-[var(--app-text)]">
        {title}
      </h3>

      <p className="mt-3 max-w-2xl text-sm leading-8 text-[var(--app-text-muted)]">
        {description}
      </p>

      {(actionLabel && actionHref) || (secondaryLabel && secondaryHref) ? (
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {actionLabel && actionHref ? (
            <Link href={actionHref} className="btn btn-primary">
              <Plus size={18} />
              {actionLabel}
            </Link>
          ) : null}

          {secondaryLabel && secondaryHref ? (
            <Link href={secondaryHref} className="btn btn-secondary">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type CompactEmptyStateProps = {
  title: string;
  description?: string;
  icon?: EmptyStateIcon;
  className?: string;
};

export function CompactEmptyState({
  title,
  description,
  icon = "search",
  className,
}: CompactEmptyStateProps) {
  const Icon = iconMap[icon];

  return (
    <div
      className={[
        "flex items-center gap-3 rounded-2xl border border-[var(--app-border-soft)] bg-white p-4",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-600">
        <Icon size={20} />
      </div>

      <div className="min-w-0">
        <p className="font-extrabold text-[var(--app-text)]">{title}</p>

        {description ? (
          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
