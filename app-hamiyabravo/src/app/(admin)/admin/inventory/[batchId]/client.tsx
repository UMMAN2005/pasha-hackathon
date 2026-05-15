"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { explainRecommendation } from "@/server/ai/explain";
import { formatAzn } from "@/lib/money";
import { GlassCard } from "@/components/ui/kit";

interface BatchDetailClientProps {
  batchId: string;
  recommendation: { reason: string; expectedRecovery: number };
  product: string;
  quantity: number;
  daysToExpiry: number;
  riskScore: number;
  expectedLoss: number;
}

export function BatchDetailClient(props: BatchDetailClientProps) {
  const [explainOpen, setExplainOpen] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExplain = async () => {
    if (explanation) {
      setExplainOpen(!explainOpen);
      return;
    }
    setLoading(true);
    const exp = await explainRecommendation(
      { reason: props.recommendation.reason },
      {
        product: props.product,
        qty: props.quantity,
        daysToExpiry: props.daysToExpiry,
        riskBand: `${props.riskScore} (Kritik)`,
        expectedLoss: formatAzn(props.expectedLoss),
        expectedRecovery: formatAzn(props.recommendation.expectedRecovery),
      }
    );
    setExplanation(exp);
    setLoading(false);
    setExplainOpen(true);
  };

  return (
    <GlassCard className="border border-white/10 overflow-hidden" rise>
      <button
        onClick={handleExplain}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <span className="font-bold text-white">❓ Niyə?</span>
        <ChevronDown
          className={`w-5 h-5 text-violet-300 transition-transform ${
            explainOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {explainOpen && (
        <div className="px-6 pb-4 border-t border-white/10 pt-4 space-y-3">
          {loading ? (
            <p className="text-violet-200 animate-pulse">Yüklənir...</p>
          ) : (
            <p className="text-violet-100 leading-relaxed">{explanation}</p>
          )}
          <div className="pt-3 border-t border-white/10">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-lg p-3 border border-emerald-400/30">
                <p className="text-xs text-emerald-300 uppercase tracking-widest mb-1">Bərpa</p>
                <p className="font-bold text-emerald-200">
                  +{formatAzn(props.recommendation.expectedRecovery)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-lg p-3 border border-rose-400/30">
                <p className="text-xs text-rose-300 uppercase tracking-widest mb-1">Risk</p>
                <p className="font-bold text-rose-200">
                  {formatAzn(props.expectedLoss)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
