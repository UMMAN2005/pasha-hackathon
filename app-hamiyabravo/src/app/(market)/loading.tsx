export default function MarketLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-slate-200 rounded w-48 animate-pulse"></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-slate-200 overflow-hidden animate-pulse"
          >
            <div className="h-40 bg-slate-200"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-slate-200 rounded w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
