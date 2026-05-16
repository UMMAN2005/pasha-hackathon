import { prisma } from "@/lib/db";
import { getToday } from "@/lib/clock";
import { discountPercent, listingUnitPrice } from "@/domain/decision";
import { writeAudit } from "@/server/audit";
import { NotFoundError } from "@/lib/errors";

export interface Actor {
  id: string;
  name: string;
}

export async function createListingFromRecommendation(
  recId: string,
  actor: Actor,
  priceOverride?: number
) {
  return await prisma.$transaction(async (tx) => {
    const rec = await tx.recommendation.findUniqueOrThrow({
      where: { id: recId },
      include: {
        batch: {
          include: {
            product: true,
          },
        },
        listing: true,
      },
    });

    if (rec.status === "APPROVED" && rec.listing) {
      return rec.listing;
    }

    if (rec.status !== "PENDING") {
      throw new NotFoundError("Recommendation must be PENDING");
    }

    const batch = rec.batch;
    const product = batch.product;

    const risk = await tx.riskScore.findFirst({
      where: { batchId: batch.id },
      orderBy: { generatedAt: "desc" },
    });

    const aiDiscount = discountPercent(risk?.riskScore ?? 0);
    const aiPrice = listingUnitPrice(
      batch.retailPrice,
      batch.costPerUnit,
      aiDiscount
    );
    const listingPrice =
      priceOverride != null
        ? Math.max(
            batch.costPerUnit,
            Math.min(batch.retailPrice, Math.round(priceOverride))
          )
        : aiPrice;
    const discount =
      batch.retailPrice > 0
        ? Math.max(
            0,
            Math.round(
              ((batch.retailPrice - listingPrice) / batch.retailPrice) * 100
            )
          )
        : aiDiscount;

    const availableQty = batch.quantityOnHand - batch.quantityReserved;
    // Sensible wholesale minimum order: ~10% of the lot, clamped 5–25,
    // never above what's available. This is also the buyer's default qty.
    const minQty = Math.max(
      1,
      Math.min(availableQty, Math.min(25, Math.max(5, Math.round(availableQty * 0.1))))
    );

    const listing = await tx.marketplaceListing.create({
      data: {
        batchId: batch.id,
        publicTitle: product.name,
        price: listingPrice,
        discountPercent: discount,
        minQty,
        maxQty: availableQty,
        pickupStart: getToday(),
        pickupEnd: new Date(getToday().getTime() + 2 * 24 * 60 * 60 * 1000),
        status: "ACTIVE",
        recommendationId: rec.id,
      },
    });

    await tx.recommendation.update({
      where: { id: rec.id },
      data: {
        status: "APPROVED",
        resolvedAt: new Date(),
      },
    });

    await writeAudit(tx, {
      actorId: actor.id,
      actorName: actor.name,
      entityType: "Recommendation",
      entityId: rec.id,
      action: "APPROVE_REC",
      metadata: { listingId: listing.id },
    });

    await writeAudit(tx, {
      actorId: actor.id,
      actorName: actor.name,
      entityType: "MarketplaceListing",
      entityId: listing.id,
      action: "CREATE_LISTING",
      metadata: { recommendationId: rec.id },
    });

    return listing;
  });
}
