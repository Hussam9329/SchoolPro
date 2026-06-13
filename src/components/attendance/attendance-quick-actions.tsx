"use client";

import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ClipboardList,
  LogOut,
  RefreshCw,
  XCircle,
} from "lucide-react";

type AttendanceQuickActionsProps = {
  today: string;
  activeDate?: string;
  activeStatus?: string;
  missingCheckOut?: string;
  showAllRequested?: boolean;
  todayAbsentCount: number;
  todayLateCount: number;
  todayPresentCount: number;
  todayMissingCheckOutCount: number;
};

export function AttendanceQuickActions({
  today,
  activeDate,
  activeStatus,
  missingCheckOut,
  showAllRequested = false,
  todayAbsentCount,
  todayLateCount,
  todayPresentCount,
  todayMissingCheckOutCount,
}: AttendanceQuickActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const activeKey = useMemo(() => {
    if (showAllRequested) return "all";
    if (activeDate === today && missingCheckOut === "yes") return "missing";
    if (activeDate === today && activeStatus) return activeStatus;
    return "";
  }, [activeDate, activeStatus, missingCheckOut, showAllRequested, today]);

  const items = [
    {
      key: "absent",
      href: `/attendance?date=${today}&status=absent`,
      label: "الغائبون اليوم",
      count: todayAbsentCount,
      icon: XCircle,
      className: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
      activeClassName: "border-red-500 bg-red-600 text-white shadow-md shadow-red-100",
    },
    {
      key: "present",
      href: `/attendance?date=${today}&status=present`,
      label: "الحاضرون اليوم",
      count: todayPresentCount,
      icon: CheckCircle2,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
      activeClassName: "border-emerald-500 bg-emerald-600 text-white shadow-md shadow-emerald-100",
    },
    {
      key: "late",
      href: `/attendance?date=${today}&status=late`,
      label: "المتأخرون اليوم",
      count: todayLateCount,
      icon: Clock,
      className: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
      activeClassName: "border-amber-500 bg-amber-600 text-white shadow-md shadow-amber-100",
    },
    {
      key: "missing",
      href: `/attendance?date=${today}&missingCheckOut=yes`,
      label: "لم ينصرفوا اليوم",
      count: todayMissingCheckOutCount,
      icon: LogOut,
      className: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
      activeClassName: "border-rose-500 bg-rose-600 text-white shadow-md shadow-rose-100",
    },
    {
      key: "all",
      href: "/attendance?view=all",
      label: "عرض كل السجلات",
      count: undefined,
      icon: ClipboardList,
      className: "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
      activeClassName: "border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-100",
    },
    {
      key: "clear",
      href: "/attendance",
      label: "إخفاء التفاصيل",
      count: undefined,
      icon: CalendarDays,
      className: "border-slate-200 bg-white text-[var(--app-text-muted)] hover:bg-slate-50",
      activeClassName: "border-slate-300 bg-slate-100 text-[var(--app-text)]",
    },
  ];

  return (
    <div className="app-card p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-extrabold text-[var(--app-text)]">
            أزرار الحضور السريعة
          </h3>
          <p className="text-xs font-bold text-[var(--app-text-muted)]">
            اضغط على أي زر لتحميل بياناته فقط، بدون تحميل كل السجلات مقدمًا.
          </p>
        </div>
        {isPending ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700">
            <RefreshCw size={14} className="animate-spin" />
            جارٍ التحميل
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => startTransition(() => router.push(item.href))}
              disabled={isPending || isActive}
              aria-pressed={isActive}
              className={[
                "flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-extrabold transition active:scale-[0.98] disabled:cursor-default disabled:opacity-90",
                isActive ? item.activeClassName : item.className,
              ].join(" ")}
            >
              <Icon size={17} />
              <span className="truncate">{item.label}</span>
              {item.count !== undefined ? (
                <span
                  className={[
                    "inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-xs font-extrabold",
                    isActive ? "bg-white/20 text-white" : "bg-white text-[var(--app-text)]",
                  ].join(" ")}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
