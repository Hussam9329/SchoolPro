export default function ExamGradesLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      {/* Back links skeleton */}
      <div className="flex animate-pulse gap-3">
        <div className="h-5 w-32 rounded bg-[var(--app-card-soft)]" />
        <div className="h-9 w-28 rounded-xl bg-[var(--app-card-soft)]" />
      </div>

      {/* Header skeleton */}
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-48 rounded-xl bg-[var(--app-card-soft)]" />
        <div className="h-5 w-72 rounded-lg bg-[var(--app-card-soft)]" />
      </div>

      {/* Info cards skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="app-card p-5 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[var(--app-card-soft)]" />
              <div className="space-y-2">
                <div className="h-3 w-16 rounded bg-[var(--app-card-soft)]" />
                <div className="h-5 w-24 rounded bg-[var(--app-card-soft)]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grade entry table skeleton */}
      <div className="app-card overflow-hidden animate-pulse">
        <div className="p-5 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-[var(--app-card-soft)]" />
              <div className="h-5 w-32 rounded bg-[var(--app-card-soft)]" />
              <div className="flex-1" />
              <div className="h-10 w-24 rounded-lg bg-[var(--app-card-soft)]" />
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--app-border-soft)] p-4 flex justify-end">
          <div className="h-10 w-32 rounded-xl bg-[var(--app-card-soft)]" />
        </div>
      </div>
    </div>
  );
}
