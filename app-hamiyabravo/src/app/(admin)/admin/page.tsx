import { getKpisService } from "@/server/services/kpis";
import { HeroNumber } from "@/components/hero-number";
import { ImpactStrip } from "@/components/impact-strip";
import { RiskListMini } from "@/components/risk-list-mini";
import { StatusLine } from "@/components/status-line";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const kpis = await getKpisService();

  return (
    <div className="p-8 space-y-8">
      {/* Hero Section */}
      <HeroNumber
        qapik={kpis.moneyRecoveredToday}
        label="Bu gün bərpa olundu"
        data-testid="hero-number"
      />

      {/* Status Line */}
      <StatusLine />

      {/* Impact Strip */}
      <ImpactStrip impact={kpis.recoveryImpact} />

      {/* Risk Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            5 məhsul tezliklə xarab ola bilər — AI hər biri üçün plan hazırladı
          </h2>
        </div>
        {kpis.atRisk.length > 0 ? (
          <RiskListMini risks={kpis.atRisk} />
        ) : (
          <div className="bg-white rounded-xl p-8 border border-slate-200 text-center space-y-4">
            <p className="text-slate-600">Hazır heç bir tövsiyə yoxdur</p>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Yenidən hesablamaq
            </button>
          </div>
        )}
      </div>

      {/* Branch Leaderboard */}
      {kpis.branchLeaderboard.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Şubələr — Açıq İtki
          </h3>
          <div className="space-y-3">
            {kpis.branchLeaderboard.map((branch, idx) => (
              <div key={branch.branchId} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {branch.branchName}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {branch.expectedLoss ? `+₼${(branch.expectedLoss / 100).toFixed(0)}` : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary CTA */}
      <div className="flex justify-center pt-4">
        <Link
          href="/admin/recommendations"
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          AI növbəsinə bax
        </Link>
      </div>
    </div>
  );
}
