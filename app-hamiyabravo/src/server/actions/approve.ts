"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createListingFromRecommendation } from "@/server/services/listing";
import { writeAudit } from "@/server/audit";

const ApproveSchema = z.object({
  recId: z.string().uuid(),
});

const RejectSchema = z.object({
  recId: z.string().uuid(),
  reason: z.string().optional(),
});

export async function approveRecommendation(input: unknown) {
  const session = await requireRole("HQ_ADMIN", "BRANCH_MANAGER");
  const { recId } = ApproveSchema.parse(input);

  const listing = await createListingFromRecommendation(recId, {
    id: session.userId,
    name: (await prisma.user.findUniqueOrThrow({ where: { id: session.userId } }))
      .name,
  });

  revalidatePath("/admin/recommendations");
  revalidatePath("/admin");
  revalidatePath("/marketplace");

  return { success: true, listingId: listing.id };
}

export async function rejectRecommendation(input: unknown) {
  const session = await requireRole("HQ_ADMIN", "BRANCH_MANAGER");
  const { recId, reason } = RejectSchema.parse(input);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
  });

  await prisma.$transaction(async (tx) => {
    await tx.recommendation.update({
      where: { id: recId },
      data: { status: "REJECTED" },
    });

    await writeAudit(tx, {
      actorId: session.userId,
      actorName: user.name,
      entityType: "Recommendation",
      entityId: recId,
      action: "REJECT_REC",
      metadata: { reason: reason || null },
    });
  });

  revalidatePath("/admin/recommendations");
  revalidatePath("/admin");

  return { success: true };
}
