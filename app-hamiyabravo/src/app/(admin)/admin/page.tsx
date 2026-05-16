import { getKpisService } from "@/server/services/kpis";
import { HeroNumber } from "@/components/hero-number";
import { ImpactStrip } from "@/components/impact-strip";
import { StatusLine } from "@/components/status-line";
import { forecastNarrative } from "@/server/ai/insights";
import Link from "next/link";
import { GlassCard, AIBadge, SectionTitle } from "@/components/ui/kit";
import { Sparkles, TrendingUp } from "lucide-react";
import { ExportButtons } from "./export-buttons";
import { formatAzn } from "@/lib/money";

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

  // Prepare data for export
  const exportData = {
    moneyRecoveredToday: kpis.moneyRecoveredToday,
    totalRecovered: kpis.totalRecovered,
    openRecommendations: kpis.openRecommendations,
    recoveryImpact: kpis.recoveryImpact,
    atRiskCount: kpis.atRisk.length,
  };

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Header with Export */}
      <div className="flex items-center justify-between animate-fade-up">
        <SectionTitle title="Dashboard" className="mb-0" />
        <ExportButtons data={exportData} />
      </div>

      {/* Hero Section */}
      <div className="animate-fade-up">
        <HeroNumber
          qapik={kpis.moneyRecoveredToday}
          label="Recovered today"
          data-testid="hero-number"
        />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-up delay-1">
        {/* Total Recovered */}
        <GlassCard className="p-6 border border-emerald-200/20" rise>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                Total Recovered
              </p>
            </div>
            <p className="text-3xl font-black bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              {formatAzn(kpis.totalRecovered)}
            </p>
            <p className="text-xs text-emerald-200">All-time total</p>
          </div>
        </GlassCard>

        {/* AI Queue Count */}
        <GlassCard className="p-6 border border-violet-200/20" rise>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-400" />
              <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
                AI Queue
              </p>
            </div>
            <p className="text-3xl font-black text-violet-300">
              {kpis.openRecommendations}
            </p>
            <p className="text-xs text-violet-200">Awaiting review</p>
          </div>
        </GlassCard>

        {/* At Risk Count */}
        <GlassCard className="p-6 border border-rose-200/20" rise>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-widest text-rose-300">
                At Risk
              </p>
            </div>
            <p className="text-3xl font-black text-rose-300">
              {kpis.atRisk.length}
            </p>
            <p className="text-xs text-rose-200">Top priority items</p>
          </div>
        </GlassCard>
      </div>

      {/* Status Line */}
      <div className="animate-fade-up delay-2">
        <StatusLine />
      </div>

      {/* Impact Strip */}
      <div className="animate-fade-up delay-3">
        <ImpactStrip impact={kpis.recoveryImpact} />
      </div>

      {/* AI Forecast Card */}
      {aiInsight && (
        <div className="animate-fade-up delay-4">
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

      {/* Primary CTA */}
      <div className="flex justify-center pt-6 animate-fade-up delay-5">
        <Link
          href="/admin/recommendations"
          className="btn-grad px-8 py-4 font-bold text-white rounded-xl hover:scale-105 transition-transform shadow-lg hover:shadow-2xl flex items-center gap-3 text-lg"
        >
          <Sparkles className="h-6 w-6" />
          Open AI Queue
        </Link>
      </div>
    </div>
  );
}
