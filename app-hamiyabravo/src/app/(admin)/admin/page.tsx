import { getKpisService } from "@/server/services/kpis";
import { HeroNumber } from "@/components/hero-number";
import { ImpactStrip } from "@/components/impact-strip";
import { RiskListMini } from "@/components/risk-list-mini";
import { StatusLine } from "@/components/status-line";
import { forecastNarrative } from "@/server/ai/insights";
import Link from "next/link";
import { GlassCard, AIBadge, SectionTitle } from "@/components/ui/kit";

export default async function AdminOverviewPage() {
  const kpis = await getKpisService();

  let aiInsight = null;
  if (kpis.atRisk.length > 0) {
    const topRisk = kpis.atRisk[0];
    aiInsight = await forecastNarrative({
      product: topRisk.product,
      riskScore: topRisk.riskScore,
      daysToExpiry: 7,
      qty: 100,
      avgDailySales: 5,
      action: "RESEARCH_MARKET"
    }).catch(() => null);
  }

  return (
    <div className="space-y-8 p-8">
      {/* Hero Section */}
      <div className="animate-fade-up">
        <HeroNumber
          qapik={kpis.moneyRecoveredToday}
          label="Bu gün bərpa olundu"
          data-testid="hero-number"
        />
      </div>

      {/* Status Line */}
      <div className="animate-fade-up delay-1">
        <StatusLine />
      </div>

      {/* Impact Strip */}
      <div className="animate-fade-up delay-2">
        <ImpactStrip impact={kpis.recoveryImpact} />
      </div>

      {/* AI Forecast Card */}
      {aiInsight && (
        <div className="animate-fade-up delay-2">
          <GlassCard className="p-6 border border-violet-200/20" rise>
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <AIBadge label="Proqnoz" />
                </div>
                <p className="text-white text-sm leading-relaxed">
                  {aiInsight}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* At-Risk Section */}
      <div className="space-y-4 animate-fade-up delay-3">
        <SectionTitle
          title={`${kpis.atRisk.length} məhsul tezlik ərzində xarab ola biləcəyi — AI-nin planu`}
          className="mb-4"
        />
        {kpis.atRisk.length > 0 ? (
          <RiskListMini risks={kpis.atRisk} />
        ) : (
          <GlassCard className="p-8 text-center" rise>
            <p className="text-violet-100">Hazır tövsiyə yoxdur</p>
            <p className="text-xs text-violet-300 mt-1">Bütün məhsullar stabildir</p>
          </GlassCard>
        )}
      </div>

      {/* Branch Leaderboard */}
      {kpis.branchLeaderboard.length > 0 && (
        <div className="animate-fade-up delay-4">
          <GlassCard className="p-6 border border-emerald-200/20" rise>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🏪 Şubələr — Açıq İtki
            </h3>
            <div className="space-y-3">
              {kpis.branchLeaderboard.map((branch, idx) => (
                <div key={branch.branchId} className="flex items-center gap-4 pb-3 border-b border-white/10 last:border-b-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-sm font-bold text-white">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">
                      {branch.branchName}
                    </p>
                  </div>
                  <p className="text-sm font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    {branch.expectedLoss ? `+₼${(branch.expectedLoss / 100).toFixed(0)}` : "—"}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Primary CTA */}
      <div className="flex justify-center pt-6 animate-fade-up delay-5">
        <Link
          href="/admin/recommendations"
          className="btn-grad px-8 py-3 font-bold text-white rounded-xl hover:scale-105 transition-transform shadow-lg hover:shadow-2xl"
        >
          ✦ AI növbəsinə bax
        </Link>
      </div>
    </div>
  );
}
