import { formatAzn } from "@/lib/money";

interface HeroNumberProps {
  qapik: number;
  label: string;
  progress?: { current: number; target: number };
}

export function HeroNumber({ qapik, label, progress }: HeroNumberProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-12 text-center">
      <p className="text-sm font-medium text-slate-600 mb-2">{label}</p>
      <div className="text-5xl font-bold text-blue-900 mb-6">
        {formatAzn(qapik)}
      </div>
      {progress && (
        <div className="max-w-xs mx-auto">
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(
                  100,
                  Math.round((progress.current / progress.target) * 100)
                )}%`,
              }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {formatAzn(progress.current)} / {formatAzn(progress.target)}
          </p>
        </div>
      )}
    </div>
  );
}
