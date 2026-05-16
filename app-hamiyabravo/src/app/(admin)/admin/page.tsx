import { getKpisService } from "@/server/services/kpis";
import { HeroNumber } from "@/components/hero-number";
import { ImpactStrip } from "@/components/impact-strip";
import { RiskListMini } from "@/components/risk-list-mini";
import { StatusLine } from "@/components/status-line";
import { forecastNarrative } from "@/server/ai/insights";
import Link from "next/link";
import { GlassCard, AIBadge, SectionTitle } from "@/components/ui/kit";
import { Sparkles } from "lucide-react";

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
          label="Recovered today"
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
          <GlassCard className="p-6 border border-emerald-200/20" rise>
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <AIBadge label="Forecast" />
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
          title={`${kpis.atRisk.length} products at risk — AI plan`}
          className="mb-4"
        />
        {kpis.atRisk.length > 0 ? (
          <RiskListMini risks={kpis.atRisk} />
        ) : (
          <GlassCard className="p-8 text-center" rise>
            <p className="text-emerald-100">No recommendations available</p>
            <p className="text-xs text-emerald-300 mt-1">All products are stable</p>
          </GlassCard>
        )}
      </div>

      {/* Primary CTA */}
      <div className="flex justify-center pt-6 animate-fade-up delay-5">
        <Link
          href="/admin/recommendations"
          className="btn-grad px-8 py-3 font-bold text-white rounded-xl hover:scale-105 transition-transform shadow-lg hover:shadow-2xl flex items-center gap-2"
        >
          <Sparkles className="h-5 w-5" />
          View AI queue
        </Link>
      </div>
    </div>
  );
}
