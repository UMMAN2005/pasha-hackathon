import { getBranchesOverview } from "@/server/services/branches";
import { AzerbaijanMap } from "./azerbaijan-map";
import { SectionTitle } from "@/components/ui/kit";
import { formatAzn } from "@/lib/money";

export default async function BranchesPage() {
  const branches = await getBranchesOverview();
  const totalLoss = branches.reduce((s, b) => s + b.openLoss, 0);
  const totalRisk = branches.reduce((s, b) => s + b.atRiskCount, 0);

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex items-end justify-between">
        <SectionTitle
          kicker="Branch network"
          title="Azerbaijan — live waste map"
        />
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)]">
              At-risk batches
            </p>
            <p className="text-2xl font-black text-rose-600">{totalRisk}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)]">
              Open loss
            </p>
            <p className="text-2xl font-black text-rose-600">
              {formatAzn(totalLoss)}
            </p>
          </div>
        </div>
      </div>

      <div className="animate-fade-up delay-1">
        <AzerbaijanMap branches={branches} />
      </div>
    </div>
  );
}
