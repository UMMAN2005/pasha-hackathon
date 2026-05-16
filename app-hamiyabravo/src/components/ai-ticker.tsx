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
  const ref = useRef(tips);
  ref.current = tips;

  useEffect(() => {
    const full = ref.current[idx];
    if (len < full.length) {
      const t = setTimeout(() => setLen((l) => l + 1), 26);
      return () => clearTimeout(t);
    }
    const hold = setTimeout(() => {
      setLen(0);
      setIdx((i) => (i + 1) % ref.current.length);
    }, 2800);
    return () => clearTimeout(hold);
  }, [len, idx]);

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-emerald-200/70 bg-white/60 px-4 py-2.5 shadow-sm backdrop-blur">
      <span className="bg-brand grid h-9 w-9 flex-none place-items-center rounded-xl text-white shadow">
        <Sparkles className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold tracking-wide text-emerald-700">
            Bravo&nbsp;AI
          </span>
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        </div>
        <p className="truncate text-sm font-semibold text-[var(--ink)]">
          {tips[idx].slice(0, len)}
          <span className="ml-px inline-block h-3.5 w-0.5 -translate-y-px animate-pulse rounded bg-emerald-500 align-middle" />
        </p>
      </div>
    </div>
  );
}
