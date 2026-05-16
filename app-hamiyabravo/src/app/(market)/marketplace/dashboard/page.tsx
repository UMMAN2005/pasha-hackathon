import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getBuyerDashboard } from "@/server/services/buyer-dashboard";
import { GlassCard, SectionTitle, Pill } from "@/components/ui/kit";
import { formatAzn } from "@/lib/money";
import {
  Gavel,
  Crown,
  PackageCheck,
  Wallet,
  Clock,
  Navigation,
} from "lucide-react";

async function resolveBuyerId(sessionCompanyId: string | null) {
  if (sessionCompanyId) {
    const c = await prisma.company.findUnique({
      where: { id: sessionCompanyId },
    });
    if (c?.type === "BUYER") return c.id;
  }
  const fallback = await prisma.company.findFirst({
    where: { type: "BUYER" },
  });
  return fallback?.id ?? null;
}

export default async function BuyerDashboardPage() {
  const user = await requireRole("BUSINESS_BUYER", "HQ_ADMIN");
  const buyerId = await resolveBuyerId(user.companyId);
  if (!buyerId) {
    return <p className="text-[var(--ink-soft)]">No buyer profile.</p>;
  }
  const d = await getBuyerDashboard(buyerId);

  const cards = [
    { icon: Gavel, label: "Active bids", value: String(d.activeBids) },
    { icon: Crown, label: "Leading", value: String(d.leadingBids) },
    { icon: PackageCheck, label: "Won orders", value: String(d.wonOrders) },
    { icon: Wallet, label: "Total spent", value: formatAzn(d.totalSpent) },
    {
      icon: Clock,
      label: "Pending pickups",
      value: String(d.pendingPickups),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <SectionTitle kicker="My account" title="Buyer dashboard" />
      </div>

      <div className="animate-fade-up grid gap-5 delay-1 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <GlassCard key={c.label} className="card-rise p-6">
            <div className="bg-brand mb-4 grid h-11 w-11 place-items-center rounded-xl text-white">
              <c.icon className="h-5 w-5" />
            </div>
            <p className="text-3xl font-black text-[var(--ink)]">{c.value}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--ink-soft)]">
              {c.label}
            </p>
          </GlassCard>
        ))}
      </div>

      <div className="animate-fade-up grid gap-5 delay-2 lg:grid-cols-2">
        <GlassCard className="p-7">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)]">
            Buyer reliability
          </p>
          <div className="mt-3 flex items-end gap-3">
            <span className="text-5xl font-black text-emerald-600">
              {d.reliability}
            </span>
            <span className="mb-2 text-sm text-[var(--ink-soft)]">/ 100</span>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-emerald-100">
            <div
              className="bg-brand h-full rounded-full"
              style={{ width: `${d.reliability}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-[var(--ink-soft)]">
            Higher reliability gets your bids prioritized by Bravo AI.
          </p>
        </GlassCard>

        <GlassCard className="p-7">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)]">
              Nearest pickup
            </p>
            <Pill tone="ok">
              <Navigation className="mr-1 inline h-3.5 w-3.5" />
              AI estimated
            </Pill>
          </div>
          {d.nearest ? (
            <>
              <p className="mt-3 text-2xl font-black text-[var(--ink)]">
                {d.nearest.name}
              </p>
              <p className="text-sm text-[var(--ink-soft)]">
                {d.nearest.city}
              </p>
              <div className="mt-4 flex gap-8">
                <div>
                  <p className="text-3xl font-black text-emerald-600">
                    {d.nearest.distanceKm ?? "—"}
                    <span className="text-base"> km</span>
                  </p>
                  <p className="text-xs font-bold uppercase text-[var(--ink-soft)]">
                    distance
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-black text-emerald-600">
                    ~{d.nearest.etaMin ?? "—"}
                    <span className="text-base"> min</span>
                  </p>
                  <p className="text-xs font-bold uppercase text-[var(--ink-soft)]">
                    est. drive
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-3 text-[var(--ink-soft)]">
              Location not available.
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
