import { getAuction } from "@/server/services/auction";
import { formatAzn } from "@/lib/money";
import { GlassCard, Pill, SectionTitle } from "@/components/ui/kit";
import { BidPanel } from "./bid-panel";
import { notFound } from "next/navigation";
import { Trophy, Zap } from "lucide-react";

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
        {/* Product Photo */}
        <div className="lg:col-span-1">
          <GlassCard className="overflow-hidden card-rise">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={auction.image}
              alt={auction.title}
              className="w-full h-96 object-cover"
            />
          </GlassCard>
        </div>

        {/* Product Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-5xl font-black text-slate-900 mb-2">
                  {auction.title}
                </h1>
                <p className="text-sm text-[var(--ink-soft)]">
                  {auction.category} · {auction.city}
                </p>
              </div>
              {auction.status === "ACTIVE" && (
                <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full animate-pulse">
                  <div className="live-dot w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs font-bold text-red-600 uppercase tracking-widest">
                    LIVE
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <GlassCard className="p-5 card-rise">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-2">
                Ask price
              </p>
              <p className="text-2xl font-black text-slate-900">
                {formatAzn(auction.askPrice)}
              </p>
              {auction.discountPercent > 0 && (
                <div className="mt-3">
                  <Pill tone="bad">
                    {auction.discountPercent}% off
                  </Pill>
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-5 card-rise">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-2">
                Available qty
              </p>
              <p className="text-2xl font-black text-slate-900">
                {auction.qty}
              </p>
              <p className="text-xs text-[var(--ink-soft)] mt-2">units</p>
            </GlassCard>

            <GlassCard className="p-5 card-rise">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-2">
                Total bids
              </p>
              <p className="text-2xl font-black text-slate-900">
                {auction.bidCount}
              </p>
              <p className="text-xs text-[var(--ink-soft)] mt-2">
                {sortedBids.length > 0 ? "active" : "none yet"}
              </p>
            </GlassCard>
          </div>

          <GlassCard className="p-5 card-rise border border-slate-200">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-3">
              Pickup window
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {auction.pickupStart.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              —{" "}
              {auction.pickupEnd.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </GlassCard>
        </div>
      </div>

      {/* Live Bid Leaderboard & Bid Panel */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SectionTitle
            kicker={auction.status === "ACTIVE" ? "LIVE BIDS" : "BIDS"}
            title="Leaderboard"
          />

          {sortedBids.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Zap className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 font-semibold">
                No bids yet — be the first to bid
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {sortedBids.map((bid, idx) => (
                <GlassCard
                  key={bid.id}
                  className={`p-5 flex items-center justify-between gap-4 transition-all ${
                    idx === 0 ? "ring-ok ring-2 border-[var(--ok)]" : ""
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`w-10 h-10 flex items-center justify-center rounded-full font-bold ${
                        idx === 0
                          ? "bg-emerald-100"
                          : idx === 1
                          ? "bg-slate-100"
                          : "bg-amber-50"
                      }`}
                    >
                      {idx === 0 ? (
                        <Trophy className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <span
                          className={`text-sm font-black ${
                            idx === 1
                              ? "text-slate-600"
                              : "text-amber-600"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 text-sm">
                          {bid.buyerName}
                        </p>
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        <p className="text-xs text-[var(--ink-soft)]">
                          Reliability: {Math.round(bid.reliability)}%
                        </p>
                      </div>
                      <p className="text-xs text-[var(--ink-soft)] mt-1">
                        {bid.quantity} qty × {formatAzn(bid.pricePerUnit)}/qty
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    {idx === 0 && (
                      <Pill tone="ok">
                        Leading
                      </Pill>
                    )}
                    <p className="font-black text-slate-900 text-lg">
                      {formatAzn(bid.total)}
                    </p>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>

        {/* Sticky Bid Panel */}
        <div className="lg:col-span-1">
          <BidPanel
            listingId={listingId}
            minNextBid={auction.minNextBid}
            minQty={auction.minQty}
            qty={auction.qty}
            askPrice={auction.askPrice}
            status={auction.status}
          />
        </div>
      </div>
    </div>
  );
}
