"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { placeBidAction } from "@/server/actions/bid";
import { formatAzn } from "@/lib/money";
import { GlassCard } from "@/components/ui/kit";

interface BidPanelProps {
  listingId: string;
  minNextBid: number;
  qty: number;
  askPrice: number;
}

export function BidPanel({
  listingId,
  minNextBid,
  qty,
  askPrice,
}: BidPanelProps) {
  const [pricePerUnit, setPricePerUnit] = useState(minNextBid);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setPricePerUnit(minNextBid);
  }, [minNextBid]);

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [router]);

  const total = pricePerUnit * quantity;

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
      setQuantity(1);
      setTimeout(() => {
        router.refresh();
      }, 500);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="sticky top-24 space-y-4">
      <GlassCard className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-4">
          Place bid
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-900 block mb-2">
              Price per qty (qapik)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={minNextBid}
                value={pricePerUnit}
                onChange={(e) =>
                  setPricePerUnit(Math.max(minNextBid, parseInt(e.target.value) || minNextBid))
                }
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-2)]"
              />
            </div>
            <p className="text-xs text-[var(--ink-soft)] mt-1">
              Minimum: {formatAzn(minNextBid)}
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-900 block mb-2">
              Quantity (qty)
            </label>
            <input
              type="number"
              min={1}
              max={qty}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, Math.min(qty, parseInt(e.target.value) || 1)))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-2)]"
            />
          </div>

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-[var(--ink-soft)] mb-1">Total</p>
            <p className="text-2xl font-black text-slate-900">
              {formatAzn(total)}
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3">
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-xs text-emerald-700 font-semibold">{success}</p>
            </div>
          )}

          <button
            onClick={handleBid}
            disabled={loading}
            className="btn-grad w-full py-3 text-sm font-bold rounded-xl disabled:opacity-50"
          >
            {loading ? "Processing…" : "Place bid"}
          </button>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-3">
          Details
        </p>
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Ask price:</span>
            <span className="font-semibold text-slate-900">{formatAzn(askPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span>Available qty:</span>
            <span className="font-semibold text-slate-900">{qty} qty</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
