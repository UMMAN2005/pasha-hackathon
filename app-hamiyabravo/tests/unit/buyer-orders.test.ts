import { describe, it, expect, beforeAll } from "vitest";
import { getBuyerOrders } from "@/server/services/market";
import { placeOrderService } from "@/server/services/order";
import { prisma } from "@/lib/db";
import { createListingFromRecommendation } from "@/server/services/listing";
import { seedDatabase } from "@/../prisma/seed";

describe("getBuyerOrders", () => {
  let listingId: string;
  let buyerId: string;

  beforeAll(async () => {
    await seedDatabase();

    const rec = await prisma.recommendation.findFirstOrThrow({
      where: {
        status: "PENDING",
        batch: { product: { sku: "DARY-YOG-500" } },
      },
    });
    const listing = await createListingFromRecommendation(rec.id, {
      id: "buyer-orders-setup",
      name: "Buyer Orders Setup",
    });
    listingId = listing.id;

    const buyer = await prisma.company.findFirstOrThrow({
      where: { legalName: "Astoria Hotel" },
    });
    buyerId = buyer.id;
  });

  it("returns buyer orders with pickup code and no internal fields", async () => {
    await placeOrderService({
      listingId,
      quantity: 5,
      buyerCompanyId: buyerId,
    });

    const orders = await getBuyerOrders(buyerId);
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
