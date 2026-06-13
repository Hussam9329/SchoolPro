export default function StudentProfileLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      {/* Back link skeleton */}
      <div className="animate-pulse">
        <div className="h-5 w-36 rounded bg-[var(--app-card-soft)]" />
      </div>

      {/* Header skeleton */}
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-64 rounded-xl bg-[var(--app-card-soft)]" />
        <div className="h-5 w-80 rounded-lg bg-[var(--app-card-soft)]" />
      </div>

      {/* Action buttons skeleton */}
      <div className="flex gap-3 animate-pulse">
        <div className="h-10 w-28 rounded-xl bg-[var(--app-card-soft)]" />
        <div className="h-10 w-28 rounded-xl bg-[var(--app-card-soft)]" />
        <div className="h-10 w-28 rounded-xl bg-[var(--app-card-soft)]" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="app-card p-5 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[var(--app-card-soft)]" />
              <div className="space-y-2">
                <div className="h-3 w-16 rounded bg-[var(--app-card-soft)]" />
                <div className="h-5 w-24 rounded bg-[var(--app-card-soft)]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Basic info skeleton */}
      <div className="app-card p-6 animate-pulse">
        <div className="mb-4 h-6 w-32 rounded bg-[var(--app-card-soft)]" />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-5 w-48 rounded bg-[var(--app-card-soft)]" />
          ))}
        </div>
      </div>

      {/* Tables skeleton */}
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="app-card overflow-hidden animate-pulse">
            <div className="border-b border-[var(--app-border-soft)] p-5">
              <div className="h-6 w-24 rounded bg-[var(--app-card-soft)]" />
            </div>
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-8 rounded bg-[var(--app-card-soft)]" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Financial section skeleton */}
      <div className="app-card overflow-hidden animate-pulse">
        <div className="border-b border-[var(--app-border-soft)] p-6">
          <div className="h-6 w-32 rounded bg-[var(--app-card-soft)]" />
          <div className="mt-2 h-4 w-64 rounded bg-[var(--app-card-soft)]" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-[var(--app-card-soft)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
