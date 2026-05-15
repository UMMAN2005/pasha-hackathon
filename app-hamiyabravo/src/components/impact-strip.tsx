import { formatAzn } from "@/lib/money";
import type { ImpactResult } from "@/domain/sustainability";

interface ImpactStripProps {
  impact: ImpactResult;
}

export function ImpactStrip({ impact }: ImpactStripProps) {
  const metrics = [
    { label: "Öğün", value: impact.mealsSaved.toString(), icon: "🍽️" },
    { label: "Kiloqram", value: impact.kgSaved.toFixed(1), icon: "⚖️" },
    {
      label: "CO₂ ekv. (ton)",
      value: (impact.co2eAvoided / 1000).toFixed(2),
      icon: "🌍",
    },
    { label: "Boşa gedir", value: formatAzn(0), icon: "💧" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm text-center"
        >
          <div className="text-3xl mb-2">{m.icon}</div>
          <p className="text-2xl font-bold text-slate-900 mb-1">{m.value}</p>
          <p className="text-xs text-slate-600">{m.label}</p>
        </div>
      ))}
    </div>
  );
}
