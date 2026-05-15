import { describe, it, expect, beforeAll } from "vitest";
import { placeOrderService } from "@/server/services/order";
import { prisma } from "@/lib/db";
import { createListingFromRecommendation } from "@/server/services/listing";
import { recalcRiskService } from "@/server/services/recalc";

describe("placeOrderService", () => {
  let testListingId: string;
  let buyerId: string;

  beforeAll(async () => {
    await recalcRiskService({ all: true });

    const rec = await prisma.recommendation.findFirstOrThrow({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      skip: 1,
    });
    const newListing = await createListingFromRecommendation(rec.id, {
      id: "order-test",
      name: "Order Test",
    });
    testListingId = newListing.id;

    const buyer = await prisma.company.findFirstOrThrow({
      where: { legalName: "Astoria Hotel" },
    });
    buyerId = buyer.id;
  });

  it("reserves stock, generates pickup code, prevents oversell", async () => {
    const o = await placeOrderService({
      listingId: testListingId,
      quantity: 10,
      buyerCompanyId: buyerId,
    });

    expect(o.pickupCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(o.status).toBe("RESERVED");

    const listing = await prisma.marketplaceListing.findUniqueOrThrow({
      where: { id: testListingId },
    });
    const batch = await prisma.inventoryBatch.findFirstOrThrow({
      where: { id: listing.batchId },
    });
    expect(batch.quantityReserved).toBeGreaterThanOrEqual(10);

    await expect(
      placeOrderService({
        listingId: testListingId,
        quantity: 999999,
        buyerCompanyId: buyerId,
      })
    ).rejects.toThrow(/stock|InsufficientStock/i);
  });
});
