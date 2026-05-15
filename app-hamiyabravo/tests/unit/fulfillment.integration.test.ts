import { describe, it, expect, beforeAll } from "vitest";
import { confirmPickupService } from "@/server/services/fulfillment";
import { placeOrderService } from "@/server/services/order";
import { prisma } from "@/lib/db";
import { createListingFromRecommendation } from "@/server/services/listing";
import { recalcRiskService } from "@/server/services/recalc";

describe("confirmPickupService", () => {
  let testListingId: string;
  let buyerId: string;

  beforeAll(async () => {
    await recalcRiskService({ all: true });

    const rec = await prisma.recommendation.findFirstOrThrow({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      skip: 4,
    });
    const newListing = await createListingFromRecommendation(rec.id, {
      id: "fulfillment-test",
      name: "Fulfillment Test",
    });
    testListingId = newListing.id;

    const buyer = await prisma.company.findFirstOrThrow({
      where: { legalName: "Astoria Hotel" },
    });
    buyerId = buyer.id;
  });

  it("pickup decrements stock, closes loop, audits, idempotent", async () => {
    const listing = await prisma.marketplaceListing.findUniqueOrThrow({
      where: { id: testListingId },
    });

    const beforeBatch = await prisma.inventoryBatch.findFirstOrThrow({
      where: { id: listing.batchId },
    });

    const order = await placeOrderService({
      listingId: testListingId,
      quantity: 5,
      buyerCompanyId: buyerId,
    });

    const afterReserve = await prisma.inventoryBatch.findFirstOrThrow({
      where: { id: listing.batchId },
    });

    expect(afterReserve.quantityReserved).toBe(beforeBatch.quantityReserved + 5);

    const result = await confirmPickupService(order.pickupCode, {
      id: "m",
      name: "Kamran",
    });

    expect(result.status).toBe("PICKED_UP");

    const afterPickup = await prisma.inventoryBatch.findFirstOrThrow({
      where: { id: listing.batchId },
    });

    expect(afterPickup.quantityOnHand).toBe(afterReserve.quantityOnHand - 5);
    expect(afterPickup.quantityReserved).toBe(afterReserve.quantityReserved - 5);

    await expect(
      confirmPickupService(order.pickupCode, { id: "m", name: "Kamran" })
    ).rejects.toThrow();

    const auditCount = await prisma.auditLog.count({
      where: { action: "PICKUP_CONFIRM" },
    });
    expect(auditCount).toBeGreaterThan(0);
  });
});
