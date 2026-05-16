"use server";

import { z } from "zod";
import { confirmPickupService } from "@/server/services/fulfillment";
import { requireRole } from "@/lib/session";
import { NotFoundError, InsufficientStockError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

const confirmPickupSchema = z.object({
  pickupCode: z.string().length(6),
});

export async function confirmPickupAction(
  input: unknown
): Promise<{ ok: boolean; status?: string; error?: string }> {
  try {
    const session = await requireRole(
      "BRANCH_MANAGER",
      "HQ_ADMIN",
      "LOGISTICS_OPERATOR"
    );
    const parsed = confirmPickupSchema.parse(input);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
    });

    const result = await confirmPickupService(parsed.pickupCode, {
      id: session.userId,
      name: user.name,
    });

    revalidatePath("/admin/listings");
    revalidatePath("/admin");
    revalidatePath("/admin/audit");

    return { ok: true, status: result.status };
  } catch (e) {
    if (e instanceof NotFoundError) {
      return { ok: false, error: e.message };
    }
    if (e instanceof InsufficientStockError) {
      return { ok: false, error: e.message };
    }
    if (e instanceof Error && e.message.includes("not authenticated")) {
      return { ok: false, error: "Daxil olmalısınız" };
    }
    return { ok: false, error: "An error occurred — please try again" };
  }
}
