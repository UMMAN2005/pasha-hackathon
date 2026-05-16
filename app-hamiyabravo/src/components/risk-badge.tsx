interface RiskBadgeProps {
  score: number;
}

function getBandInfo(score: number): { label: string; color: string } {
  if (score >= 80) {
    return { label: "Critical", color: "bg-red-100 text-red-800" };
  }
  if (score >= 60) {
    return { label: "High", color: "bg-amber-100 text-amber-800" };
  }
  if (score >= 40) {
    return { label: "Watch", color: "bg-teal-100 text-teal-800" };
  }
  return { label: "Stable", color: "bg-green-100 text-green-800" };
}

export function RiskBadge({ score }: RiskBadgeProps) {
  const band = getBandInfo(score);
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${band.color}`}>
      {band.label}
    </span>
  );
}
