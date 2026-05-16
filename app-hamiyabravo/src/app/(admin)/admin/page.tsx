import { getKpisService } from "@/server/services/kpis";
import { HeroNumber } from "@/components/hero-number";
import { ImpactStrip } from "@/components/impact-strip";
import { StatusLine } from "@/components/status-line";
import { forecastNarrative } from "@/server/ai/insights";
import Link from "next/link";
import { GlassCard, AIBadge, SectionTitle } from "@/components/ui/kit";
import { Sparkles, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
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
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-up">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Executive recovery overview</p>
        </div>
        <ExportButtons data={exportData} />
      </div>

      {/* Hero Section - Recovered Today */}
      <div className="animate-fade-up">
        <HeroNumber
          qapik={kpis.moneyRecoveredToday}
          label="Recovered today"
          data-testid="hero-number"
        />
      </div>

      {/* KPI Stats Grid - 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up delay-100">
        {/* Total Recovered */}
        <GlassCard className="p-5 border border-emerald-200" rise>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Total Recovered
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatAzn(kpis.totalRecovered)}
            </p>
            <p className="text-xs text-slate-500">All-time total</p>
          </div>
        </GlassCard>

        {/* Open Recommendations */}
        <GlassCard className="p-5 border border-violet-200" rise>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                AI Queue
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {kpis.openRecommendations}
            </p>
            <p className="text-xs text-slate-500">Awaiting review</p>
          </div>
        </GlassCard>

        {/* At Risk Count */}
        <GlassCard className="p-5 border border-rose-200" rise>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                At Risk
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {kpis.atRisk.length}
            </p>
            <p className="text-xs text-slate-500">Top priority</p>
          </div>
        </GlassCard>

        {/* Recovery Impact */}
        <GlassCard className="p-5 border border-amber-200" rise>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Impact
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {kpis.recoveryImpact.mealsSaved}
            </p>
            <p className="text-xs text-slate-500">Meals saved</p>
          </div>
        </GlassCard>
      </div>

      {/* Status Line */}
      <div className="animate-fade-up delay-200">
        <StatusLine />
      </div>

      {/* Impact Strip */}
      <div className="animate-fade-up delay-300">
        <ImpactStrip impact={kpis.recoveryImpact} />
      </div>

      {/* AI Insight Panel */}
      {aiInsight && (
        <div className="animate-fade-up delay-400">
          <GlassCard className="p-6 border border-emerald-200 bg-emerald-50/40" rise>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AIBadge label="Market Insight" />
              </div>
              <p className="text-slate-900 text-sm leading-relaxed">
                {aiInsight}
              </p>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Top At-Risk Items */}
      {kpis.atRisk.length > 0 && (
        <div className="animate-fade-up delay-500">
          <GlassCard className="p-6 border border-slate-200" rise>
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-600" />
                Top At-Risk Items
              </h3>
              <div className="space-y-2">
                {kpis.atRisk.slice(0, 5).map((item, idx) => (
                  <Link
                    key={idx}
                    href="/admin/inventory"
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-rose-100 hover:border-rose-300 hover:bg-rose-50/50 transition-colors group"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 group-hover:text-rose-700">
                        {item.product}
                      </p>
                      <p className="text-xs text-slate-500">Risk Score: {item.riskScore}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-1 bg-rose-100 text-rose-700 text-xs font-semibold rounded">
                        {Math.round(item.riskScore * 100)}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href="/admin/inventory"
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors mt-2 inline-block"
              >
                View all at-risk items →
              </Link>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Primary CTA */}
      <div className="flex justify-center pt-6 animate-fade-up delay-600">
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
