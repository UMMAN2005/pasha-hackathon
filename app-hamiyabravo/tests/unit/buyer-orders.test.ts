import { describe, it, expect, beforeAll } from "vitest";
import { getBuyerOrders } from "@/server/services/market";
import { placeOrderService } from "@/server/services/order";
import { prisma } from "@/lib/db";
import { createListingFromRecommendation } from "@/server/services/listing";
import { recalcRiskService } from "@/server/services/recalc";

describe("getBuyerOrders", () => {
  beforeAll(async () => {
    await recalcRiskService({ all: true });
    const pendingRec = await prisma.recommendation.findFirstOrThrow({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      skip: 2,
    });
    await createListingFromRecommendation(pendingRec.id, {
      id: "buyer-orders-setup",
      name: "Buyer Orders Setup",
    });
  });

  it("returns buyer orders with pickup code and no internal fields", async () => {
    const listing = await prisma.marketplaceListing.findFirstOrThrow({
      where: { status: "ACTIVE" },
    });
    const buyer = await prisma.company.findFirstOrThrow({
      where: { legalName: "Astoria Hotel" },
    });

    await placeOrderService({
      listingId: listing.id,
      quantity: 5,
      buyerCompanyId: buyer.id,
    });

    const orders = await getBuyerOrders(buyer.id);
    expect(orders.length).toBeGreaterThan(0);

    const order = orders[0];
    expect(order.id).toBeDefined();
    expect(order.pickupCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(order.status).toBe("RESERVED");
    expect(order.productTitle).toBeDefined();
    expect(order.quantity).toBe(5);
    expect(order.totalAmount).toBeGreaterThan(0);

    const keys = Object.keys(order);
    expect(keys).not.toContain("costPerUnit");
    expect(keys).not.toContain("riskScore");
    expect(keys).not.toContain("expiryDate");
  });
});
