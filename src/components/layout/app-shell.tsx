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
  Menu,
  LogOut,
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
          "fixed right-0 top-0 z-50 h-screen w-[292px] border-l border-white/[0.06] text-[var(--color-sidebar-text)] shadow-[var(--shadow-sidebar)] transition-transform duration-300",
          "bg-gradient-to-b from-[#0f172a] via-[#0c1524] to-[#080e1a]",
          isMobileSidebarOpen ? "translate-x-0" : "translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        {/* Subtle top glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-indigo-700/[0.08] to-transparent" />

        <MemoizedSidebarContent
          pathname={pathname}
          onNavigate={closeMobileSidebar}
        />
      </aside>

      <div className="min-h-screen lg:pr-[292px]">
        <header className="sticky top-0 z-40 border-b border-indigo-100/60 glass dark:border-indigo-900/60">
          {/* Subtle gradient border at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-indigo-200/50 to-transparent dark:via-indigo-700/20" />

          <div className="flex min-h-[74px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
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
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-700 to-amber-600 text-white shadow-md shadow-indigo-700/20">
                    <Home size={17} />
                  </span>
                  <h1 className="truncate text-lg font-extrabold text-[var(--app-text)] sm:text-xl">
                    {currentPage.title}
                  </h1>
                </div>

                <p className="mt-1 hidden max-w-[720px] truncate text-sm leading-6 text-[var(--app-text-muted)] md:block">
                  {currentPage.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MemoizedTopbarSearch />

              <MemoizedThemeToggle />

              <a
                href="/logout"
                className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--color-app-card)] text-[var(--app-text-muted)] transition hover:border-red-300 hover:text-red-500 hover:shadow-md hover:shadow-red-200/30 md:inline-flex dark:hover:border-red-500/50 dark:hover:shadow-red-500/20"
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
              >
                <LogOut size={18} />
              </a>

              <div className="hidden items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--color-app-card)] px-3 py-2 lg:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-700 to-amber-600 text-white shadow-md shadow-indigo-700/20">
                  <School size={18} />
                </div>

                <div className="leading-none">
                  <p className="text-sm font-extrabold text-[var(--app-text)]">
                    SchoolPro
                  </p>
                  <p className="mt-1 text-xs font-medium text-[var(--app-text-muted)]">
                    ثانوية SchoolPro الأهلية
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="animate-soft-in px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── Memoized Sub-Components ────────────────────────────────────

type SidebarContentProps = {
  pathname: string;
  onNavigate: () => void;
};

const SidebarContent = memo(function SidebarContent({ pathname, onNavigate }: SidebarContentProps) {
  return (
    <div className="relative flex h-full flex-col">
      <div className="relative border-b border-white/[0.06] px-5 py-5">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-2xl outline-none"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-700 to-amber-600 text-white shadow-lg shadow-indigo-700/30">
            <School size={24} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold text-white">
              SchoolPro
            </p>
            <p className="mt-1 truncate text-xs font-medium text-[var(--color-sidebar-muted)]">
              ثانوية SchoolPro الأهلية
            </p>
          </div>
        </Link>
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
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
                <div className="mb-2 px-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--color-sidebar-muted)]">
                    {navigationGroups[group].title}
                  </p>
                </div>

                <div className="space-y-1">
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
                          "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition-all duration-200",
                          isActive
                            ? "bg-gradient-to-l from-indigo-700 to-amber-600 text-white shadow-lg shadow-indigo-700/20"
                            : "text-[var(--color-sidebar-text)] hover:bg-white/[0.06] hover:text-white",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                            isActive
                              ? "bg-white/20 text-white shadow-sm"
                              : "bg-white/[0.06] text-[var(--color-sidebar-muted)] group-hover:bg-white/[0.1] group-hover:text-white",
                          ].join(" ")}
                        >
                          <Icon size={18} />
                        </span>

                        <span className="min-w-0 flex-1 truncate">
                          {item.title}
                        </span>

                        {item.isPrimary ? (
                          <span className="rounded-full bg-white/20 px-2 py-1 text-[10px] font-extrabold text-white">
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

      <div className="relative border-t border-white/[0.06] p-4">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4">
          {/* Shimmer border effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-l from-indigo-600/10 via-transparent to-amber-500/10 opacity-60" />

          <div className="relative">
            <div className="mb-3 flex items-center gap-2 text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600/30 to-amber-500/30 text-indigo-200">
                <Sparkles size={16} />
              </span>
              <p className="text-sm font-extrabold">تلميحة ذكية</p>
            </div>

            <p className="relative text-xs leading-6 text-[var(--color-sidebar-muted)]">
              اتبع الترتيب من الأعلى للأسفل: المواد، الصفوف، المدرسين، ثم الطلاب.
              هكذا يبقى النظام مرتبًا من أول يوم.
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
    }, 300); // Slightly increased debounce for less API calls

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div className="relative hidden min-w-[320px] items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-white/80 px-3 py-2 backdrop-blur-sm xl:flex">
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
        className="h-8 min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-soft)]"
        autoComplete="off"
      />

      <span className="rounded-lg border border-[var(--app-border)] bg-[var(--app-card-soft)] px-2 py-1 text-[10px] font-bold text-[var(--app-text-muted)]">
        بحث
      </span>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-[var(--app-border-soft)] bg-white shadow-xl">
          {results.length === 0 ? (
            <div className="p-4 text-sm font-bold text-[var(--app-text-muted)]">لا توجد نتائج سريعة.</div>
          ) : (
            results.map((result, index) => (
              <Link
                key={`${result.href}-${index}`}
                href={result.href}
                className="block border-b border-[var(--app-border-soft)] px-4 py-3 text-sm transition last:border-0 hover:bg-indigo-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-extrabold text-[var(--app-text)]">{result.title}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-[var(--app-text-muted)]">{result.type}</span>
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
    <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden">
      <button
        type="button"
        className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-xl dark:bg-slate-800 dark:text-slate-200"
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

  // During SSR and before mount, render a placeholder to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        type="button"
        className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--color-app-card)] text-[var(--app-text-muted)] md:inline-flex"
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
      className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--color-app-card)] text-[var(--app-text-muted)] transition hover:border-indigo-300 hover:text-[var(--color-primary)] hover:shadow-md hover:shadow-indigo-200/30 md:inline-flex dark:hover:border-indigo-700/50 dark:hover:shadow-indigo-700/20"
      aria-label={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
      title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
      onClick={toggleTheme}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
});
const MemoizedThemeToggle = ThemeToggle;
