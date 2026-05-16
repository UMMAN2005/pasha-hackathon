"use client";

import { useState } from "react";
import Link from "next/link";
import { X, MapPin, AlertTriangle, Boxes, TrendingDown } from "lucide-react";
import { formatAzn } from "@/lib/money";
import type { BranchOverview } from "@/server/services/branches";

// Approx city anchors on the stylized Azerbaijan map (viewBox 1000x560).
const CITY: Record<string, { x: number; y: number }> = {
  Baku: { x: 905, y: 300 },
  Sumqayit: { x: 845, y: 252 },
  Ganja: { x: 345, y: 300 },
  Nakhchivan: { x: 150, y: 470 },
};

const AZ_PATH =
  "M150,165 L300,120 L520,95 L735,140 L795,210 L835,250 L960,300 L865,330 L740,415 L545,460 L360,455 L235,420 L150,330 Z";

function positions(branches: BranchOverview[]) {
  const byCity = new Map<string, BranchOverview[]>();
  for (const b of branches) {
    byCity.set(b.city, [...(byCity.get(b.city) ?? []), b]);
  }
  const out: { b: BranchOverview; x: number; y: number }[] = [];
  for (const [city, list] of byCity) {
    const c = CITY[city] ?? { x: 500, y: 280 };
    list.forEach((b, i) => {
      const ang = (i / Math.max(1, list.length)) * Math.PI * 2;
      const r = list.length > 1 ? 26 : 0;
      out.push({
        b,
        x: c.x + Math.cos(ang) * r,
        y: c.y + Math.sin(ang) * r,
      });
    });
  }
  return out;
}

export function AzerbaijanMap({ branches }: { branches: BranchOverview[] }) {
  const [sel, setSel] = useState<BranchOverview | null>(null);
  const pts = positions(branches);

  return (
    <div className="relative">
      <div className="glass rounded-3xl p-6">
        <svg viewBox="0 0 1000 560" className="h-auto w-full">
          <defs>
            <linearGradient id="azfill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="azstroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>
          </defs>

          <text
            x="965"
            y="245"
            fontSize="15"
            fill="#0d9488"
            opacity="0.6"
            transform="rotate(90 965 245)"
          >
            Caspian Sea
          </text>

          <path
            d={AZ_PATH}
            fill="url(#azfill)"
            stroke="url(#azstroke)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Nakhchivan exclave */}
          <circle
            cx="150"
            cy="470"
            r="34"
            fill="url(#azfill)"
            stroke="url(#azstroke)"
            strokeWidth="3"
          />

          {pts.map(({ b, x, y }) => {
            const hot = b.topRisk >= 80;
            return (
              <g
                key={b.id}
                className="cursor-pointer"
                onClick={() => setSel(b)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r="22"
                  fill={hot ? "#f43f5e" : "#10b981"}
                  opacity="0.18"
                >
                  <animate
                    attributeName="r"
                    values="18;30;18"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx={x}
                  cy={y}
                  r="9"
                  fill={hot ? "#f43f5e" : "#10b981"}
                  stroke="#fff"
                  strokeWidth="3"
                />
                <text
                  x={x}
                  y={y - 28}
                  textAnchor="middle"
                  fontSize="15"
                  fontWeight="700"
                  fill="#0f2a1e"
                >
                  {b.name.replace("Bravo ", "")}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="mt-2 text-center text-xs font-semibold text-[var(--ink-soft)]">
          Tap a branch for live detail
        </p>
      </div>

      {sel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSel(null)}
        >
          <div
            className="glass animate-pop w-full max-w-md rounded-3xl p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-600">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {sel.city}
                  </span>
                </div>
                <h3 className="mt-1 text-2xl font-extrabold text-[var(--ink)]">
                  {sel.name}
                </h3>
              </div>
              <button
                onClick={() => setSel(null)}
                className="rounded-lg p-1.5 text-[var(--ink-soft)] hover:bg-black/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Stat
                icon={<Boxes className="h-4 w-4" />}
                label="Batches"
                value={String(sel.batchCount)}
              />
              <Stat
                icon={<AlertTriangle className="h-4 w-4" />}
                label="At risk"
                value={String(sel.atRiskCount)}
                tone="bad"
              />
              <Stat
                icon={<TrendingDown className="h-4 w-4" />}
                label="Open loss"
                value={formatAzn(sel.openLoss)}
                tone="bad"
              />
            </div>

            {sel.topProduct && (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                  Highest risk item
                </p>
                <p className="mt-1 font-bold text-[var(--ink)]">
                  {sel.topProduct} · risk {sel.topRisk}
                </p>
              </div>
            )}

            <Link
              href="/admin/inventory"
              className="btn-grad mt-6 block w-full py-3 text-center"
            >
              Open risk queue
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = "ok",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "ok" | "bad";
}) {
  return (
    <div className="rounded-2xl bg-white/70 p-3 text-center">
      <div
        className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg ${
          tone === "bad"
            ? "bg-rose-100 text-rose-600"
            : "bg-emerald-100 text-emerald-600"
        }`}
      >
        {icon}
      </div>
      <p className="text-sm font-extrabold text-[var(--ink)]">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
        {label}
      </p>
    </div>
  );
}
