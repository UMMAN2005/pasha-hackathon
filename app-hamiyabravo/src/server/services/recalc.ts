import { prisma } from "@/lib/db";
import { getToday, daysBetween } from "@/lib/clock";
import { scoreBatch } from "@/domain/risk";
import {
  recommend,
  discountPercent,
  listingUnitPrice,
  type DecisionInput,
} from "@/domain/decision";
import { writeAudit } from "@/server/audit";

export async function recalcRiskService(opts: { all: boolean }) {
  if (!opts.all) return;

  const today = getToday();

  const batches = await prisma.inventoryBatch.findMany({
    where: { product: { isActive: true } },
    include: { product: { include: { category: true } }, branch: true },
  });

  for (const batch of batches) {
    await prisma.$transaction(async (tx) => {
      const fourteenDaysAgo = new Date(today);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const sales = await tx.salesTransaction.findMany({
        where: {
          productId: batch.productId,
          branchId: batch.branchId,
          soldAt: {
            gte: fourteenDaysAgo,
            lt: today,
          },
        },
        orderBy: { soldAt: "asc" },
      });

      const sales14: number[] = Array(14).fill(0);
      for (const sale of sales) {
        const dayIdx = daysBetween(sale.soldAt, fourteenDaysAgo);
        if (dayIdx >= 0 && dayIdx < 14) {
          sales14[dayIdx] += sale.quantity;
        }
      }

      const scoreResult = scoreBatch({
        quantityOnHand: batch.quantityOnHand,
        costPerUnit: batch.costPerUnit,
        expiryDate: batch.expiryDate,
        today,
        sales14,
      });

      const existing = await tx.riskScore.findFirst({
        where: { batchId: batch.id },
      });

      if (existing) {
        await tx.riskScore.update({
          where: { id: existing.id },
          data: {
            riskScore: scoreResult.riskScore,
            expectedUnsoldQty: scoreResult.expectedUnsoldQty,
            expectedLoss: scoreResult.expectedLoss,
            confidence: scoreResult.confidence,
            generatedAt: today,
          },
        });
      } else {
        await tx.riskScore.create({
          data: {
            batchId: batch.id,
            riskScore: scoreResult.riskScore,
            expectedUnsoldQty: scoreResult.expectedUnsoldQty,
            expectedLoss: scoreResult.expectedLoss,
            confidence: scoreResult.confidence,
            generatedAt: today,
          },
        });
      }

      const decision = recommend({
        riskScore: scoreResult.riskScore,
        quantityOnHand: batch.quantityOnHand,
        category: batch.product.category.name,
        condition: batch.conditionStatus as
          | "GOOD"
          | "CHECK_REQUIRED"
          | "UNSAFE",
      });

      const discount = discountPercent(scoreResult.riskScore);
      const listingPrice = listingUnitPrice(
        batch.retailPrice,
        batch.costPerUnit,
        discount
      );

      const expectedUnsoldQty = scoreResult.expectedUnsoldQty;
      const expectedRecovery = expectedUnsoldQty * listingPrice;

      await tx.recommendation.deleteMany({
        where: {
          batchId: batch.id,
          status: "PENDING",
        },
      });

      await tx.recommendation.create({
        data: {
          batchId: batch.id,
          actionType: decision.actionType,
          priority: decision.priority,
          reason: decision.reason,
          expectedRecovery,
          status: "PENDING",
          createdAt: today,
        },
      });

      await writeAudit(tx, {
        actorName: "system",
        entityType: "Batch",
        entityId: batch.id,
        action: "RECALC",
        metadata: {
          riskScore: scoreResult.riskScore,
          actionType: decision.actionType,
          sales14Sum: sales14.reduce((a, b) => a + b, 0),
        },
      });
    });
  }
}
