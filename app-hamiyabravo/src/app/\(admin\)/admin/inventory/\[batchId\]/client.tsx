"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { explainRecommendation } from "@/server/ai/explain";
import { formatAzn } from "@/lib/money";

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

  const handleExplain = async () => {
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
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => {
          setExplainOpen(!explainOpen);
          if (!explainOpen && !explanation) {
            handleExplain();
          }
        }}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <span className="font-semibold text-slate-900">Niyə?</span>
        <ChevronDown
          className={`w-5 h-5 text-slate-600 transition-transform ${
            explainOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {explainOpen && (
        <div className="px-6 pb-4 border-t border-slate-200 pt-4">
          <p className="text-slate-700">{explanation || "Yüklənir..."}</p>
        </div>
      )}
    </div>
  );
}
