"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

const ADMIN_TIPS = [
  "Greek Yogurt risk is 87 — publish the auction before noon to recover ~₼154.",
  "Astoria Hotel leads 2 auctions with 96% reliability — safe to auto-accept.",
  "Chicken Breast needs a compliance check first, then list it urgently.",
  "Bakery items peak at 18:00 — bundle Croissants for cafés.",
  "Branch A holds the highest open loss today — prioritize its queue.",
  "Accepting the top yogurt bid now closes the loop and lifts today's recovery.",
];
const MARKET_TIPS = [
  "Greek Yogurt 500g — 40% off, ending soon. Place a bid to lead.",
  "You're leading the Chicken Breast auction — stay above ₼5.40/unit.",
  "Fresh surplus from Branch C just opened — produce at a discount.",
  "Bundle deals on Bakery save the most before evening.",
  "Higher reliability gets your bids prioritized by Bravo AI.",
];

export function AiTicker({ surface }: { surface: "admin" | "marketplace" }) {
  const tips = surface === "admin" ? ADMIN_TIPS : MARKET_TIPS;
  const [idx, setIdx] = useState(0);
  const [len, setLen] = useState(0);
  const tipRef = useRef(tips);
  tipRef.current = tips;

  useEffect(() => {
    const full = tipRef.current[idx];
    if (len < full.length) {
      const t = setTimeout(() => setLen((l) => l + 1), 28);
      return () => clearTimeout(t);
    }
    const hold = setTimeout(() => {
      setLen(0);
      setIdx((i) => (i + 1) % tipRef.current.length);
    }, 2600);
    return () => clearTimeout(hold);
  }, [len, idx]);

  const text = tips[idx].slice(0, len);

  return (
    <div className="flex items-center gap-3 overflow-hidden">
      <span className="bg-brand flex h-8 w-8 flex-none items-center justify-center rounded-xl text-white shadow-sm">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-600">
          Bravo&nbsp;AI&nbsp;·&nbsp;live recommendation
        </p>
        <p className="truncate text-sm font-semibold text-[var(--ink)]">
          {text}
          <span className="ml-0.5 inline-block w-[2px] animate-pulse bg-emerald-500 align-middle">
            &nbsp;
          </span>
        </p>
      </div>
    </div>
  );
}
