import { describe, it, expect, beforeAll } from "vitest";
import { createListingFromRecommendation } from "@/server/services/listing";
import { prisma } from "@/lib/db";
import { recalcRiskService } from "@/server/services/recalc";

describe("createListingFromRecommendation", () => {
  beforeAll(async () => {
    await recalcRiskService({ all: true });
  });

  it("approve creates an ACTIVE listing + audit", async () => {
    const rec = await prisma.recommendation.findFirstOrThrow({
      where: { status: "PENDING" },
    });
    const l = await createListingFromRecommendation(rec.id, {
      id: "u",
      name: "Kamran",
    });
    expect(l.status).toBe("ACTIVE");
    expect(l.discountPercent).toBe(40);

    const auditCount = await prisma.auditLog.count({
      where: { action: "APPROVE_REC", entityId: rec.id },
    });
    expect(auditCount).toBe(1);
  });
});
