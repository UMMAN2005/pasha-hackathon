import Link from "next/link";
import { listBatches } from "@/server/services/inventory";
import { formatAzn } from "@/lib/money";
import { GlassCard, SectionTitle } from "@/components/ui/kit";
import { RiskExplainButton } from "./risk-explain";

function getRiskBadgeStyles(score: number) {
  if (score >= 80) return "bg-rose-100 text-rose-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  if (score >= 25) return "bg-amber-50 text-amber-600";
  return "bg-emerald-100 text-emerald-700";
}

export default async function InventoryListPage() {
  const batches = (await listBatches({})).slice(0, 10);

  return (
    <div className="p-8 space-y-8">
      <SectionTitle
        kicker="Risk management"
        title="Risk inventory"
        className="mb-2"
      />

      {batches.length === 0 ? (
        <GlassCard className="p-12 text-center" rise>
          <p className="text-slate-900 text-lg">No products found</p>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {batches.map((batch, idx) => (
            <div
              key={batch.id}
              className={`animate-fade-up ${idx === 0 ? "" : idx === 1 ? "delay-1" : idx === 2 ? "delay-2" : "delay-3"}`}
            >
              <GlassCard
                className="p-5 border border-slate-200 hover:border-slate-300 transition-colors"
                rise
              >
                <div className="space-y-4">
                  {/* Header row: Product info + Risk badge */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/admin/inventory/${batch.id}`}>
                        <h3 className="text-base font-bold text-slate-900 hover:text-emerald-700 truncate transition-colors">
                          {batch.product}
                        </h3>
                      </Link>
                      <p className="text-xs text-slate-500 mt-1">
                        {batch.sku} • {batch.branch}
                      </p>
                    </div>
                    <div
                      className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-sm font-bold flex-shrink-0 ${getRiskBadgeStyles(batch.riskScore)}`}
                    >
                      {batch.riskScore}
                    </div>
                  </div>

                  {/* Stats grid: 4 columns */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Quantity
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {batch.quantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Days to Expiry
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {batch.daysToExpiry}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Expected Loss
                      </p>
                      <p className="text-sm font-bold text-rose-600 mt-1">
                        {formatAzn(batch.expectedLoss)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Recommendation
                      </p>
                      <p className="text-xs text-slate-700 mt-1 line-clamp-2">
                        {batch.recommendedAction}
                      </p>
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="pt-1 border-t border-slate-200 flex justify-end">
                    <RiskExplainButton batchId={batch.id} />
                  </div>
                </div>
              </GlassCard>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
