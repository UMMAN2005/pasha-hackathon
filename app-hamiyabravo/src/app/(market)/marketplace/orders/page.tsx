import { getBuyerBids, getBuyerOrders } from "@/server/services/market";
import { requireRole } from "@/lib/session";
import { formatAzn } from "@/lib/money";
import { GlassCard, Pill, SectionTitle } from "@/components/ui/kit";

export default async function OrdersPage() {
  const user = await requireRole("BUSINESS_BUYER", "HQ_ADMIN");

  if (!user.companyId) {
    return (
      <GlassCard className="p-12 text-center">
        <p className="text-sm text-slate-600">No company selected</p>
      </GlassCard>
    );
  }

  const [bids, orders] = await Promise.all([
    getBuyerBids(user.companyId),
    getBuyerOrders(user.companyId),
  ]);

  const bidStatusMap = {
    LEADING: { tone: "ok", label: "Leading" },
    OUTBID: { tone: "bad", label: "Outbid" },
    WON: { tone: "ok", label: "Won" },
    LOST: { tone: "bad", label: "Lost" },
  } as const;

  return (
    <div className="space-y-10 pb-12">
      {bids.length > 0 && (
        <div className="space-y-6">
          <SectionTitle
            kicker="LIVE AUCTIONS"
            title="My bids"
            className="px-1"
          />

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {bids.map((bid) => (
              <GlassCard key={bid.id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-sm">
                      {bid.listingTitle}
                    </h3>
                    <p className="text-xs text-[var(--ink-soft)] mt-1">
                      {bid.quantity} qty × {formatAzn(bid.pricePerUnit)}/qty
                    </p>
                  </div>
                  <Pill tone={bidStatusMap[bid.status].tone}>
                    {bidStatusMap[bid.status].label}
                  </Pill>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-[var(--ink-soft)] mb-1">Total</p>
                  <p className="text-lg font-black text-slate-900">
                    {formatAzn(bid.total)}
                  </p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {orders.length > 0 && (
        <div className="space-y-6">
          <SectionTitle
            kicker="COMPLETED"
            title="My pickup codes"
            className="px-1"
          />

          <div className="space-y-4">
            {orders.map((order) => (
              <GlassCard key={order.id} className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-2">
                      Product
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {order.productTitle}
                    </p>
                    <p className="text-xs text-[var(--ink-soft)] mt-2">
                      {order.quantity} qty × {formatAzn(Math.round(order.totalAmount / order.quantity))}/qty
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-2">
                      Pickup code
                    </p>
                    <div
                      className="bg-brand text-white px-4 py-3 rounded-lg font-mono font-black text-xl text-center"
                      data-testid="pickup-code"
                    >
                      {order.pickupCode}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-2">
                      Total amount
                    </p>
                    <p className="text-xl font-black text-slate-900">
                      {formatAzn(order.totalAmount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-2">
                      Pickup window
                    </p>
                    <p className="text-sm text-slate-900 font-semibold">
                      {order.pickupStart.toLocaleDateString("az")} —{" "}
                      {order.pickupEnd.toLocaleDateString("az")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200">
                  <Pill
                    tone={
                      order.status === "RESERVED"
                        ? "amber"
                        : order.status === "PICKED_UP"
                          ? "ok"
                          : "bad"
                    }
                  >
                    {order.status === "RESERVED"
                      ? "Awaiting pickup"
                      : order.status === "PICKED_UP"
                        ? "Picked up"
                        : "Cancelled"}
                  </Pill>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {bids.length === 0 && orders.length === 0 && (
        <GlassCard className="p-12 text-center">
          <p className="text-sm text-slate-600">No bids or orders yet</p>
        </GlassCard>
      )}
    </div>
  );
}
