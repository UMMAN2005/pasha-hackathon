import { describe, it, expect, beforeAll } from "vitest";
import { createListingFromRecommendation } from "@/server/services/listing";
import { prisma } from "@/lib/db";
import { recalcRiskService } from "@/server/services/recalc";

describe("createListingFromRecommendation", () => {
  beforeAll(async () => {
    await recalcRiskService({ all: true });
  });

  it("approve creates an ACTIVE listing + audit, idempotent", async () => {
    const rec = await prisma.recommendation.findFirstOrThrow({
      where: { status: "PENDING", batch: { product: { sku: "DARY-YOG-500" } } },
    });
    const l = await createListingFromRecommendation(rec.id, {
      id: "u",
      name: "Kamran",
    });
    expect(l.status).toBe("ACTIVE");
    expect(l.discountPercent).toBe(40);

    const again = await createListingFromRecommendation(rec.id, {
      id: "u",
      name: "Kamran",
    });
    expect(again.id).toBe(l.id);

    const auditCount = await prisma.auditLog.count({
      where: { action: "APPROVE_REC", entityId: rec.id },
    });
    expect(auditCount).toBe(1);
  });
});
