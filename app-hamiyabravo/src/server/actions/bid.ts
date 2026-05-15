"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { placeBid, acceptBid } from "@/server/services/auction";
import {
  ForbiddenError,
  InsufficientStockError,
  InvalidQuantityError,
  NotFoundError,
} from "@/lib/errors";

const PlaceSchema = z.object({
  listingId: z.string().min(1),
  pricePerUnit: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

type Result = { ok: true; message: string } | { ok: false; error: string };

export async function placeBidAction(input: unknown): Promise<Result> {
  try {
    const session = await requireRole("BUSINESS_BUYER", "HQ_ADMIN");
    const { listingId, pricePerUnit, quantity } = PlaceSchema.parse(input);

    const company = session.companyId
      ? await prisma.company.findUnique({ where: { id: session.companyId } })
      : await prisma.company.findFirst({ where: { type: "BUYER" } });
    if (!company) {
      return { ok: false, error: "Alıcı şirkəti tapılmadı" };
    }

    const bid = await placeBid({
      listingId,
      buyerCompanyId: company.id,
      buyerName: company.legalName,
      pricePerUnit,
      quantity,
    });

    revalidatePath("/marketplace");
    revalidatePath(`/marketplace/${listingId}`);
    revalidatePath("/admin/listings");
    return {
      ok: true,
      message: `Təklif qeydə alındı: ${(pricePerUnit / 100).toFixed(2)} ₼/ədəd × ${quantity} (#${bid.id.slice(0, 6)})`,
    };
  } catch (e) {
    if (
      e instanceof InvalidQuantityError ||
      e instanceof InsufficientStockError ||
      e instanceof NotFoundError ||
      e instanceof ForbiddenError
    ) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: "Təklif göndərilə bilmədi" };
  }
}

const AcceptSchema = z.object({ bidId: z.string().min(1) });

export async function acceptBidAction(
  input: unknown
): Promise<
  { ok: true; pickupCode: string; total: number } | { ok: false; error: string }
> {
  try {
    const session = await requireRole("HQ_ADMIN", "BRANCH_MANAGER");
    const { bidId } = AcceptSchema.parse(input);
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    const res = await acceptBid(bidId, {
      id: session.userId,
      name: user?.name ?? "Menecer",
    });
    revalidatePath("/admin/listings");
    revalidatePath("/admin");
    revalidatePath("/marketplace");
    return { ok: true, pickupCode: res.pickupCode, total: res.total };
  } catch (e) {
    if (
      e instanceof NotFoundError ||
      e instanceof InsufficientStockError ||
      e instanceof ForbiddenError
    ) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: "Təklif qəbul edilə bilmədi" };
  }
}

export async function getBidAdvice(listingId: string) {
  await requireRole("HQ_ADMIN", "BRANCH_MANAGER");
  const { aiAdviceFor } = await import("@/server/services/auction");
  return aiAdviceFor(listingId);
}
