import { prisma } from "@/lib/db";
import { formatAzn } from "@/lib/money";
import { RiskBadge } from "@/components/risk-badge";
import { RecommendationCard } from "./card";
import { GlassCard, SectionTitle, AIBadge } from "@/components/ui/kit";
import { AlertCircle } from "lucide-react";

export default async function RecommendationsPage() {
  const recs = await prisma.recommendation.findMany({
    where: { status: "PENDING" },
    include: {
      batch: {
        include: {
          product: true,
          branch: true,
          riskScores: {
            orderBy: { generatedAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 30,
  });

  // Calculate totals for the header
  const totalAtRisk = recs.reduce(
    (sum, rec) => sum + (rec.batch.riskScores[0]?.expectedLoss ?? 0),
    0
  );
  const totalRecoverable = recs.reduce((sum, rec) => sum + rec.expectedRecovery, 0);

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-violet-400" />
          <SectionTitle
            kicker="AI Insights"
            title="AI Recommendation Queue"
            className="mb-0"
          />
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-sm">
            <span className="text-white font-bold">{recs.length}</span>
            <span className="text-emerald-300 ml-1">recommendations</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-white/20" />
          <div className="text-sm">
            <span className="text-rose-300 font-bold">{formatAzn(totalAtRisk)}</span>
            <span className="text-rose-300 ml-1">at risk</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-white/20" />
          <div className="text-sm">
            <span className="text-emerald-300 font-bold">{formatAzn(totalRecoverable)}</span>
            <span className="text-emerald-300 ml-1">recoverable</span>
          </div>
        </div>
      </div>

      {recs.length === 0 ? (
        <GlassCard className="p-12 text-center" rise>
          <p className="text-white text-lg mb-2">Queue is empty</p>
          <p className="text-emerald-200 text-sm">All products are stable — great work!</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {recs.map((rec, idx) => {
            const riskScore = rec.batch.riskScores[0]?.riskScore ?? 0;
            const expectedLoss = rec.batch.riskScores[0]?.expectedLoss ?? 0;
            const confidence = rec.batch.riskScores[0]?.confidence ?? 0.5;
            const confidenceWords =
              confidence >= 0.8
                ? "high"
                : confidence >= 0.6
                  ? "medium"
                  : "low";

            const delayClass =
              idx === 0 ? "" : idx === 1 ? "delay-1" : idx === 2 ? "delay-2" : "delay-3";

            return (
              <div key={rec.id} className={`animate-fade-up ${delayClass}`}>
                <GlassCard
                  className="p-6 border border-white/10 hover:border-white/30 transition-all hover:bg-white/5"
                  rise
                >
                  <div className="grid grid-cols-12 gap-6 items-start">
                    {/* Product Image & Name */}
                    <div className="col-span-2">
                      <div className="space-y-3">
                        <div className="w-full aspect-square bg-gradient-to-br from-violet-500/20 to-purple-600/20 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
                          <span className="text-3xl font-black text-violet-300/40">
                            {rec.batch.product.name.charAt(0)}
                          </span>
                        </div>
                        <div className="min-h-[2.5rem]">
                          <h3 className="font-bold text-white text-sm leading-snug">
                            {rec.batch.product.name}
                          </h3>
                        </div>
                        <p className="text-xs text-emerald-300">
                          {rec.batch.branch.name}
                        </p>
                      </div>
                    </div>

                    {/* Risk & Reason */}
                    <div className="col-span-4 space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-black bg-gradient-to-r from-rose-300 to-pink-300 bg-clip-text text-transparent">
                            {riskScore}
                          </span>
                          <RiskBadge score={riskScore} />
                        </div>
                        <p className="text-xs text-rose-300 uppercase tracking-widest font-semibold">
                          Risk Score
                        </p>
                      </div>
                      <div className="pt-2 border-t border-white/10">
                        <p className="text-sm text-emerald-100 leading-relaxed italic">
                          "{rec.reason}"
                        </p>
                        <p className="text-xs text-emerald-400 mt-2">
                          Confidence:{" "}
                          <span className="font-bold capitalize">{confidenceWords}</span>
                        </p>
                      </div>
                      <div>
                        <AIBadge label="AI Generated" />
                      </div>
                    </div>

                    {/* Money Side-by-Side */}
                    <div className="col-span-3 space-y-3">
                      {/* Recovery */}
                      <div className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-lg p-4 border border-emerald-400/30">
                        <p className="text-xs text-emerald-300 uppercase tracking-widest mb-2 font-bold">
                          Recoverable
                        </p>
                        <p className="text-xl font-black bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                          +{formatAzn(rec.expectedRecovery)}
                        </p>
                      </div>
                      {/* Loss Risk */}
                      <div className="bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-lg p-4 border border-rose-400/30">
                        <p className="text-xs text-rose-300 uppercase tracking-widest mb-2 font-bold">
                          Loss Risk
                        </p>
                        <p className="text-xl font-black bg-gradient-to-r from-rose-300 to-pink-300 bg-clip-text text-transparent">
                          {formatAzn(expectedLoss)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-3">
                      <RecommendationCard recId={rec.id} />
                    </div>
                  </div>
                </GlassCard>
              </div>
            );
          })}
          {recs.length > 0 && (
            <p className="text-xs text-emerald-300 text-center pt-4">
              Showing top {recs.length} recommendations by priority
            </p>
          )}
        </div>
      )}
    </div>
  );
}
