import { getCustomers } from "@/server/services/customers";
import { GlassCard, SectionTitle, Pill } from "@/components/ui/kit";
import { formatAzn } from "@/lib/money";
import {
  Users,
  MapPin,
  ShieldCheck,
  Gavel,
  PackageCheck,
  Wallet,
} from "lucide-react";

export default async function CustomersPage() {
  const customers = await getCustomers();
  const totalSpent = customers.reduce((s, c) => s + c.totalSpent, 0);

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex items-end justify-between">
        <SectionTitle kicker="Partner network" title="Customers" />
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)]">
            Total recovered from buyers
          </p>
          <p className="text-2xl font-black text-emerald-600">
            {formatAzn(totalSpent)}
          </p>
        </div>
      </div>

      <div className="animate-fade-up grid gap-5 delay-1 md:grid-cols-2 xl:grid-cols-3">
        {customers.map((c) => (
          <GlassCard key={c.id} className="card-rise p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-[var(--ink)]">
                  {c.name}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--ink-soft)]">
                  <MapPin className="h-3.5 w-3.5" />
                  {c.city ?? "—"}
                </p>
              </div>
              <Pill tone={c.verification === "VERIFIED" ? "ok" : "amber"}>
                <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
                {c.verification === "VERIFIED" ? "Verified" : c.verification}
              </Pill>
            </div>

            <div className="mt-5">
              <div className="mb-1 flex items-center justify-between text-xs font-bold text-[var(--ink-soft)]">
                <span>Reliability</span>
                <span className="text-emerald-600">{c.reliability}/100</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="bg-brand h-full rounded-full"
                  style={{ width: `${c.reliability}%` }}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <Metric
                icon={<Gavel className="h-4 w-4" />}
                label="Bids"
                value={`${c.activeBids}/${c.totalBids}`}
              />
              <Metric
                icon={<PackageCheck className="h-4 w-4" />}
                label="Won"
                value={String(c.wonOrders)}
              />
              <Metric
                icon={<Wallet className="h-4 w-4" />}
                label="Spent"
                value={formatAzn(c.totalSpent)}
              />
            </div>

            {c.lastActivity && (
              <p className="mt-4 text-xs text-[var(--ink-soft)]">
                Last activity:{" "}
                {new Date(c.lastActivity).toLocaleString("en-US")}
              </p>
            )}
          </GlassCard>
        ))}
        {customers.length === 0 && (
          <GlassCard className="col-span-full p-10 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
            <p className="text-[var(--ink-soft)]">No customers yet.</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/70 p-3">
      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
        {icon}
      </div>
      <p className="text-sm font-extrabold text-[var(--ink)]">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
        {label}
      </p>
    </div>
  );
}
