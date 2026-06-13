export default function GenericLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1350px] flex-col gap-6">
      <div className="animate-pulse space-y-6">
        <div className="h-16 rounded-2xl bg-slate-200/40" />
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-96 rounded-2xl bg-slate-200/30" />
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-slate-200/30" />
              ))}
            </div>
            <div className="h-16 rounded-2xl bg-slate-200/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
