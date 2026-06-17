"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  GraduationCap,
  Home,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Receipt,
  School,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  X,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  navigationGroups,
  orderedNavigationItems,
  type NavigationGroup,
  type NavigationIcon,
} from "@/lib/navigation";
import { useTheme } from "@/components/layout/theme-provider";

type AppShellProps = {
  children: React.ReactNode;
};

const iconMap: Record<NavigationIcon, React.ElementType> = {
  dashboard: LayoutDashboard,
  book: BookOpen,
  classes: Landmark,
  teachers: GraduationCap,
  students: Users,
  schedule: CalendarDays,
  attendance: CheckSquare,
  grades: ClipboardList,
  fees: Receipt,
  payments: Receipt,
  reports: BarChart3,
  settings: ShieldCheck,
  permissions: ShieldCheck,
};

const groupOrder: NavigationGroup[] = [
  "overview",
  "foundation",
  "people",
  "operations",
  "results",
  "system",
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const currentPage = useMemo(() => {
    return (
      orderedNavigationItems.find((item) => {
        if (item.href === "/") {
          return pathname === "/";
        }

        return pathname.startsWith(item.href);
      }) ?? orderedNavigationItems[0]
    );
  }, [pathname]);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      <MemoizedMobileSidebarBackdrop
        isOpen={isMobileSidebarOpen}
        onClose={closeMobileSidebar}
      />

      <aside
        className={[
          "fixed right-0 top-0 z-50 h-screen w-[310px] p-3 transition-transform duration-300 sm:p-4",
          isMobileSidebarOpen ? "translate-x-0" : "translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="relative h-full overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-[#073b37] via-[#082f2c] to-[#051f1d] text-[var(--color-sidebar-text)] shadow-[var(--shadow-sidebar)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_40%_0%,rgba(125,211,252,0.18),transparent_45%)]" />
          <div className="pointer-events-none absolute -left-24 top-28 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-12 h-56 w-56 rounded-full bg-teal-300/10 blur-3xl" />

          <MemoizedSidebarContent
            pathname={pathname}
            onNavigate={closeMobileSidebar}
          />
        </div>
      </aside>

      <div className="min-h-screen lg:pr-[310px]">
        <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 lg:px-8 lg:pt-5">
          <div className="glass relative overflow-hidden rounded-[24px] border border-white/70 shadow-[0_18px_50px_rgba(15,118,110,0.08)] dark:border-white/10">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-teal-300/60 to-transparent" />

            <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-5 lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className="btn btn-secondary h-11 w-11 p-0 lg:hidden"
                  aria-label="فتح القائمة"
                  onClick={() => setIsMobileSidebarOpen(true)}
                >
                  <Menu size={20} />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-sky-500 text-white shadow-lg shadow-teal-700/20">
                      <Home size={18} />
                    </span>
                    <div className="min-w-0">
                      <h1 className="truncate text-lg font-black tracking-tight text-[var(--app-text)] sm:text-xl">
                        {currentPage.title}
                      </h1>
                      <p className="mt-1 hidden max-w-[760px] truncate text-sm leading-6 text-[var(--app-text-muted)] md:block">
                        {currentPage.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MemoizedTopbarSearch />

                <MemoizedThemeToggle />

                <a
                  href="/logout"
                  className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-white/80 text-[var(--app-text-muted)] shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 md:inline-flex dark:bg-[var(--color-app-card)] dark:hover:border-red-500/50 dark:hover:bg-red-950/20 dark:hover:text-red-300"
                  aria-label="تسجيل الخروج"
                  title="تسجيل الخروج"
                >
                  <LogOut size={18} />
                </a>

                <div className="hidden items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-white/80 px-3 py-2 shadow-sm lg:flex dark:bg-[var(--color-app-card)]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-sky-500 text-white shadow-md shadow-teal-700/20">
                    <School size={18} />
                  </div>

                  <div className="leading-none">
                    <p className="text-sm font-black text-[var(--app-text)]">
                      SchoolPro
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-text-muted)]">
                      ثانوية SchoolPro الأهلية
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="animate-soft-in px-4 pb-8 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">
          {children}
        </main>
      </div>
    </div>
  );
}

type SidebarContentProps = {
  pathname: string;
  onNavigate: () => void;
};

const SidebarContent = memo(function SidebarContent({ pathname, onNavigate }: SidebarContentProps) {
  return (
    <div className="relative flex h-full flex-col">
      <div className="relative px-5 pb-5 pt-6">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-3 outline-none transition hover:bg-white/[0.10]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-sky-400 text-white shadow-lg shadow-teal-950/30">
            <School size={24} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-lg font-black text-white">
              SchoolPro
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-teal-100/80">
              تجربة إدارية هادئة ومنظمة
            </p>
          </div>
        </Link>
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-5">
          {groupOrder.map((group) => {
            const items = orderedNavigationItems.filter(
              (item) => item.group === group,
            );

            if (items.length === 0) {
              return null;
            }

            return (
              <div key={group}>
                <div className="mb-2 flex items-center gap-2 px-3">
                  <span className="h-px flex-1 bg-white/10" />
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-100/60">
                    {navigationGroups[group].title}
                  </p>
                </div>

                <div className="space-y-1.5">
                  {items.map((item) => {
                    const Icon = iconMap[item.icon];
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={true}
                        onClick={onNavigate}
                        className={[
                          "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-extrabold transition-all duration-200",
                          isActive
                            ? "bg-white text-teal-950 shadow-lg shadow-slate-950/15"
                            : "text-teal-50/85 hover:bg-white/[0.08] hover:text-white",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                            isActive
                              ? "bg-gradient-to-br from-teal-500 to-sky-500 text-white shadow-sm"
                              : "bg-white/[0.07] text-teal-100/70 group-hover:bg-white/[0.12] group-hover:text-white",
                          ].join(" ")}
                        >
                          <Icon size={18} />
                        </span>

                        <span className="min-w-0 flex-1 truncate">
                          {item.title}
                        </span>

                        {item.isPrimary ? (
                          <span
                            className={[
                              "rounded-full px-2 py-1 text-[10px] font-black",
                              isActive
                                ? "bg-teal-50 text-teal-700"
                                : "bg-white/10 text-white",
                            ].join(" ")}
                          >
                            رئيسية
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="relative p-4">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-inner shadow-white/5">
          <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-l from-transparent via-sky-200/60 to-transparent" />

          <div className="relative">
            <div className="mb-3 flex items-center gap-2 text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-sky-100">
                <Sparkles size={16} />
              </span>
              <p className="text-sm font-black">نمط العمل المثالي</p>
            </div>

            <p className="relative text-xs leading-6 text-teal-50/70">
              ابدأ بالمواد والصفوف، ثم اربط المدرسين والطلاب. هذا الترتيب يقلل الأخطاء ويجعل كل شاشة أوضح.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});
const MemoizedSidebarContent = SidebarContent;

type GlobalSearchResult = {
  type: string;
  title: string;
  subtitle?: string;
  href: string;
};

const TopbarSearch = memo(function TopbarSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        const payload = await response.json();
        setResults(payload.ok ? payload.data ?? [] : []);
        setOpen(true);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div className="relative hidden min-w-[340px] items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-white/78 px-3 py-2 shadow-sm backdrop-blur-sm xl:flex dark:bg-[var(--color-app-card)]">
      <Search size={18} className="text-[var(--app-text-soft)]" />

      <input
        id="global-search"
        name="global-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder="ابحث عن طالب، صف، مدرس..."
        className="h-8 min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-soft)]"
        autoComplete="off"
      />

      <span className="rounded-xl border border-teal-100 bg-teal-50 px-2.5 py-1 text-[10px] font-black text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-200">
        بحث
      </span>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-3xl border border-[var(--app-border-soft)] bg-white shadow-2xl shadow-teal-900/10 dark:bg-[var(--color-app-card)]">
          {results.length === 0 ? (
            <div className="p-4 text-sm font-bold text-[var(--app-text-muted)]">لا توجد نتائج سريعة.</div>
          ) : (
            results.map((result, index) => (
              <Link
                key={`${result.href}-${index}`}
                href={result.href}
                className="block border-b border-[var(--app-border-soft)] px-4 py-3 text-sm transition last:border-0 hover:bg-teal-50 dark:hover:bg-teal-950/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black text-[var(--app-text)]">{result.title}</span>
                  <span className="rounded-full bg-[var(--app-card-soft)] px-2 py-1 text-[10px] font-bold text-[var(--app-text-muted)]">{result.type}</span>
                </div>
                {result.subtitle ? <p className="mt-1 text-xs text-[var(--app-text-muted)]">{result.subtitle}</p> : null}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
});
const MemoizedTopbarSearch = TopbarSearch;

type MobileSidebarBackdropProps = {
  isOpen: boolean;
  onClose: () => void;
};

const MobileSidebarBackdrop = memo(function MobileSidebarBackdrop({
  isOpen,
  onClose,
}: MobileSidebarBackdropProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden">
      <button
        type="button"
        className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-xl dark:bg-[var(--color-app-card)] dark:text-slate-200"
        aria-label="إغلاق القائمة"
        onClick={onClose}
      >
        <X size={20} />
      </button>
    </div>
  );
});
const MemoizedMobileSidebarBackdrop = MobileSidebarBackdrop;

const ThemeToggle = memo(function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";

  if (!mounted) {
    return (
      <button
        type="button"
        className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-white/80 text-[var(--app-text-muted)] md:inline-flex dark:bg-[var(--color-app-card)]"
        aria-label="تبديل الثيم"
        suppressHydrationWarning
      >
        <Moon size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-white/80 text-[var(--app-text-muted)] shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-[var(--color-primary)] md:inline-flex dark:bg-[var(--color-app-card)] dark:hover:border-teal-700/60 dark:hover:bg-teal-950/30 dark:hover:text-teal-200"
      aria-label={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
      title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
      onClick={toggleTheme}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
});
const MemoizedThemeToggle = ThemeToggle;
