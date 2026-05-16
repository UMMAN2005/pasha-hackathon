"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { approveRecommendation, rejectRecommendation } from "@/server/actions/approve";

interface RecommendationCardProps {
  recId: string;
}

export function RecommendationCard({ recId }: RecommendationCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleApprove = async () => {
    setLoading(true);
    setError("");
    try {
      await approveRecommendation({ recId });
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error rejecting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 h-full flex flex-col justify-end">
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 btn-grad text-white font-bold py-2 rounded-lg hover:scale-105 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Check className="h-4 w-4" />
          {loading ? "..." : "Approve"}
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="flex-1 px-4 py-2 border-2 border-white/20 text-white font-semibold rounded-lg hover:border-white/40 hover:bg-white/5 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          <X className="h-4 w-4" />
          {loading ? "..." : "Reject"}
        </button>
      </div>
    </div>
  );
}
