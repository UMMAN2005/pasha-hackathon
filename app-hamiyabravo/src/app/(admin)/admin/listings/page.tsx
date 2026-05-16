"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { confirmPickupAction } from "@/server/actions/confirm-pickup";
import { acceptBidAction, getBidAdvice } from "@/server/actions/bid";
import { listAuctions, getAuction, getClosedAuctions } from "@/server/services/auction";
import { productImage } from "@/lib/product-images";
import { formatAzn } from "@/lib/money";
import { GlassCard, ProductThumb, AIBadge, SectionTitle, Pill } from "@/components/ui/kit";
import { Package, MapPin, Trophy, AlertCircle, CheckCircle } from "lucide-react";
import type { AuctionCard, AuctionDetail, ClosedAuction } from "@/server/services/auction";
import type { BidAdvice } from "@/server/ai/insights";

export default function ListingsPage() {
  const [loading, setLoading] = useState(false);
  const [pickupCode, setPickupCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [auctions, setAuctions] = useState<AuctionCard[]>([]);
  const [closedAuctions, setClosedAuctions] = useState<ClosedAuction[]>([]);
  const [auctionDetails, setAuctionDetails] = useState<Record<string, AuctionDetail | null>>({});
  const [bidAdvice, setBidAdvice] = useState<Record<string, BidAdvice | null>>({});
  const [loadingListings, setLoadingListings] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const list = await listAuctions();
        setAuctions(list);

        for (const auction of list) {
          const detail = await getAuction(auction.id);
          if (detail) {
            setAuctionDetails(prev => ({ ...prev, [auction.id]: detail }));
            const advice = await getBidAdvice(auction.id);
            if (advice) {
              setBidAdvice(prev => ({ ...prev, [auction.id]: advice }));
            }
          }
        }

        const closed = await getClosedAuctions();
        setClosedAuctions(closed);
      } catch (e) {
        console.error("Failed to load auctions", e);
      } finally {
        setLoadingListings(false);
      }
    };
    load();
  }, []);

  const handleConfirmPickup = async () => {
    if (!pickupCode.trim()) {
      setError("Enter pickup code");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await confirmPickupAction({ pickupCode });

    if (result.ok) {
      setSuccess(`Pickup confirmed: ${pickupCode}`);
      setPickupCode("");
      router.refresh();
    } else {
      setError(result.error || "An error occurred");
    }

    setLoading(false);
  };

  const handleAcceptBid = async (bidId: string) => {
    setLoading(true);
    const result = await acceptBidAction({ bidId });
    if (result.ok) {
      setSuccess(`Auction closed! Code: ${result.pickupCode}`);
      router.refresh();
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Pickup Confirmation Section */}
      <div className="animate-fade-up">
        <GlassCard className="p-6 border border-emerald-200/20" rise>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Confirm pickup
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Pickup code (e.g. ABC123)"
              value={pickupCode}
              onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg font-mono text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-emerald-500/50"
              data-testid="pickup-input"
            />
            <button
              onClick={handleConfirmPickup}
              disabled={loading}
              className="btn-grad text-white font-bold px-6 py-2 rounded-lg hover:scale-105 transition-transform disabled:opacity-50"
              data-testid="pickup-submit"
            >
              {loading ? "..." : "Confirm"}
            </button>
          </div>
          {error && (
            <p className="text-sm text-rose-400 mt-3">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-400 mt-3">{success}</p>
          )}
        </GlassCard>
      </div>

      {/* Auctions Section */}
      <div className="space-y-6 animate-fade-up delay-1">
        <SectionTitle
          kicker="Auction center"
          title="Active listings"
          className="mb-4"
        />

        {loadingListings ? (
          <GlassCard className="p-12 text-center" rise>
            <p className="text-emerald-200 animate-pulse">Loading listings...</p>
          </GlassCard>
        ) : auctions.length === 0 ? (
          <GlassCard className="p-12 text-center" rise>
            <p className="text-white text-lg">No active listings</p>
            <p className="text-emerald-300 text-sm mt-2">New listings coming soon</p>
          </GlassCard>
        ) : (
          <div className="grid gap-5">
            {auctions.map((auction, idx) => {
              const detail = auctionDetails[auction.id];
              const advice = bidAdvice[auction.id];
              const recommendedBid = advice?.recommendedBidId
                ? detail?.bids.find(b => b.id === advice.recommendedBidId)
                : null;

              return (
                <div
                  key={auction.id}
                  className={`animate-fade-up ${idx === 0 ? "" : idx === 1 ? "delay-1" : "delay-2"}`}
                >
                  <GlassCard className="p-6 border border-white/10 hover:border-white/30" rise>
                    <div className="grid grid-cols-4 gap-6">
                      {/* Photo & Title */}
                      <div className="col-span-1 space-y-3">
                        <div className="aspect-square rounded-lg overflow-hidden border border-white/20">
                          <ProductThumb
                            src={productImage(auction.category || "default")}
                            alt={auction.title}
                            className="w-full h-full"
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm line-clamp-2">
                            {auction.title}
                          </h3>
                          <p className="text-xs text-emerald-300 mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {auction.city}
                          </p>
                        </div>
                      </div>

                      {/* Prices & Info */}
                      <div className="col-span-1 space-y-3">
                        <div>
                          <p className="text-xs text-emerald-400 uppercase tracking-widest">Minimum</p>
                          <p className="text-lg font-bold text-white">
                            {formatAzn(auction.askPrice)}
                          </p>
                          <p className="text-xs text-emerald-300">-{auction.discountPercent}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-emerald-400 uppercase tracking-widest">Quantity</p>
                          <p className="text-lg font-bold text-white">
                            {auction.qty}
                          </p>
                        </div>
                      </div>

                      {/* Bid Leaderboard */}
                      <div className="col-span-1 space-y-2">
                        <p className="text-xs text-emerald-400 uppercase tracking-widest font-bold">
                          Bids ({auction.bidCount})
                        </p>
                        {detail?.bids.slice(0, 3).map((bid, bidIdx) => {
                          const isRecommended = recommendedBid?.id === bid.id;
                          const medals = [Trophy, Trophy, Trophy];
                          const Medal = medals[bidIdx] || Trophy;
                          return (
                            <div
                              key={bid.id}
                              className={`flex items-center gap-2 p-2 rounded-lg ${
                                isRecommended
                                  ? "bg-emerald-500/20 border border-emerald-400/50 ring-2 ring-emerald-400/30"
                                  : "bg-white/5 border border-white/10"
                              }`}
                            >
                              <div className="text-xs font-bold w-5">
                                {bidIdx === 0 ? (
                                  <Trophy className="h-4 w-4 text-yellow-400" />
                                ) : bidIdx === 1 ? (
                                  <Trophy className="h-4 w-4 text-gray-300" />
                                ) : (
                                  <Trophy className="h-4 w-4 text-orange-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-white truncate">
                                  {bid.buyerName}
                                </p>
                                <p className="text-xs text-emerald-300">
                                  {formatAzn(bid.pricePerUnit)}/unit
                                </p>
                              </div>
                              {isRecommended && <AlertCircle className="h-3 w-3 text-emerald-400" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* AI Advice & Actions */}
                      <div className="col-span-1 space-y-3 flex flex-col">
                        {advice && recommendedBid && (
                          <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-lg p-3 flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <AIBadge label="Pick" />
                            </div>
                            <p className="text-xs text-emerald-200 leading-tight">
                              {advice.reasoning}
                            </p>
                            <button
                              onClick={() => handleAcceptBid(recommendedBid.id)}
                              disabled={loading}
                              className="w-full mt-2 btn-grad text-white text-sm font-bold py-2 rounded-lg hover:scale-105 transition-transform disabled:opacity-50"
                            >
                              {loading ? "..." : "Accept"}
                            </button>
                          </div>
                        )}

                        {/* Other bid accept buttons */}
                        {detail?.bids.slice(0, 2).map(bid => (
                          !recommendedBid || bid.id !== recommendedBid.id ? (
                            <button
                              key={bid.id}
                              onClick={() => handleAcceptBid(bid.id)}
                              disabled={loading}
                              className="text-xs px-3 py-2 border border-white/20 text-white rounded-lg hover:border-white/40 hover:bg-white/5 disabled:opacity-50 transition-all"
                            >
                              Accept
                            </button>
                          ) : null
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Closed Auctions Section */}
      <div className="space-y-6 animate-fade-up delay-2">
        <SectionTitle
          kicker="Auction center"
          title={`Auctioned & sold (${closedAuctions.length})`}
          className="mb-4"
        />

        {closedAuctions.length === 0 ? (
          <GlassCard className="p-12 text-center" rise>
            <CheckCircle className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-white text-lg font-semibold">No closed auctions yet</p>
            <p className="text-emerald-300 text-sm mt-1">
              Completed auctions will appear here
            </p>
          </GlassCard>
        ) : (
          <div className="grid gap-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 font-bold text-emerald-300">Product</th>
                    <th className="text-left py-3 px-4 font-bold text-emerald-300">Category · City</th>
                    <th className="text-left py-3 px-4 font-bold text-emerald-300">Buyer</th>
                    <th className="text-right py-3 px-4 font-bold text-emerald-300">Unit price</th>
                    <th className="text-right py-3 px-4 font-bold text-emerald-300">Qty</th>
                    <th className="text-right py-3 px-4 font-bold text-emerald-300">Total</th>
                    <th className="text-center py-3 px-4 font-bold text-emerald-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {closedAuctions.map((auction) => (
                    <tr
                      key={auction.id}
                      className="border-b border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                            <ProductThumb
                              src={auction.image}
                              alt={auction.title}
                              className="w-full h-full"
                            />
                          </div>
                          <span className="text-white font-semibold truncate">
                            {auction.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-emerald-300 text-xs">
                          {auction.category} · {auction.city}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-white font-semibold">
                          {auction.buyer ?? "—"}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="text-white font-bold">
                          {formatAzn(auction.soldPrice)}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="text-white font-semibold">{auction.qty}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="text-white font-black">
                          {formatAzn(auction.total)}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center">
                          {auction.status === "RESERVED" ? (
                            <Pill tone="amber">
                              Awaiting pickup
                            </Pill>
                          ) : auction.pickedUp ? (
                            <Pill tone="ok">
                              Completed
                            </Pill>
                          ) : (
                            <Pill tone="amber">
                              Awaiting pickup
                            </Pill>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
