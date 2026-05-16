"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { placeBidAction } from "@/server/actions/bid";
import { formatAzn } from "@/lib/money";
import { GlassCard, Pill } from "@/components/ui/kit";
import { ArrowRight } from "lucide-react";
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

  useEffect(() => {
    setPricePerUnit(minNextBid);
  }, [minNextBid]);

  useEffect(() => {
    setQuantity(minQty);
  }, [minQty]);

  useEffect(() => {
    if (status === "ACTIVE") {
      const timer = setInterval(() => {
        router.refresh();
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [router, status]);

  const total = pricePerUnit * quantity;
  const isActive = status === "ACTIVE";

  const handleBid = async () => {
    if (pricePerUnit < minNextBid) {
      setError(`Minimum bid is ${formatAzn(minNextBid)}/qty`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await placeBidAction({
      listingId,
      pricePerUnit,
      quantity,
    });

    setLoading(false);

    if (result.ok) {
      setSuccess("Your bid is now leading!");
      setPricePerUnit(minNextBid);
      setQuantity(minQty);
      setTimeout(() => {
        router.refresh();
      }, 500);
    } else {
      setError(result.error);
    }
  };

  if (!isActive) {
    return (
      <div className="sticky top-24 space-y-4">
        <GlassCard className="p-8 text-center card-rise border border-slate-200">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Auction ended
              </h3>
              <p className="text-sm text-[var(--ink-soft)] mt-2">
                This auction has closed — winning bid secured.
              </p>
            </div>

            <Link
              href="/marketplace"
              className="btn-grad w-full py-3 text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2"
            >
              Back to marketplace
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="sticky top-24 space-y-4">
      <GlassCard className="p-6 card-rise">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-4">
          Place your bid
        </p>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-900 block mb-2">
              Price per unit (qapik)
            </label>
            <input
              type="number"
              min={minNextBid}
              value={pricePerUnit}
              onChange={(e) =>
                setPricePerUnit(Math.max(minNextBid, parseInt(e.target.value) || minNextBid))
              }
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-2)] transition"
            />
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
              onChange={(e) =>
                setQuantity(Math.max(minQty, Math.min(qty, parseInt(e.target.value) || minQty)))
              }
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-2)] transition"
            />
            <p className="text-xs text-[var(--ink-soft)] mt-1.5">
              Minimum order: {minQty} units, max available: {qty}
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-[var(--ink-soft)] mb-1.5 font-semibold">
              Total bid amount
            </p>
            <p className="text-3xl font-black text-slate-900">
              {formatAzn(total)}
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
                <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-black text-emerald-700">✓</span>
                </div>
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
            <span>Ask price:</span>
            <span className="font-semibold text-slate-900">{formatAzn(askPrice)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Available:</span>
            <span className="font-semibold text-slate-900">{qty} units</span>
          </div>
          <div className="border-t border-slate-200 pt-2.5 mt-2.5 flex justify-between items-center">
            <span>Min. order:</span>
            <Pill tone="ok">
              {minQty} qty
            </Pill>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
