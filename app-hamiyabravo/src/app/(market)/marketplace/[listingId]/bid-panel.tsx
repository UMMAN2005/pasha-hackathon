"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { placeBidAction } from "@/server/actions/bid";
import { formatAzn } from "@/lib/money";
import { GlassCard, Pill } from "@/components/ui/kit";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

interface BidPanelProps {
  listingId: string;
  minNextBid: number;
  minQty: number;
  qty: number;
  askPrice: number;
  status: string;
}

export function BidPanel({
  listingId,
  minNextBid,
  minQty,
  qty,
  askPrice,
  status,
}: BidPanelProps) {
  const [pricePerUnit, setPricePerUnit] = useState(minNextBid);
  const [quantity, setQuantity] = useState(minQty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const step = useMemo(
    () => Math.max(50, Math.round(minNextBid * 0.05)),
    [minNextBid]
  );

  useEffect(() => {
    setPricePerUnit(minNextBid);
  }, [minNextBid]);

  useEffect(() => {
    setQuantity(minQty);
  }, [minQty]);

  const total = pricePerUnit * quantity;
  const isActive = status === "ACTIVE";

  const setPrice = (v: number) =>
    setPricePerUnit(Math.max(minNextBid, Math.round(v)));
  const setQty = (v: number) =>
    setQuantity(Math.max(minQty, Math.min(qty, Math.round(v))));

  const handleBid = async () => {
    if (pricePerUnit < minNextBid) {
      setError(`Minimum bid is ${formatAzn(minNextBid)}/unit`);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await placeBidAction({ listingId, pricePerUnit, quantity });

    setLoading(false);
    if (result.ok) {
      setSuccess("Your bid is now leading!");
      setPricePerUnit(minNextBid);
      setQuantity(minQty);
      setTimeout(() => router.refresh(), 600);
    } else {
      setError(result.error);
    }
  };

  if (!isActive) {
    return (
      <div className="sticky top-24">
        <GlassCard className="p-8 text-center card-rise border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Auction ended</h3>
          <p className="text-sm text-[var(--ink-soft)] mt-2 mb-5">
            This lot has been awarded to the winning bidder.
          </p>
          <Link
            href="/marketplace"
            className="btn-grad w-full py-3 text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2"
          >
            Browse live auctions
            <ArrowRight className="w-4 h-4" />
          </Link>
        </GlassCard>
      </div>
    );
  }

  const priceChips = [
    { label: "Min", v: minNextBid },
    { label: `+${formatAzn(step)}`, v: minNextBid + step },
    { label: `+${formatAzn(step * 2)}`, v: minNextBid + step * 2 },
  ];
  const qtyChips = [
    { label: `Min ${minQty}`, v: minQty },
    { label: "Half", v: Math.max(minQty, Math.round(qty / 2)) },
    { label: `Max ${qty}`, v: qty },
  ];

  return (
    <div className="sticky top-24 space-y-4">
      <GlassCard className="p-6 card-rise">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-black text-slate-900">Place your bid</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-red-600">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-red-500" />
            Live
          </span>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-900 block mb-2">
              Price per unit
            </label>
            <input
              type="number"
              min={minNextBid}
              value={pricePerUnit}
              onChange={(e) => setPrice(Number(e.target.value) || minNextBid)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-2)] transition"
            />
            <div className="mt-2 flex gap-1.5">
              {priceChips.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setPrice(c.v)}
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:border-[var(--brand-2)] hover:text-[var(--brand-2)] transition"
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--ink-soft)] mt-1.5">
              Minimum next bid: {formatAzn(minNextBid)}
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-900 block mb-2">
              Quantity (units)
            </label>
            <input
              type="number"
              min={minQty}
              max={qty}
              value={quantity}
              onChange={(e) => setQty(Number(e.target.value) || minQty)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-2)] transition"
            />
            <div className="mt-2 flex gap-1.5">
              {qtyChips.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setQty(c.v)}
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:border-[var(--brand-2)] hover:text-[var(--brand-2)] transition"
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--ink-soft)] mt-1.5">
              Min order {minQty} · max available {qty}
            </p>
          </div>

          <div className="rounded-xl bg-brand p-4 text-white">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">
              Total bid
            </p>
            <p className="text-3xl font-black mt-1">{formatAzn(total)}</p>
            <p className="text-xs text-white/70 mt-1">
              {quantity} units × {formatAzn(pricePerUnit)}
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3">
              <p className="text-xs text-rose-700 font-semibold">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 animate-pop">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-emerald-700" />
                </span>
                <p className="text-sm text-emerald-700 font-semibold">
                  {success}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleBid}
            disabled={loading}
            className="btn-grad w-full py-3.5 text-sm font-bold rounded-xl disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
          >
            {loading ? "Processing…" : "Place bid"}
          </button>
        </div>
      </GlassCard>

      <GlassCard className="p-4 border border-slate-200">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-3">
          Key details
        </p>
        <div className="space-y-2.5 text-xs text-slate-600">
          <div className="flex justify-between items-center">
            <span>Ask price</span>
            <span className="font-semibold text-slate-900">
              {formatAzn(askPrice)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Available</span>
            <span className="font-semibold text-slate-900">{qty} units</span>
          </div>
          <div className="border-t border-slate-200 pt-2.5 mt-2.5 flex justify-between items-center">
            <span>Min. order</span>
            <Pill tone="ok">{minQty} units</Pill>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
