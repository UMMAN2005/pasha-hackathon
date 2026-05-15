"use client";

import { useState } from "react";
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
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
        >
          {loading ? "Hazırlanan..." : "Təsdiqlə"}
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 disabled:bg-slate-400 transition-colors"
        >
          {loading ? "..." : "Rədd et"}
        </button>
      </div>
    </div>
  );
}
