import { prisma } from "@/lib/db";
import { pickupCode } from "@/lib/code";
import { writeAudit } from "@/server/audit";
import {
  InsufficientStockError,
  InvalidQuantityError,
} from "@/lib/errors";

export interface PlacedOrder {
  id: string;
  pickupCode: string;
  status: "RESERVED" | "PICKED_UP" | "CANCELLED";
}

export async function placeOrderService(input: {
  listingId: string;
  quantity: number;
  buyerCompanyId: string;
}): Promise<PlacedOrder> {
  return await prisma.$transaction(async (tx) => {
    const listing = await tx.marketplaceListing.findUniqueOrThrow({
      where: { id: input.listingId },
      include: { batch: true },
    });

    if (listing.status !== "ACTIVE") {
      throw new InsufficientStockError(
        "Not available for ordering — stock may have been reserved"
      );
    }

    const batch = listing.batch;
    const available = batch.quantityOnHand - batch.quantityReserved;

    if (input.quantity < listing.minQty) {
      throw new InvalidQuantityError(
        `Minimum quantity is ${listing.minQty} units`
      );
    }

    if (input.quantity > available) {
      throw new InsufficientStockError(
        `Insufficient stock: only ${available} units available`
      );
    }

    await tx.inventoryBatch.update({
      where: { id: batch.id },
      data: { quantityReserved: { increment: input.quantity } },
    });

    const newAvailable = batch.quantityOnHand - batch.quantityReserved - input.quantity;

    if (newAvailable <= 0) {
      await tx.marketplaceListing.update({
        where: { id: listing.id },
        data: { status: "RESERVED" },
      });
    }

    const code = pickupCode();
    const order = await tx.order.create({
      data: {
        listingId: input.listingId,
        buyerCompanyId: input.buyerCompanyId,
        quantity: input.quantity,
        totalAmount: listing.price * input.quantity,
        status: "RESERVED",
        pickupCode: code,
      },
    });

    await writeAudit(tx, {
      actorId: input.buyerCompanyId,
      actorName: "Buyer",
      entityType: "Order",
      entityId: order.id,
      action: "RESERVE",
      metadata: { quantity: input.quantity, listingId: input.listingId },
    });

    return {
      id: order.id,
      pickupCode: code,
      status: "RESERVED",
    };
  });
}
