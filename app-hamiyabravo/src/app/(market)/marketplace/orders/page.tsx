import { getBuyerBids, getBuyerOrders } from "@/server/services/market";
import { requireRole } from "@/lib/session";
import { formatAzn } from "@/lib/money";
import { GlassCard, Pill, SectionTitle } from "@/components/ui/kit";

export default async function OrdersPage() {
  const user = await requireRole("BUSINESS_BUYER", "HQ_ADMIN");

  if (!user.companyId) {
    return (
      <GlassCard className="p-12 text-center">
        <p className="text-sm text-slate-600">Şirkət seçilməyib</p>
      </GlassCard>
    );
  }

  const [bids, orders] = await Promise.all([
    getBuyerBids(user.companyId),
    getBuyerOrders(user.companyId),
  ]);

  const bidStatusMap = {
    LEADING: { tone: "ok", label: "Lider" },
    OUTBID: { tone: "bad", label: "Üstələnib" },
    WON: { tone: "ok", label: "Qazandı" },
    LOST: { tone: "bad", label: "İtirdi" },
  } as const;

  return (
    <div className="space-y-10 pb-12">
      {bids.length > 0 && (
        <div className="space-y-6">
          <SectionTitle
            kicker="CANLI HƏRRAC"
            title="Mənim Təkliflərim"
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
                      {bid.quantity} ədəd × {formatAzn(bid.pricePerUnit)}/ədəd
                    </p>
                  </div>
                  <Pill tone={bidStatusMap[bid.status].tone}>
                    {bidStatusMap[bid.status].label}
                  </Pill>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-[var(--ink-soft)] mb-1">Cəmi məbləğ</p>
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
            kicker="TAMAMLANMIŞ"
            title="Qaldırış Kodlarım"
            className="px-1"
          />

          <div className="space-y-4">
            {orders.map((order) => (
              <GlassCard key={order.id} className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-2">
                      Məhsul
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {order.productTitle}
                    </p>
                    <p className="text-xs text-[var(--ink-soft)] mt-2">
                      {order.quantity} ədəd × {formatAzn(Math.round(order.totalAmount / order.quantity))}/ədəd
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-2">
                      Qaldırış Kodu
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
                      Cəmi Məbləğ
                    </p>
                    <p className="text-xl font-black text-slate-900">
                      {formatAzn(order.totalAmount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-2">
                      Qaldırış Pəncərəsi
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
                      ? "Qaldırış Gözləmədə"
                      : order.status === "PICKED_UP"
                        ? "Qaldırıldı"
                        : "Ləğv Edilib"}
                  </Pill>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {bids.length === 0 && orders.length === 0 && (
        <GlassCard className="p-12 text-center">
          <p className="text-sm text-slate-600">Hələ təklif və ya sifariş yoxdur</p>
        </GlassCard>
      )}
    </div>
  );
}
