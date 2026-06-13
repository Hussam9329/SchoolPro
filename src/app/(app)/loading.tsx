export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
      {/* Hero skeleton */}
      <div className="animate-pulse rounded-[var(--radius-lg)] p-px">
        <div className="app-card p-6 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 space-y-4">
              <div className="h-8 w-48 rounded-2xl bg-slate-200/60" />
              <div className="h-6 w-80 rounded bg-slate-200/60" />
              <div className="h-4 w-96 rounded bg-slate-200/40" />
            </div>
            <div className="h-48 w-64 rounded-3xl bg-slate-200/40" />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="stat-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="app-card animate-pulse p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="h-4 w-20 rounded bg-slate-200/60" />
                <div className="h-8 w-16 rounded bg-slate-200/60" />
                <div className="h-3 w-28 rounded bg-slate-200/40" />
              </div>
              <div className="h-12 w-12 rounded-2xl bg-slate-200/40" />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom section */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="app-card animate-pulse p-6">
          <div className="space-y-4">
            <div className="h-5 w-40 rounded bg-slate-200/60" />
            <div className="h-4 w-60 rounded bg-slate-200/40" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-slate-200/30" />
            ))}
          </div>
        </div>
        <div className="app-card animate-pulse p-6">
          <div className="space-y-4">
            <div className="h-5 w-40 rounded bg-slate-200/60" />
            <div className="h-4 w-60 rounded bg-slate-200/40" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-200/30" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
