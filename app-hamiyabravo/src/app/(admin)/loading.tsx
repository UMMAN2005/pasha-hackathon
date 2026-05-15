export default function AdminLoading() {
  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-12 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-32 mb-4"></div>
        <div className="h-12 bg-slate-200 rounded w-48"></div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-slate-200 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-64"></div>
      </div>

      <div className="space-y-3">
        <div className="h-6 bg-slate-200 rounded w-96"></div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 border border-slate-200 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
