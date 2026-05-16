"use server";

import { z } from "zod";
import { placeOrderService } from "@/server/services/order";
import { requireRole } from "@/lib/session";
import {
  InsufficientStockError,
  InvalidQuantityError,
} from "@/lib/errors";
import { revalidatePath } from "next/cache";

const reserveSchema = z.object({
  listingId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export async function reserveAction(
  input: unknown
): Promise<{ ok: boolean; pickupCode?: string; error?: string }> {
  try {
    const user = await requireRole("BUSINESS_BUYER", "HQ_ADMIN");
    const parsed = reserveSchema.parse(input);

    if (!user.companyId) {
      return { ok: false, error: "No company selected" };
    }

    const order = await placeOrderService({
      listingId: parsed.listingId,
      quantity: parsed.quantity,
      buyerCompanyId: user.companyId,
    });

    revalidatePath("/marketplace");
    revalidatePath("/marketplace/orders");
    revalidatePath("/admin/listings");
    revalidatePath("/admin");

    return { ok: true, pickupCode: order.pickupCode };
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      return { ok: false, error: e.message };
    }
    if (e instanceof InvalidQuantityError) {
      return { ok: false, error: e.message };
    }
    if (e instanceof Error && e.message.includes("not authenticated")) {
      return { ok: false, error: "You must sign in" };
    }
    return { ok: false, error: "An error occurred — please try again" };
  }
}
