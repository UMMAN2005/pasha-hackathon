import Link from "next/link";
import { listBatches } from "@/server/services/inventory";
import { RiskBadge } from "@/components/risk-badge";
import { formatAzn } from "@/lib/money";
import { productImage } from "@/lib/product-images";
import { GlassCard, SectionTitle, ProductThumb } from "@/components/ui/kit";

export default async function InventoryListPage() {
  const batches = await listBatches({});

  return (
    <div className="p-8 space-y-8">
      <SectionTitle
        kicker="📦 Risk Siyahısı"
        title="Müəyyən edilmiş məhsullar"
        className="mb-2"
      />

      {batches.length === 0 ? (
        <GlassCard className="p-12 text-center" rise>
          <p className="text-white text-lg">Heç bir məhsul tapılmadı</p>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {batches.map((batch, idx) => (
            <Link
              key={batch.id}
              href={`/admin/inventory/${batch.id}`}
              className={`group animate-fade-up ${idx === 0 ? "" : idx === 1 ? "delay-1" : idx === 2 ? "delay-2" : "delay-3"}`}
            >
              <GlassCard className="p-4 border border-white/10 hover:border-white/30 cursor-pointer" rise>
                <div className="flex gap-4">
                  {/* Photo */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                    <ProductThumb
                      src={productImage(batch.sku)}
                      alt={batch.product}
                      className="w-full h-full"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white truncate group-hover:text-violet-200">
                          {batch.product}
                        </h3>
                        <p className="text-xs text-violet-300 mt-1">
                          {batch.sku} • {batch.branch}
                        </p>
                      </div>
                      <RiskBadge score={batch.riskScore} />
                    </div>

                    {/* Stats row */}
                    <div className="flex gap-6 mt-3 pt-3 border-t border-white/10">
                      <div>
                        <p className="text-xs text-violet-400">Miqdar</p>
                        <p className="text-sm font-bold text-white">
                          {batch.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-violet-400">Müddət</p>
                        <p className="text-sm font-bold text-white">
                          {batch.daysToExpiry} gün
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-violet-400">İtki Riski</p>
                        <p className="text-sm font-bold bg-gradient-to-r from-rose-300 to-pink-300 bg-clip-text text-transparent">
                          {formatAzn(batch.expectedLoss)}
                        </p>
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-xs text-violet-400">Tövsiyə</p>
                        <p className="text-xs text-violet-100 truncate">
                          {batch.recommendedAction.substring(0, 50)}...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
