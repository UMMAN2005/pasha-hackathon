import { prisma } from "@/lib/db";

export interface PublicListing {
  id: string;
  publicTitle: string;
  price: number;
  discountPercent: number;
  retailStruck: number;
  qtyAvailable: number;
  pickupStart: Date;
  pickupEnd: Date;
  categoryName: string;
  branchCity: string;
  urgent: boolean;
}

export interface PublicOrder {
  id: string;
  productTitle: string;
  quantity: number;
  totalAmount: number;
  status: "RESERVED" | "PICKED_UP" | "CANCELLED";
  pickupCode: string;
  pickupStart: Date;
  pickupEnd: Date;
}

export async function getPublicListings(): Promise<PublicListing[]> {
  const listings = await prisma.marketplaceListing.findMany({
    where: { status: { in: ["ACTIVE", "RESERVED"] } },
    select: {
      id: true,
      publicTitle: true,
      price: true,
      discountPercent: true,
      minQty: true,
      maxQty: true,
      pickupStart: true,
      pickupEnd: true,
      batch: {
        select: {
          retailPrice: true,
          quantityOnHand: true,
          quantityReserved: true,
          product: {
            select: {
              name: true,
              category: {
                select: { name: true },
              },
            },
          },
          branch: {
            select: { city: true },
          },
        },
      },
    },
  });

  return listings.map((l) => ({
    id: l.id,
    publicTitle: l.publicTitle,
    price: l.price,
    discountPercent: l.discountPercent,
    retailStruck: l.batch.retailPrice,
    qtyAvailable: l.maxQty,
    pickupStart: l.pickupStart,
    pickupEnd: l.pickupEnd,
    categoryName: l.batch.product.category.name,
    branchCity: l.batch.branch.city,
    urgent: l.discountPercent >= 45,
  }));
}

export async function getPublicListing(id: string): Promise<PublicListing> {
  const listing = await prisma.marketplaceListing.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      publicTitle: true,
      price: true,
      discountPercent: true,
      minQty: true,
      maxQty: true,
      pickupStart: true,
      pickupEnd: true,
      batch: {
        select: {
          retailPrice: true,
          product: {
            select: {
              name: true,
              category: {
                select: { name: true },
              },
            },
          },
          branch: {
            select: { city: true },
          },
        },
      },
    },
  });

  return {
    id: listing.id,
    publicTitle: listing.publicTitle,
    price: listing.price,
    discountPercent: listing.discountPercent,
    retailStruck: listing.batch.retailPrice,
    qtyAvailable: listing.maxQty,
    pickupStart: listing.pickupStart,
    pickupEnd: listing.pickupEnd,
    categoryName: listing.batch.product.category.name,
    branchCity: listing.batch.branch.city,
    urgent: listing.discountPercent >= 45,
  };
}

export async function getBuyerOrders(
  companyId: string
): Promise<PublicOrder[]> {
  const orders = await prisma.order.findMany({
    where: { buyerCompanyId: companyId },
    select: {
      id: true,
      quantity: true,
      totalAmount: true,
      status: true,
      pickupCode: true,
      listing: {
        select: {
          publicTitle: true,
          pickupStart: true,
          pickupEnd: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((o) => ({
    id: o.id,
    productTitle: o.listing.publicTitle,
    quantity: o.quantity,
    totalAmount: o.totalAmount,
    status: o.status as "RESERVED" | "PICKED_UP" | "CANCELLED",
    pickupCode: o.pickupCode,
    pickupStart: o.listing.pickupStart,
    pickupEnd: o.listing.pickupEnd,
  }));
}
