import { Utensils, Scale, Globe2, TrendingDown } from "lucide-react";
import type { ImpactResult } from "@/domain/sustainability";

interface ImpactStripProps {
  impact: ImpactResult;
}

export function ImpactStrip({ impact }: ImpactStripProps) {
  const metrics = [
    {
      label: "Meals saved",
      value: impact.mealsSaved.toLocaleString("en-US"),
      sub: "kept in the food chain",
      icon: Utensils,
    },
    {
      label: "Food rescued",
      value: `${impact.kgSaved.toFixed(1)} kg`,
      sub: "diverted from waste",
      icon: Scale,
    },
    {
      label: "CO₂e avoided",
      value: `${(impact.co2eAvoided / 1000).toFixed(2)} t`,
      sub: "emissions prevented",
      icon: Globe2,
    },
    {
      label: "Value lost",
      value: "₼0",
      sub: "nothing wasted today",
      icon: TrendingDown,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {metrics.map((m, i) => (
        <div
          key={m.label}
          className={`glass card-rise animate-fade-up rounded-2xl p-5 delay-${i + 1}`}
        >
          <div className="bg-brand mb-4 grid h-11 w-11 place-items-center rounded-xl text-white shadow-sm">
            <m.icon className="h-5 w-5" />
          </div>
          <p className="text-3xl font-black text-[var(--ink)]">{m.value}</p>
          <p className="mt-1 text-sm font-bold text-[var(--ink)]">{m.label}</p>
          <p className="text-xs text-[var(--ink-soft)]">{m.sub}</p>
        </div>
      ))}
    </div>
  );
}
