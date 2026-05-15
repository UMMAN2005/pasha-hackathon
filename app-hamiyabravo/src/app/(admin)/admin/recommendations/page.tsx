import { prisma } from "@/lib/db";
import { formatAzn } from "@/lib/money";
import { RiskBadge } from "@/components/risk-badge";
import { RecommendationCard } from "./card";
import { GlassCard, SectionTitle, Pill } from "@/components/ui/kit";

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
  });

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <SectionTitle
          kicker="✦ AI"
          title="Нәтicə cərəyan"
          className="mb-0"
        />
        <Pill tone="violet">
          {recs.length} gözləyir
        </Pill>
      </div>

      {recs.length === 0 ? (
        <GlassCard className="p-12 text-center" rise>
          <p className="text-white text-lg mb-2">Hazır tövsiyə yoxdur</p>
          <p className="text-violet-200 text-sm">Bütün məhsullar stabildir</p>
        </GlassCard>
      ) : (
        <div className="space-y-5">
          {recs.map((rec, idx) => {
            const riskScore = rec.batch.riskScores[0]?.riskScore ?? 0;
            const expectedLoss = rec.batch.riskScores[0]?.expectedLoss ?? 0;
            const confidence = rec.batch.riskScores[0]?.confidence ?? 0.5;
            const confidenceWords =
              confidence >= 0.8
                ? "yüksək"
                : confidence >= 0.6
                  ? "orta"
                  : "aşağı";

            return (
              <div
                key={rec.id}
                className={`animate-fade-up ${idx === 0 ? "" : idx === 1 ? "delay-1" : idx === 2 ? "delay-2" : "delay-3"}`}
              >
                <GlassCard className="p-6 border border-white/10 hover:border-white/30" rise>
                  <div className="grid grid-cols-3 gap-6">
                    {/* Left: Product & Reason */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {rec.batch.product.name}
                        </h3>
                        <p className="text-sm text-violet-200">
                          {rec.batch.branch.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-violet-300 uppercase tracking-widest mb-2">Risk</p>
                        <div className="flex items-center gap-2">
                          <span className="text-3xl font-black bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                            {riskScore}
                          </span>
                          <RiskBadge score={riskScore} />
                        </div>
                      </div>
                      <div className="pt-2 border-t border-white/10">
                        <p className="text-sm text-violet-100 leading-relaxed">
                          &ldquo;{rec.reason}&rdquo;
                        </p>
                        <p className="text-xs text-violet-400 mt-2">
                          İnam: <span className="font-bold">{confidenceWords}</span>
                        </p>
                      </div>
                    </div>

                    {/* Center: Money side-by-side */}
                    <div className="space-y-3">
                      {/* Recovery */}
                      <div className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl p-4 border border-emerald-400/30 backdrop-blur">
                        <p className="text-xs text-emerald-300 uppercase tracking-widest mb-2">
                          Bərpa olunur
                        </p>
                        <p className="text-2xl font-black bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                          +{formatAzn(rec.expectedRecovery)}
                        </p>
                      </div>
                      {/* Loss */}
                      <div className="bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-xl p-4 border border-rose-400/30 backdrop-blur">
                        <p className="text-xs text-rose-300 uppercase tracking-widest mb-2">
                          İtki riski
                        </p>
                        <p className="text-2xl font-black bg-gradient-to-r from-rose-300 to-pink-300 bg-clip-text text-transparent">
                          {formatAzn(expectedLoss)}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-3">
                      <RecommendationCard recId={rec.id} />
                    </div>
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
