import { prisma } from "@/lib/db";
import { narrateEvent } from "@/server/ai/narrate";
import { getToday } from "@/lib/clock";

export async function StatusLine() {
  const today = getToday();

  const latestPickup = await prisma.order.findFirst({
    where: {
      status: "PICKED_UP",
      pickedUpAt: {
        gte: today,
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    include: {
      listing: {
        include: {
          batch: {
            include: {
              product: true,
              branch: true,
            },
          },
        },
      },
    },
    orderBy: { pickedUpAt: "desc" },
  });

  if (!latestPickup) {
    return null;
  }

  const product = latestPickup.listing.batch.product.name;
  const quantity = latestPickup.quantity;
  const buyer = latestPickup.listing.batch.branch.name;
  const recovered = `₼${(latestPickup.totalAmount / 100).toFixed(2)}`;

  const narrative = await narrateEvent({
    type: "pickup",
    product,
    qty: quantity,
    buyer,
    recovered,
  });

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
      {narrative}
    </div>
  );
}
