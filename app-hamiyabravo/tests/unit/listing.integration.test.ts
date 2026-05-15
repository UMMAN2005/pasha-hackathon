import { describe, it, expect, beforeAll } from "vitest";
import { createListingFromRecommendation } from "@/server/services/listing";
import { prisma } from "@/lib/db";
import { seedDatabase } from "@/../prisma/seed";

describe("createListingFromRecommendation", () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it("approve creates an ACTIVE listing + audit, idempotent", async () => {
    const rec = await prisma.recommendation.findFirstOrThrow({
      where: {
        status: "PENDING",
        batch: { product: { sku: "DARY-YOG-500" } },
      },
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
    expect(again.id).toBe(l.id); // idempotent, no duplicate

    expect(
      await prisma.auditLog.count({
        where: { action: "APPROVE_REC", entityId: rec.id },
      })
    ).toBe(1);
  });
});
