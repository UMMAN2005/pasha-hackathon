import { getBatchDetail } from "@/server/services/inventory";
import { RiskBadge } from "@/components/risk-badge";
import { formatAzn } from "@/lib/money";
import { BatchDetailClient } from "./client";
import { SalesChart } from "./sales-chart";
import { productImage } from "@/lib/product-images";
import { GlassCard, ProductThumb, Pill } from "@/components/ui/kit";
import { forecastNarrative } from "@/server/ai/insights";
import { MapPin, History } from "lucide-react";

interface DetailPageProps {
  params: Promise<{ batchId: string }>;
}

export default async function BatchDetailPage(props: DetailPageProps) {
  const params = await props.params;
  const batch = await getBatchDetail(params.batchId);

  const confidenceWords =
    batch.confidence >= 0.8
      ? "high"
      : batch.confidence >= 0.6
        ? "medium"
        : "low";

  const chartData = batch.salesTrendData.map((qty: number, idx: number) => ({
    day: idx,
    qty,
  }));

  let aiNarrative = null;
  try {
    aiNarrative = await forecastNarrative({
      product: batch.product,
      riskScore: batch.riskScore,
      daysToExpiry: batch.daysToExpiry,
      qty: batch.quantity,
      avgDailySales: batch.avgDailySales,
      action: "RESEARCH_MARKET"
    });
  } catch {
    aiNarrative = null;
  }

  return (
    <div className="p-8 space-y-8">
      {/* Hero Header with Photo */}
      <GlassCard className="p-8 border border-white/10" rise>
        <div className="grid grid-cols-4 gap-6">
          {/* Photo */}
          <div className="col-span-1">
            <div className="aspect-square rounded-xl overflow-hidden border border-white/20 ring-2 ring-white/10">
              <ProductThumb
                src={productImage(batch.product)}
                alt={batch.product}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Title & Location */}
          <div className="col-span-2 space-y-3">
            <h1 className="text-4xl font-black bg-gradient-to-r from-green-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
              {batch.product}
            </h1>
            <p className="text-emerald-200 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {batch.branch}
            </p>
            <div className="flex gap-2 mt-3">
              <Pill tone={
                batch.conditionStatus === "GOOD" ? "ok" :
                batch.conditionStatus === "CHECK_REQUIRED" ? "amber" : "bad"
              }>
                {batch.conditionStatus === "GOOD"
                  ? "Good"
                  : batch.conditionStatus === "CHECK_REQUIRED"
                    ? "Check required"
                    : "Unsafe"}
              </Pill>
            </div>
          </div>

          {/* Big Numbers */}
          <div className="col-span-1 space-y-4">
            <div>
              <p className="text-xs text-emerald-400 uppercase tracking-widest">Quantity</p>
              <p className="text-4xl font-black text-white">
                {batch.quantity}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-400 uppercase tracking-widest">Expiry</p>
              <p className="text-3xl font-black text-emerald-200">
                {batch.daysToExpiry}
              </p>
              <p className="text-xs text-emerald-300">days</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Sales Chart */}
      <GlassCard className="p-6 border border-emerald-200/20" rise>
        <h2 className="text-lg font-bold text-white mb-4">
          Sales trend (14 days)
        </h2>
        <SalesChart data={chartData} />
        <p className="text-sm text-emerald-200 mt-4">
          Avg daily: <span className="font-bold">{batch.avgDailySales}</span> units
        </p>
      </GlassCard>

      {/* Risk Panel */}
      <GlassCard className="p-6 border border-rose-200/20" rise>
        <h2 className="text-lg font-bold text-white mb-6">
          Risk analysis
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-emerald-400 uppercase tracking-widest">Risk score</p>
            <div className="flex items-center gap-3">
              <div className="text-4xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {batch.riskScore}
              </div>
              <RiskBadge score={batch.riskScore} />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-emerald-400 uppercase tracking-widest">Expected unsold</p>
            <p className="text-3xl font-bold text-white">
              {batch.expectedUnsoldQty}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-emerald-400 uppercase tracking-widest">Loss risk</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-rose-300 to-pink-300 bg-clip-text text-transparent">
              {formatAzn(batch.expectedLoss)}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-sm text-emerald-200">
            Confidence: <span className="font-bold">{confidenceWords}</span>
          </p>
        </div>
      </GlassCard>

      {/* AI Forecast */}
      {aiNarrative && (
        <GlassCard className="p-6 border border-emerald-200/20" rise>
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">
              AI forecast
            </h3>
            <p className="text-emerald-100 leading-relaxed">
              {aiNarrative}
            </p>
          </div>
        </GlassCard>
      )}

      {/* Explanation */}
      {batch.recommendation && (
        <BatchDetailClient
          batchId={params.batchId}
          recommendation={batch.recommendation}
          product={batch.product}
          quantity={batch.quantity}
          daysToExpiry={batch.daysToExpiry}
          riskScore={batch.riskScore}
          expectedLoss={batch.expectedLoss}
        />
      )}

      {/* Action History */}
      {batch.auditLogs.length > 0 && (
        <GlassCard className="p-6 border border-white/10" rise>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity history
          </h2>
          <div className="space-y-2">
            {batch.auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between border-b border-white/10 pb-3 last:border-b-0"
              >
                <div>
                  <p className="font-semibold text-white">{log.action}</p>
                  <p className="text-xs text-emerald-400">{log.actorName}</p>
                </div>
                <p className="text-xs text-emerald-300 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("en-US")}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
