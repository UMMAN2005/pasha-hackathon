import { prisma } from "@/lib/db";
import { pickupCode } from "@/lib/code";
import { writeAudit } from "@/server/audit";
import { productImage } from "@/lib/product-images";
import { bidAdvisor, type BidAdvice } from "@/server/ai/insights";
import {
  InsufficientStockError,
  InvalidQuantityError,
  NotFoundError,
} from "@/lib/errors";

export interface Actor {
  id: string;
  name: string;
}

function minNextBid(currentTop: number | null, askPrice: number): number {
  if (!currentTop) return Math.round(askPrice * 0.85);
  return currentTop + Math.max(50, Math.round(currentTop * 0.03));
}

export interface AuctionCard {
  id: string;
  title: string;
  image: string;
  category: string;
  city: string;
  askPrice: number;
  discountPercent: number;
  qty: number;
  topBid: number | null;
  bidCount: number;
  minNextBid: number;
  minQty: number;
  status: string;
}

export async function listAuctions(): Promise<AuctionCard[]> {
  const listings = await prisma.marketplaceListing.findMany({
    where: { status: "ACTIVE" },
    include: {
      bids: { orderBy: { pricePerUnit: "desc" } },
      batch: {
        include: {
          product: { include: { category: true } },
          branch: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return listings.map((l) => {
    const top = l.bids[0]?.pricePerUnit ?? null;
    const avail = l.batch.quantityOnHand - l.batch.quantityReserved;
    return {
      id: l.id,
      title: l.publicTitle,
      image: productImage(l.batch.product.sku),
      category: l.batch.product.category.name,
      city: l.batch.branch.city,
      askPrice: l.price,
      discountPercent: l.discountPercent,
      qty: Math.max(0, avail || l.maxQty),
      topBid: top,
      bidCount: l.bids.length,
      minNextBid: minNextBid(top, l.price),
      minQty: l.minQty,
      status: l.status,
    };
  });
}

export interface AuctionBid {
  id: string;
  buyerName: string;
  reliability: number;
  pricePerUnit: number;
  quantity: number;
  total: number;
  status: string;
  createdAt: Date;
}

export interface AuctionDetail extends AuctionCard {
  pickupStart: Date;
  pickupEnd: Date;
  bids: AuctionBid[];
}

export async function getAuction(
  listingId: string
): Promise<AuctionDetail | null> {
  const l = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    include: {
      bids: {
        orderBy: [{ pricePerUnit: "desc" }, { createdAt: "asc" }],
        include: { buyerCompany: true },
      },
      batch: {
        include: {
          product: { include: { category: true } },
          branch: true,
        },
      },
    },
  });
  if (!l) return null;

  const top = l.bids[0]?.pricePerUnit ?? null;
  const avail = l.batch.quantityOnHand - l.batch.quantityReserved;
  return {
    id: l.id,
    title: l.publicTitle,
    image: productImage(l.batch.product.sku),
    category: l.batch.product.category.name,
    city: l.batch.branch.city,
    askPrice: l.price,
    discountPercent: l.discountPercent,
    qty: Math.max(0, avail || l.maxQty),
    topBid: top,
    bidCount: l.bids.length,
    minNextBid: minNextBid(top, l.price),
    minQty: l.minQty,
    status: l.status,
    pickupStart: l.pickupStart,
    pickupEnd: l.pickupEnd,
    bids: l.bids.map((b) => ({
      id: b.id,
      buyerName: b.buyerName,
      reliability: b.buyerCompany.reliabilityScore,
      pricePerUnit: b.pricePerUnit,
      quantity: b.quantity,
      total: b.pricePerUnit * b.quantity,
      status: b.status,
      createdAt: b.createdAt,
    })),
  };
}

export async function placeBid(input: {
  listingId: string;
  buyerCompanyId: string;
  buyerName: string;
  pricePerUnit: number;
  quantity: number;
}) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.marketplaceListing.findUniqueOrThrow({
      where: { id: input.listingId },
      include: { batch: true, bids: { orderBy: { pricePerUnit: "desc" } } },
    });
    if (listing.status !== "ACTIVE") {
      throw new InsufficientStockError("Auction is closed");
    }
    const available =
      listing.batch.quantityOnHand - listing.batch.quantityReserved;
    if (input.quantity < listing.minQty || input.quantity > available) {
      throw new InvalidQuantityError(
        `Quantity must be between ${listing.minQty} and ${available} units`
      );
    }
    const top = listing.bids[0]?.pricePerUnit ?? null;
    const floor = minNextBid(top, listing.price);
    if (input.pricePerUnit < floor) {
      throw new InvalidQuantityError(
        `Bid must be at least ${(floor / 100).toFixed(2)} AZN per unit`
      );
    }

    await tx.bid.updateMany({
      where: { listingId: listing.id, status: "LEADING" },
      data: { status: "OUTBID" },
    });

    const bid = await tx.bid.create({
      data: {
        listingId: listing.id,
        buyerCompanyId: input.buyerCompanyId,
        buyerName: input.buyerName,
        pricePerUnit: input.pricePerUnit,
        quantity: input.quantity,
        status: "LEADING",
      },
    });

    await writeAudit(tx, {
      actorId: input.buyerCompanyId,
      actorName: input.buyerName,
      entityType: "Bid",
      entityId: bid.id,
      action: "BID_PLACED",
      metadata: {
        listingId: listing.id,
        pricePerUnit: input.pricePerUnit,
        quantity: input.quantity,
      },
    });

    return bid;
  });
}

export async function acceptBid(bidId: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const bid = await tx.bid.findUniqueOrThrow({
      where: { id: bidId },
      include: { listing: { include: { batch: true } } },
    });
    const listing = bid.listing;
    if (listing.status !== "ACTIVE") {
      throw new NotFoundError("Auction is already closed");
    }
    const available =
      listing.batch.quantityOnHand - listing.batch.quantityReserved;
    if (bid.quantity > available) {
      throw new InsufficientStockError("Not enough stock available");
    }

    await tx.inventoryBatch.update({
      where: { id: listing.batch.id },
      data: { quantityReserved: { increment: bid.quantity } },
    });

    const code = pickupCode();
    const order = await tx.order.create({
      data: {
        listingId: listing.id,
        buyerCompanyId: bid.buyerCompanyId,
        quantity: bid.quantity,
        totalAmount: bid.pricePerUnit * bid.quantity,
        status: "RESERVED",
        pickupCode: code,
      },
    });

    await tx.marketplaceListing.update({
      where: { id: listing.id },
      data: { status: "RESERVED", winningBidId: bid.id },
    });
    await tx.bid.update({
      where: { id: bid.id },
      data: { status: "WON" },
    });
    await tx.bid.updateMany({
      where: { listingId: listing.id, id: { not: bid.id } },
      data: { status: "LOST" },
    });

    await writeAudit(tx, {
      actorId: actor.id,
      actorName: actor.name,
      entityType: "Bid",
      entityId: bid.id,
      action: "BID_ACCEPTED",
      metadata: { orderId: order.id, total: order.totalAmount },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      actorName: actor.name,
      entityType: "Order",
      entityId: order.id,
      action: "RESERVE",
      metadata: { fromBid: bid.id, quantity: bid.quantity },
    });

    return { orderId: order.id, pickupCode: code, total: order.totalAmount };
  });
}

export async function aiAdviceFor(
  listingId: string
): Promise<BidAdvice | null> {
  const l = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    include: {
      bids: { where: { status: { in: ["LEADING", "OUTBID"] } }, include: { buyerCompany: true } },
      batch: { include: { product: true } },
    },
  });
  if (!l || l.bids.length === 0) return null;
  return bidAdvisor(
    l.batch.product.name,
    l.price,
    l.bids.map((b) => ({
      id: b.id,
      company: b.buyerName,
      reliability: b.buyerCompany.reliabilityScore,
      pricePerUnit: b.pricePerUnit,
      qty: b.quantity,
    }))
  );
}

export interface ClosedAuction {
  id: string;
  title: string;
  image: string;
  category: string;
  city: string;
  soldPrice: number;
  qty: number;
  total: number;
  buyer: string | null;
  status: string;
  pickedUp: boolean;
}

export async function getClosedAuctions(): Promise<ClosedAuction[]> {
  const listings = await prisma.marketplaceListing.findMany({
    where: { status: { in: ["RESERVED", "SOLD"] } },
    include: {
      orders: { include: { buyerCompany: true }, orderBy: { createdAt: "desc" } },
      bids: { where: { status: "WON" }, take: 1 },
      batch: {
        include: { product: { include: { category: true } }, branch: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return listings.map((l) => {
    const order = l.orders[0];
    const won = l.bids[0];
    return {
      id: l.id,
      title: l.publicTitle,
      image: productImage(l.batch.product.sku),
      category: l.batch.product.category.name,
      city: l.batch.branch.city,
      soldPrice: won?.pricePerUnit ?? l.price,
      qty: order?.quantity ?? won?.quantity ?? 0,
      total: order?.totalAmount ?? (won ? won.pricePerUnit * won.quantity : 0),
      buyer: order?.buyerCompany.legalName ?? won?.buyerName ?? null,
      status: l.status,
      pickedUp: order?.status === "PICKED_UP",
    };
  });
}
