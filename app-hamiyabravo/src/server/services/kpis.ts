import { prisma } from "@/lib/db";
import { getToday } from "@/lib/clock";
import { impact } from "@/domain/sustainability";

export async function getKpisService() {
  const today = getToday();

  const pickedUpToday = await prisma.order.findMany({
    where: {
      status: "PICKED_UP",
      pickedUpAt: {
        gte: today,
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    include: {
      listing: {
        include: {
          batch: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  const moneyRecoveredToday = pickedUpToday.reduce(
    (sum, o) => sum + o.totalAmount,
    0
  );

  const allPickedUp = await prisma.order.findMany({
    where: { status: "PICKED_UP" },
    include: {
      listing: {
        include: {
          batch: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  const totalRecovered = allPickedUp.reduce((sum, o) => sum + o.totalAmount, 0);

  const recoveryLines = pickedUpToday.map((o) => ({
    sku: o.listing.batch.product.sku,
    quantity: o.quantity,
    totalAmount: o.totalAmount,
  }));

  const recoveryImpact = impact(recoveryLines);

  const openRecommendations = await prisma.recommendation.count({
    where: { status: "PENDING" },
  });

  const topRisks = await prisma.recommendation.findMany({
    where: { status: "PENDING" },
    include: {
      batch: {
        include: {
          product: true,
          branch: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  const riskScoreMap = await prisma.riskScore.findMany({
    where: {
      batchId: {
        in: topRisks.map((r) => r.batchId),
      },
    },
  });

  const riskScoreById = Object.fromEntries(
    riskScoreMap.map((r) => [r.batchId, r])
  );

  const atRisk = topRisks.map((rec) => {
    const score = riskScoreById[rec.batchId];
    return {
      id: rec.id,
      product: rec.batch.product.name,
      branch: rec.batch.branch.name,
      reason: rec.reason,
      expectedLoss: score?.expectedLoss ?? 0,
      expectedRecovery: rec.expectedRecovery,
      riskScore: score?.riskScore ?? 0,
    };
  });

  const branchLosses = await prisma.recommendation.groupBy({
    by: ["batchId"],
    where: { status: "PENDING" },
    _sum: {
      expectedRecovery: true,
    },
  });

  const batchIds = branchLosses.map((bl) => bl.batchId);
  const batchBranches = await prisma.inventoryBatch.findMany({
    where: { id: { in: batchIds } },
    include: { branch: true },
  });

  const branchMap = Object.fromEntries(
    batchBranches.map((b) => [b.id, b.branch])
  );
  const branchNameById = Object.fromEntries(
    batchBranches.map((b) => [b.branch.id, b.branch.name])
  );

  interface BranchLoss {
    branchId: string;
    branchName: string;
    expectedLoss: number;
  }

  const branchLeaderboard: BranchLoss[] = [];
  const branchTotals: Record<string, number> = {};

  for (const bl of branchLosses) {
    const branch = branchMap[bl.batchId];
    if (branch) {
      if (!branchTotals[branch.id]) {
        branchTotals[branch.id] = 0;
      }
      branchTotals[branch.id] += bl._sum.expectedRecovery ?? 0;
    }
  }

  const uniqueBranches = Object.entries(branchTotals).sort(
    ([, a], [, b]) => b - a
  );
  for (const [branchId, total] of uniqueBranches) {
    const branchName = branchNameById[branchId];
    if (branchName) {
      branchLeaderboard.push({ branchId, branchName, expectedLoss: total });
    }
  }

  return {
    moneyRecoveredToday,
    totalRecovered,
    recoveryImpact,
    openRecommendations,
    atRisk,
    branchLeaderboard,
  };
}
