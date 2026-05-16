"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const ADMIN_TIPS = [
  "Greek Yogurt risk is 87 — publish the auction before noon to recover ~₼154.",
  "Astoria Hotel leads 2 auctions and has 96% reliability — safe to auto-accept.",
  "Chicken Breast needs a compliance check first, then list it urgently.",
  "Bakery items peak demand at 18:00 — bundle Croissants for cafés.",
  "Branch A holds the highest open loss today — prioritize its queue.",
  "Accepting the top yogurt bid now closes the loop and lifts today's recovery.",
];

const MARKET_TIPS = [
  "Greek Yogurt 500g — 40% off, ends soon. Place a bid to lead.",
  "You are currently leading the Chicken Breast auction — stay above ₼5.40/unit.",
  "New surplus from Branch C just opened — fresh produce at a discount.",
  "Bundle deals on Bakery save you the most before evening.",
  "Higher reliability gets your bid prioritized by Bravo AI.",
];

export function AiTicker({ surface }: { surface: "admin" | "marketplace" }) {
  const tips = surface === "admin" ? ADMIN_TIPS : MARKET_TIPS;
  const [i, setI] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setI((p) => (p + 1) % tips.length);
        setShow(true);
      }, 280);
    }, 3000);
    return () => clearInterval(id);
  }, [tips.length]);

  return (
    <div className="flex items-center gap-3 overflow-hidden">
      <span className="bg-brand flex h-7 w-7 flex-none items-center justify-center rounded-lg text-white">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
          Bravo AI · live recommendation
        </p>
        <p
          className={`truncate text-sm font-semibold text-[var(--ink)] transition-all duration-300 ${
            show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
          }`}
        >
          {tips[i]}
        </p>
      </div>
    </div>
  );
}
