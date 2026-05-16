"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { explainRiskAction } from "@/server/actions/explain-risk";

export function RiskExplainButton({ batchId }: { batchId: string }) {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExplain = async () => {
    setLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const result = await explainRiskAction(batchId);
      if (result.ok) {
        setExplanation(result.text);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to explain risk"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleExplain}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Sparkles size={14} className="flex-shrink-0" />
        {loading ? "Explaining..." : "Explain with AI"}
      </button>

      {explanation && (
        <div className="animate-fade-up bg-emerald-50 border border-emerald-200 text-slate-700 rounded-lg p-3 text-sm leading-relaxed">
          {explanation}
        </div>
      )}

      {error && (
        <div className="animate-fade-up bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
