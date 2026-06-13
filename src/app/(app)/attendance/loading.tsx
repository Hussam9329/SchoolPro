export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-[1350px] flex-col gap-6">
      {/* Page Header Skeleton */}
      <div className="animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-[var(--app-card-soft)]" />
        <div className="mt-2 h-5 w-80 rounded-lg bg-[var(--app-card-soft)]" />
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="app-card p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[var(--app-card-soft)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-[var(--app-card-soft)]" />
                <div className="h-8 w-16 rounded bg-[var(--app-card-soft)]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Filters Skeleton */}
      <div className="grid gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-2xl bg-[var(--app-card-soft)]" />
        ))}
      </div>

      {/* Search Form Skeleton */}
      <div className="app-card p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 rounded-xl bg-[var(--app-card-soft)]" />
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="app-card p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-3xl bg-[var(--app-card-soft)]" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 rounded bg-[var(--app-card-soft)]" />
                <div className="h-4 w-60 rounded bg-[var(--app-card-soft)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
