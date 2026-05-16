"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { approveRecommendation, rejectRecommendation } from "@/server/actions/approve";

interface RecommendationCardProps {
  recId: string;
}

export function RecommendationCard({ recId }: RecommendationCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [approved, setApproved] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    setError("");
    try {
      await approveRecommendation({ recId });
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
        <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
          <Check className="h-5 w-5 text-emerald-300" />
        </div>
        <p className="text-xs text-emerald-300 font-semibold">Done</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 h-full flex flex-col justify-end">
      {error && (
        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-400/20 rounded px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 btn-grad text-white font-bold py-2.5 rounded-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/20"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          <span>{loading ? "..." : "Approve"}</span>
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="flex-1 px-4 py-2.5 border-2 border-white/20 text-white font-semibold rounded-lg hover:border-white/40 hover:bg-white/5 disabled:opacity-50 disabled:cursor-wait transition-all flex items-center justify-center gap-2"
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
