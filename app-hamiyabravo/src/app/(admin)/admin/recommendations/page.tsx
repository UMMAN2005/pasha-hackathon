import { prisma } from "@/lib/db";
import { formatAzn } from "@/lib/money";
import { RiskBadge } from "@/components/risk-badge";
import { RecommendationCard } from "./card";

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
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">AI Növbəsi</h1>
        <p className="text-sm text-slate-600">{recs.length} tövsiyə gözləyir</p>
      </div>

      {recs.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200 text-center">
          <p className="text-slate-600 mb-4">Hazır tövsiyə yoxdur</p>
          <p className="text-sm text-slate-500">Bütün məhsullar stabildir</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recs.map((rec) => {
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
                className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="grid grid-cols-2 gap-6">
                  {/* Left column */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {rec.batch.product.name}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {rec.batch.branch.name} · {rec.batch.quantityOnHand} ədəd
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-2">Risk</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-slate-900">
                          {riskScore}
                        </span>
                        <RiskBadge score={riskScore} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">
                        {rec.reason}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">
                        İnam: {confidenceWords}
                      </p>
                    </div>
                  </div>

                  {/* Right column - Money side-by-side */}
                  <div className="flex flex-col justify-between">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <p className="text-xs text-green-700 mb-1">
                          Bərpa olunur
                        </p>
                        <p className="text-2xl font-bold text-green-900">
                          +{formatAzn(rec.expectedRecovery)}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <p className="text-xs text-red-700 mb-1">
                          Heç nə etməsək itki
                        </p>
                        <p className="text-2xl font-bold text-red-900">
                          {formatAzn(expectedLoss)}
                        </p>
                      </div>
                    </div>
                    <RecommendationCard recId={rec.id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
