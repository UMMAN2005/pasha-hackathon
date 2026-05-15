import { getAuction } from "@/server/services/auction";
import { formatAzn } from "@/lib/money";
import { GlassCard, Pill, SectionTitle } from "@/components/ui/kit";
import { BidPanel } from "./bid-panel";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ listingId: string }>;
}

export default async function AuctionDetailPage({ params }: PageProps) {
  const { listingId } = await params;
  const auction = await getAuction(listingId);

  if (!auction) notFound();

  const sortedBids = [...auction.bids].sort(
    (a, b) => b.pricePerUnit - a.pricePerUnit
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <GlassCard className="overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={auction.image}
              alt={auction.title}
              className="w-full h-80 object-cover"
            />
          </GlassCard>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 mb-2">
              {auction.title}
            </h1>
            <p className="text-sm text-[var(--ink-soft)]">
              {auction.category} · {auction.city}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <GlassCard className="p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-2">
                Sorğu Qiyməti
              </p>
              <p className="text-2xl font-black text-slate-900">
                {formatAzn(auction.askPrice)}
              </p>
              <p className="text-xs text-[var(--ink-soft)] mt-2">
                {auction.discountPercent}% endirim
              </p>
            </GlassCard>

            <GlassCard className="p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-2">
                Mövcud Miqdar
              </p>
              <p className="text-2xl font-black text-slate-900">
                {auction.qty} ədəd
              </p>
            </GlassCard>
          </div>

          <GlassCard className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-3">
              Qaldırış Pəncərəsi
            </p>
            <p className="text-sm text-slate-900 font-semibold">
              {auction.pickupStart.toLocaleDateString("az")} —{" "}
              {auction.pickupEnd.toLocaleDateString("az")}
            </p>
          </GlassCard>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SectionTitle title="Liderlik Taxtası" kicker="AÇIQ TƏKLIFLƏR" />

          {sortedBids.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <p className="text-sm text-slate-600">Hələ təklif yoxdur. Birincisiniz olmaq istəyirsiniz?</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {sortedBids.map((bid, idx) => (
                <GlassCard
                  key={bid.id}
                  className={`p-4 flex items-center justify-between gap-4 transition ${
                    idx === 0 ? "ring-ok border-[var(--ok)]" : ""
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-lg font-black text-slate-900 w-10 h-10 flex items-center justify-center">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm">
                        {bid.buyerName}
                      </p>
                      <p className="text-xs text-[var(--ink-soft)] mt-1">
                        {bid.quantity} ədəd × {formatAzn(bid.pricePerUnit)}/ədəd
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {idx === 0 && <Pill tone="ok">Lider</Pill>}
                    <p className="font-black text-slate-900 text-lg mt-1">
                      {formatAzn(bid.total)}
                    </p>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <BidPanel
            listingId={listingId}
            minNextBid={auction.minNextBid}
            qty={auction.qty}
            askPrice={auction.askPrice}
          />
        </div>
      </div>
    </div>
  );
}
