import { prisma } from "@/lib/db";
import { formatAzn } from "@/lib/money";
import { getToday, daysBetween } from "@/lib/clock";
import { RecommendationCard } from "./card";
import { GlassCard, SectionTitle, AIBadge } from "@/components/ui/kit";
import { discountPercent, listingUnitPrice } from "@/domain/decision";
import { AI_QUEUE_LIMIT } from "@/lib/queue";
import { AlertCircle } from "lucide-react";

// Expected share of the lot value that actually clears at auction.
const CLEARANCE_RATE = 0.92;

export default async function RecommendationsPage() {
  const recs = await prisma.recommendation.findMany({
    where: { status: "PENDING" },
    include: {
      batch: {
        include: {
          product: true,
          riskScores: {
            orderBy: { generatedAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { expectedRecovery: "desc" },
    take: AI_QUEUE_LIMIT,
  });

  const today = getToday();

  // Every shown number derives from the same source so the card is coherent:
  //   units      = on-hand − reserved
  //   AI price   = risk-discounted unit price (floored at cost)
  //   Lot value  = units × AI price            (the custom-price default)
  //   Recoverable= lot value × clearance rate  (realistic auction outcome)
  //   At risk    = units × retail              (lost if nothing is done)
  const cards = recs.map((rec) => {
    const riskScore = rec.batch.riskScores[0]?.riskScore ?? 0;
    const confidence = rec.batch.riskScores[0]?.confidence ?? 0.5;
    const aiPrice = listingUnitPrice(
      rec.batch.retailPrice,
      rec.batch.costPerUnit,
      discountPercent(riskScore)
    );
    const availableQty =
      rec.batch.quantityOnHand - rec.batch.quantityReserved;
    const lotValue = aiPrice * availableQty;
    const recoverable = Math.round(lotValue * CLEARANCE_RATE);
    const atRisk = rec.batch.retailPrice * availableQty;
    const daysToExpiry = Math.max(
      0,
      daysBetween(rec.batch.expiryDate, today)
    );
    const confidenceWords =
      confidence >= 0.8 ? "high" : confidence >= 0.6 ? "medium" : "low";
    return {
      rec,
      aiPrice,
      availableQty,
      lotValue,
      recoverable,
      atRisk,
      daysToExpiry,
      confidenceWords,
    };
  });

  const totalAtRisk = cards.reduce((s, c) => s + c.atRisk, 0);
  const totalRecoverable = cards.reduce((s, c) => s + c.recoverable, 0);

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-emerald-600" />
          <SectionTitle
            kicker="AI Insights"
            title="AI Recommendation Queue"
            className="mb-0"
          />
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-sm">
            <span className="text-slate-900 font-bold">{cards.length}</span>
            <span className="text-slate-500 ml-1">recommendations</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-slate-300" />
          <div className="text-sm">
            <span className="text-rose-600 font-bold">{formatAzn(totalAtRisk)}</span>
            <span className="text-slate-500 ml-1">at risk</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-slate-300" />
          <div className="text-sm">
            <span className="text-emerald-700 font-bold">{formatAzn(totalRecoverable)}</span>
            <span className="text-slate-500 ml-1">recoverable</span>
          </div>
        </div>
      </div>

      {cards.length === 0 ? (
        <GlassCard className="p-12 text-center" rise>
          <p className="text-slate-900 text-lg mb-2">Queue is empty</p>
          <p className="text-slate-500 text-sm">Everything is in good shape — great work!</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {cards.map((c, idx) => {
            const {
              rec,
              aiPrice,
              availableQty,
              lotValue,
              recoverable,
              daysToExpiry,
              confidenceWords,
            } = c;
            const expiryLabel =
              daysToExpiry === 1
                ? "Expires in 1 day"
                : `Expires in ${daysToExpiry} days`;

            const delayClass =
              idx === 0 ? "" : idx === 1 ? "delay-1" : idx === 2 ? "delay-2" : "delay-3";

            return (
              <div key={rec.id} className={`animate-fade-up ${delayClass}`}>
                <GlassCard className="p-6 border border-slate-200" rise>
                  <div className="grid grid-cols-12 gap-6 items-start">
                    {/* Product Image & Name */}
                    <div className="col-span-2">
                      <div className="space-y-3">
                        <div className="w-full aspect-square bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden">
                          <span className="text-3xl font-black text-emerald-600/50">
                            {rec.batch.product.name.charAt(0)}
                          </span>
                        </div>
                        <div className="min-h-[2.5rem]">
                          <h3 className="font-bold text-slate-900 text-sm leading-snug">
                            {rec.batch.product.name}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            {availableQty} units
                          </span>
                          <span className="inline-flex items-center rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                            {expiryLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="col-span-4 space-y-3">
                      <div>
                        <p className="text-sm text-slate-700 leading-relaxed italic">
                          "{rec.reason}"
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          Confidence:{" "}
                          <span className="font-bold capitalize text-slate-700">
                            {confidenceWords}
                          </span>
                        </p>
                      </div>
                      <div>
                        <AIBadge label="AI Generated" />
                      </div>
                    </div>

                    {/* Money Side-by-Side */}
                    <div className="col-span-3 space-y-3">
                      {/* Recoverable = lot value × clearance rate */}
                      <div className="rounded-lg p-4 bg-emerald-50 border border-emerald-200">
                        <p className="text-xs text-emerald-700 uppercase tracking-widest mb-2 font-bold">
                          Recoverable
                        </p>
                        <p className="text-2xl font-black text-slate-900">
                          +{formatAzn(recoverable)}
                        </p>
                        <p className="text-[11px] text-emerald-700/80 mt-1">
                          est. auction clearance of {formatAzn(lotValue)}
                        </p>
                      </div>
                      {/* AI recommended price (per unit) */}
                      <div className="rounded-lg p-4 bg-violet-50 border border-violet-200">
                        <p className="text-xs text-violet-700 uppercase tracking-widest mb-2 font-bold">
                          AI recommended price
                        </p>
                        <p className="text-2xl font-black text-slate-900">
                          {formatAzn(aiPrice)}
                          <span className="text-xs font-semibold text-slate-500">
                            {" "}
                            / unit
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-3">
                      <RecommendationCard
                        recId={rec.id}
                        defaultTotal={lotValue}
                        units={availableQty}
                      />
                    </div>
                  </div>
                </GlassCard>
              </div>
            );
          })}
          <p className="text-xs text-slate-500 text-center pt-4">
            Showing the {cards.length} highest-value recommendations
          </p>
        </div>
      )}
    </div>
  );
}
