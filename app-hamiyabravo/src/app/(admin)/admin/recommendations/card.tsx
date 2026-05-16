"use client";

import { useState } from "react";
import { Check, X, Loader2, RotateCcw } from "lucide-react";
import { approveRecommendation, rejectRecommendation } from "@/server/actions/approve";
import { formatAzn } from "@/lib/money";

interface RecommendationCardProps {
  recId: string;
  // Default total (in qapik) — the current Recoverable value for this lot.
  defaultTotal: number;
  units: number;
}

export function RecommendationCard({
  recId,
  defaultTotal,
  units,
}: RecommendationCardProps) {
  const qty = Math.max(1, units);
  const defaultManat = (defaultTotal / 100).toFixed(2);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [approved, setApproved] = useState(false);
  const [price, setPrice] = useState(defaultManat);

  const manat = Number(price);
  const totalQapik = Math.round(manat * 100);
  const isCustom =
    price.trim() !== "" &&
    Number.isFinite(manat) &&
    manat > 0 &&
    totalQapik !== defaultTotal;

  const handleApprove = async () => {
    setLoading(true);
    setError("");
    try {
      await approveRecommendation(
        isCustom
          ? { recId, customPrice: Math.round(totalQapik / qty) }
          : { recId }
      );
      setApproved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error approving");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    setError("");
    try {
      await rejectRecommendation({ recId, reason: "User rejected" });
      setApproved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error rejecting");
    } finally {
      setLoading(false);
    }
  };

  if (approved) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
        <div className="h-8 w-8 rounded-full bg-emerald-100 border border-emerald-400 flex items-center justify-center">
          <Check className="h-5 w-5 text-emerald-600" />
        </div>
        <p className="text-xs text-emerald-700 font-semibold">Done</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 h-full flex flex-col justify-end">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-600">
            Set custom price (₼)
          </label>
          {isCustom && (
            <button
              type="button"
              onClick={() => setPrice(defaultManat)}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center rounded-lg border-2 border-slate-200 bg-white focus-within:border-emerald-400">
          <span className="pl-3 text-sm font-bold text-slate-500">₼</span>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={loading}
            className="w-full bg-transparent px-2 py-2 text-sm font-bold text-slate-900 outline-none disabled:opacity-50"
          />
        </div>
        <p className="text-[11px] text-slate-500">
          AI suggests <span className="font-bold">{formatAzn(defaultTotal)}</span>{" "}
          for {qty} units
        </p>
      </div>

      {error && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 btn-grad text-white font-bold py-2.5 rounded-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          <span>
            {loading
              ? "..."
              : isCustom
                ? "Approve at ₼" + manat.toFixed(2)
                : "Approve"}
          </span>
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-wait transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          <span>{loading ? "..." : "Reject"}</span>
        </button>
      </div>
    </div>
  );
}
