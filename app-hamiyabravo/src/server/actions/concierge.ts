"use server";

import { z } from "zod";
import { placeOrderService } from "@/server/services/order";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  InsufficientStockError,
  InvalidQuantityError,
} from "@/lib/errors";

const schema = z.object({
  listingId: z.string(),
  quantity: z.number().int().positive(),
});

type Result =
  | { ok: true; pickupCode: string; total: number }
  | { ok: false; error: string };

// One-click direct purchase for the AI Concierge — no bidding.
export async function conciergeBuyAction(input: unknown): Promise<Result> {
  try {
    const session = await getSession();
    if (!session) return { ok: false, error: "Please sign in again." };

    const companyId =
      session.companyId ??
      (await prisma.company.findFirst({ where: { type: "BUYER" } }))?.id ??
      null;
    if (!companyId) {
      return { ok: false, error: "No buyer company on your profile." };
    }

    const { listingId, quantity } = schema.parse(input);
    const order = await placeOrderService({
      listingId,
      quantity,
      buyerCompanyId: companyId,
    });

    const placed = await prisma.order.findUnique({
      where: { id: order.id },
      select: { totalAmount: true },
    });

    revalidatePath("/marketplace");
    revalidatePath("/marketplace/orders");
    revalidatePath("/marketplace/concierge");
    revalidatePath("/admin");

    return {
      ok: true,
      pickupCode: order.pickupCode,
      total: placed?.totalAmount ?? 0,
    };
  } catch (e) {
    if (
      e instanceof InsufficientStockError ||
      e instanceof InvalidQuantityError
    ) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: "Could not complete the purchase — try again." };
  }
}
