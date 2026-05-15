import Link from "next/link";
import { formatAzn } from "@/lib/money";

interface RiskItem {
  id: string;
  product: string;
  branch: string;
  reason: string;
  expectedLoss: number;
  expectedRecovery: number;
  riskScore: number;
}

interface RiskListMiniProps {
  risks: RiskItem[];
}

function getRiskBand(score: number): string {
  if (score >= 80) return "Kritik";
  if (score >= 60) return "Yüksək";
  if (score >= 40) return "İzlə";
  return "Sabit";
}

export function RiskListMini({ risks }: RiskListMiniProps) {
  if (risks.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
        <p className="text-slate-600">Xəbərdi bir işə yaramamış tapıb</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {risks.map((risk) => (
        <Link
          key={risk.id}
          href="/admin/recommendations"
          className="block bg-white rounded-lg p-4 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-medium text-slate-900">{risk.product}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {risk.branch} · {getRiskBand(risk.riskScore)}
              </p>
              <p className="text-sm text-slate-600 mt-2">{risk.reason}</p>
            </div>
            <div className="text-right whitespace-nowrap">
              <p className="text-sm font-semibold text-blue-600">
                +{formatAzn(risk.expectedRecovery)}
              </p>
              <p className="text-xs text-slate-500">Bərpa ola bilər</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
