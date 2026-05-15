import { prisma } from "@/lib/db";
import { getToday, daysBetween } from "@/lib/clock";

export interface ListBatchesFilter {
  branch?: string;
  category?: string;
  riskBand?: string;
  status?: string;
}

export async function listBatches(filters: ListBatchesFilter) {
  const today = getToday();

  const batches = await prisma.inventoryBatch.findMany({
    include: {
      product: {
        include: { category: true },
      },
      branch: true,
      riskScores: {
        orderBy: { generatedAt: "desc" },
        take: 1,
      },
      recommendations: {
        where: { status: "PENDING" },
        take: 1,
      },
    },
  });

  batches.sort((a, b) => (b.riskScores[0]?.riskScore ?? 0) - (a.riskScores[0]?.riskScore ?? 0));

  return batches.map((b) => ({
    id: b.id,
    product: b.product.name,
    sku: b.product.sku,
    branch: b.branch.name,
    quantity: b.quantityOnHand,
    expiryDate: b.expiryDate,
    daysToExpiry: daysBetween(b.expiryDate, today),
    riskScore: b.riskScores[0]?.riskScore ?? 0,
    expectedLoss: b.riskScores[0]?.expectedLoss ?? 0,
    recommendedAction: b.recommendations[0]?.reason || "—",
    status: b.recommendations[0]?.status || "PENDING",
  }));
}

export async function getBatchDetail(batchId: string) {
  const today = getToday();
  const batch = await prisma.inventoryBatch.findUniqueOrThrow({
    where: { id: batchId },
    include: {
      product: true,
      branch: true,
      riskScores: {
        orderBy: { generatedAt: "desc" },
        take: 1,
      },
      recommendations: {
        where: { status: "PENDING" },
        take: 1,
      },
    },
  });

  const sales = await prisma.salesTransaction.findMany({
    where: {
      productId: batch.productId,
      branchId: batch.branchId,
      soldAt: {
        gte: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000),
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { soldAt: "asc" },
  });

  const salesByDay = Array(14).fill(0);
  for (const sale of sales) {
    const dayOffset = daysBetween(sale.soldAt, today);
    if (dayOffset >= 0 && dayOffset < 14) {
      salesByDay[13 - dayOffset] += sale.quantity;
    }
  }

  const avgDaily = Math.round(
    salesByDay.reduce((a, b) => a + b, 0) / 14
  );

  const auditLogs = await prisma.auditLog.findMany({
    where: { entityId: batchId },
    orderBy: { createdAt: "desc" },
  });

  return {
    id: batch.id,
    product: batch.product.name,
    branch: batch.branch.name,
    quantity: batch.quantityOnHand,
    expiryDate: batch.expiryDate,
    daysToExpiry: daysBetween(batch.expiryDate, today),
    conditionStatus: batch.conditionStatus,
    riskScore: batch.riskScores[0]?.riskScore ?? 0,
    expectedUnsoldQty: batch.riskScores[0]?.expectedUnsoldQty ?? 0,
    expectedLoss: batch.riskScores[0]?.expectedLoss ?? 0,
    confidence: batch.riskScores[0]?.confidence ?? 0,
    recommendation: batch.recommendations[0] || null,
    salesTrendData: salesByDay,
    avgDailySales: avgDaily,
    auditLogs,
  };
}
