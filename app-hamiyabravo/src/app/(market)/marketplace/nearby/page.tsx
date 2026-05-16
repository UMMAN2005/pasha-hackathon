import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getNearbyBranches } from "@/server/services/location";
import { GlassCard, SectionTitle, Pill } from "@/components/ui/kit";
import { MapPin, Navigation, Clock } from "lucide-react";

async function resolveBuyerId(sessionCompanyId: string | null) {
  if (sessionCompanyId) {
    const c = await prisma.company.findUnique({
      where: { id: sessionCompanyId },
    });
    if (c?.type === "BUYER") return c.id;
  }
  const fb = await prisma.company.findFirst({ where: { type: "BUYER" } });
  return fb?.id ?? null;
}

export default async function NearbyPage() {
  const user = await requireRole("BUSINESS_BUYER", "HQ_ADMIN");
  const buyerId = await resolveBuyerId(user.companyId);
  if (!buyerId) {
    return <p className="text-[var(--ink-soft)]">No buyer profile.</p>;
  }
  const { buyerCity, branches } = await getNearbyBranches(buyerId);
  const maxKm = Math.max(1, ...branches.map((b) => b.distanceKm ?? 0));

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex items-end justify-between">
        <SectionTitle
          kicker="Pickup logistics"
          title="Nearest Bravo branches"
        />
        <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--ink-soft)]">
          <MapPin className="h-4 w-4 text-emerald-600" />
          You: {buyerCity ?? "—"}
        </p>
      </div>

      <div className="animate-fade-up space-y-4 delay-1">
        {branches.map((b, i) => (
          <GlassCard
            key={b.id}
            className={`p-6 ${i === 0 ? "ring-ok" : ""}`}
          >
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div
                  className={`grid h-12 w-12 place-items-center rounded-2xl text-white ${
                    i === 0 ? "bg-brand" : "bg-emerald-200 text-emerald-800"
                  }`}
                >
                  <Navigation className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-[var(--ink)]">
                      {b.name}
                    </h3>
                    {i === 0 && <Pill tone="ok">Nearest</Pill>}
                  </div>
                  <p className="text-sm text-[var(--ink-soft)]">{b.city}</p>
                </div>
              </div>
              <div className="flex items-center gap-8 text-right">
                <div>
                  <p className="text-2xl font-black text-emerald-600">
                    {b.distanceKm ?? "—"}
                    <span className="text-sm"> km</span>
                  </p>
                  <p className="text-[10px] font-bold uppercase text-[var(--ink-soft)]">
                    distance
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-2xl font-black text-emerald-600">
                    <Clock className="h-4 w-4" />~{b.etaMin ?? "—"}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-[var(--ink-soft)]">
                    min drive
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-100">
              <div
                className="bg-brand h-full rounded-full"
                style={{
                  width: `${Math.max(6, 100 - ((b.distanceKm ?? 0) / maxKm) * 100)}%`,
                }}
              />
            </div>
          </GlassCard>
        ))}
      </div>

      <p className="animate-fade-up text-center text-xs text-[var(--ink-soft)] delay-2">
        Distances estimated by Bravo AI from your registered location.
      </p>
    </div>
  );
}
