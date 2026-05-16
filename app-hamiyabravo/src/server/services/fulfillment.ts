import { prisma } from "@/lib/db";
import { writeAudit } from "@/server/audit";
import { NotFoundError, InsufficientStockError } from "@/lib/errors";

export interface PickedUpOrder {
  id: string;
  status: "PICKED_UP";
}

export async function confirmPickupService(
  pickupCode: string,
  actor: { id: string; name: string }
): Promise<PickedUpOrder> {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { pickupCode },
      include: { listing: { include: { batch: true } } },
    });

    if (!order) {
      throw new NotFoundError("Pickup code not found");
    }

    if (order.status !== "RESERVED") {
      throw new NotFoundError("This order has already been picked up");
    }

    const batch = order.listing.batch;
    const newOnHand = batch.quantityOnHand - order.quantity;
    const newReserved = batch.quantityReserved - order.quantity;

    if (newOnHand < 0 || newReserved < 0) {
      throw new InsufficientStockError(
        "Insufficient stock available — system error"
      );
    }

    await tx.inventoryBatch.update({
      where: { id: batch.id },
      data: {
        quantityOnHand: newOnHand,
        quantityReserved: newReserved,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PICKED_UP",
        pickedUpAt: new Date(),
      },
    });

    if (newOnHand === 0) {
      await tx.marketplaceListing.update({
        where: { id: order.listingId },
        data: { status: "SOLD" },
      });
    }

    await writeAudit(tx, {
      actorId: actor.id,
      actorName: actor.name,
      entityType: "Order",
      entityId: order.id,
      action: "PICKUP_CONFIRM",
      metadata: { quantity: order.quantity },
    });

    return {
      id: order.id,
      status: "PICKED_UP",
    };
  });
}
