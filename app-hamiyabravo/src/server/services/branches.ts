import { prisma } from "@/lib/db";

export interface BranchOverview {
  id: string;
  name: string;
  city: string;
  batchCount: number;
  atRiskCount: number;
  openLoss: number; // qəpik
  topProduct: string | null;
  topRisk: number;
}

export async function getBranchesOverview(): Promise<BranchOverview[]> {
  const branches = await prisma.branch.findMany({
    include: {
      batches: {
        include: {
          product: true,
          riskScores: { orderBy: { generatedAt: "desc" }, take: 1 },
          recommendations: { where: { status: "PENDING" }, take: 1 },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return branches.map((b) => {
    let openLoss = 0;
    let atRiskCount = 0;
    let topProduct: string | null = null;
    let topRisk = 0;
    for (const batch of b.batches) {
      const score = batch.riskScores[0]?.riskScore ?? 0;
      const loss = batch.riskScores[0]?.expectedLoss ?? 0;
      if (score >= 60) atRiskCount += 1;
      if (batch.recommendations.length > 0) openLoss += loss;
      if (score > topRisk) {
        topRisk = score;
        topProduct = batch.product.name;
      }
    }
    return {
      id: b.id,
      name: b.name,
      city: b.city,
      batchCount: b.batches.length,
      atRiskCount,
      openLoss,
      topProduct,
      topRisk,
    };
  });
}
