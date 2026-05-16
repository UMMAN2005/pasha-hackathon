import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getBuyerDashboard } from "@/server/services/buyer-dashboard";
import { GlassCard, SectionTitle, Pill, AIBadge } from "@/components/ui/kit";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { formatAzn } from "@/lib/money";
import Link from "next/link";
import {
  Gavel,
  Crown,
  PackageCheck,
  Wallet,
  Clock,
  Navigation,
  MapPin,
  Zap,
  ArrowRight,
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

  const heroStats = [
    {
      icon: Gavel,
      label: "Active bids",
      value: d.activeBids,
      isNumber: true,
    },
    {
      icon: Crown,
      label: "Leading",
      value: d.leadingBids,
      isNumber: true,
    },
    {
      icon: PackageCheck,
      label: "Won orders",
      value: d.wonOrders,
      isNumber: true,
    },
    {
      icon: Wallet,
      label: "Total spent",
      value: d.totalSpent,
      isNumber: false,
      isMoney: true,
    },
    {
      icon: Clock,
      label: "Pending pickups",
      value: d.pendingPickups,
      isNumber: true,
    },
  ];

  const quickActions = [
    {
      label: "Browse auctions",
      href: "/marketplace",
      icon: Zap,
    },
    {
      label: "My orders",
      href: "/marketplace/orders",
      icon: PackageCheck,
    },
    {
      label: "Nearby branches",
      href: "/marketplace/nearby",
      icon: MapPin,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <SectionTitle kicker="My account" title="Buyer dashboard" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {heroStats.map((stat, idx) => {
          const delayClasses = [
            "animate-fade-up delay-1",
            "animate-fade-up delay-2",
            "animate-fade-up delay-3",
            "animate-fade-up delay-4",
            "animate-fade-up delay-5",
          ];
          return (
          <GlassCard
            key={stat.label}
            className={`card-rise p-6 transition-all duration-300 hover:shadow-lg ${delayClasses[idx] || ""}`}
          >
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand text-white">
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              {stat.isMoney ? (
                <p className="text-2xl font-black text-[var(--ink)]">
                  <AnimatedNumber
                    value={stat.value as number}
                    qapik
                    suffix=" ₼"
                  />
                </p>
              ) : (
                <p className="text-3xl font-black text-[var(--ink)]">
                  <AnimatedNumber value={stat.value as number} />
                </p>
              )}
              <p className="text-sm font-semibold text-[var(--ink-soft)]">
                {stat.label}
              </p>
            </div>
          </GlassCard>
          );
        })}
      </div>

      <div className="animate-fade-up delay-2 grid gap-5 lg:grid-cols-2">
        <GlassCard className="card-rise relative overflow-hidden p-7">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50/40 to-transparent" />
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)]">
              Buyer reliability score
            </p>
            <AIBadge />
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                <AnimatedNumber value={d.reliability} />
              </span>
              <span className="text-base font-semibold text-[var(--ink-soft)]">
                / 100
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="h-3 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-1000"
                  style={{ width: `${d.reliability}%` }}
                />
              </div>
              <p className="text-xs text-[var(--ink-soft)]">
                {d.reliability >= 80
                  ? "Excellent standing — top priority in bid matching"
                  : d.reliability >= 60
                    ? "Good standing — competitive in auctions"
                    : "Build reliability through on-time pickups"}
              </p>
            </div>
          </div>
          <p className="mt-5 text-xs text-[var(--ink-soft)] leading-relaxed">
            Bravo AI prioritizes bids from trusted buyers with high reliability scores. Keep your score strong with timely pickups and transparent bidding.
          </p>
        </GlassCard>

        <GlassCard className="card-rise relative overflow-hidden p-7">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50/30 to-transparent" />
          {d.nearest ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)]">
                  Nearest pickup branch
                </p>
                <Pill tone="ok">
                  <Navigation className="mr-1 inline h-3.5 w-3.5" />
                  AI located
                </Pill>
              </div>
              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-2xl font-black text-[var(--ink)]">
                    {d.nearest.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="h-4 w-4 text-[var(--ink-soft)]" />
                    <p className="text-sm font-semibold text-[var(--ink-soft)]">
                      {d.nearest.city}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-white/50 p-3.5">
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-1">
                      Distance
                    </p>
                    <p className="text-2xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      {d.nearest.distanceKm ?? "—"}
                      <span className="text-sm"> km</span>
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/50 p-3.5">
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] mb-1">
                      Est. drive
                    </p>
                    <p className="text-2xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      ~{d.nearest.etaMin ?? "—"}
                      <span className="text-sm"> min</span>
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-8 text-center">
              <p className="text-sm text-[var(--ink-soft)]">
                Location data not available. Check your profile.
              </p>
            </div>
          )}
        </GlassCard>
      </div>

      <div className="animate-fade-up delay-3 grid gap-3 sm:grid-cols-3">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <GlassCard className="card-rise group h-full p-5 transition-all duration-300 hover:shadow-lg hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-brand/10 grid h-10 w-10 place-items-center rounded-lg group-hover:bg-brand/20 transition-colors">
                    <action.icon className="h-5 w-5 text-brand" />
                  </div>
                  <span className="font-bold text-[var(--ink)]">
                    {action.label}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--ink-soft)] transition-transform group-hover:translate-x-1" />
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
