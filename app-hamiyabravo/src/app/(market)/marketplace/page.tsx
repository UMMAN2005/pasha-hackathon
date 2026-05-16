import { listAuctions } from "@/server/services/auction";
import { GlassCard, SectionTitle } from "@/components/ui/kit";
import { AnimatedNumber } from "@/components/ui/animated-number";
import Link from "next/link";

export default async function MarketplacePage() {
  const auctions = await listAuctions();

  const totalLiveValue = auctions.reduce((sum, a) => {
    const bid = a.topBid ?? a.askPrice;
    return sum + bid * a.qty;
  }, 0);

  return (
    <div className="space-y-10 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-brand p-8 shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="animate-float absolute -top-20 -left-20 w-60 h-60 rounded-full blur-3xl" />
          <div className="animate-float absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-3xl" style={{ animationDelay: "1.2s" }} />
        </div>
        <div className="relative">
          <p className="text-sm font-bold uppercase tracking-widest text-white/70 mb-2">Live auction value</p>
          <p className="text-5xl font-black text-white mb-1">
            <AnimatedNumber value={totalLiveValue} qapik suffix=" ₼" />
          </p>
          <p className="text-sm text-white/60">{auctions.length} live auctions</p>
        </div>
      </div>

      <SectionTitle
        kicker="LIVE AUCTIONS"
        title="Top bids"
        className="px-1"
      />

      {auctions.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <p className="text-sm text-slate-600">No active auctions yet</p>
        </GlassCard>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {auctions.map((auction, idx) => (
            <Link
              key={auction.id}
              href={`/marketplace/${auction.id}`}
              className="group block animate-fade-up"
              style={{ animationDelay: `${idx * 0.08}ms` }}
              data-testid="listing-card"
            >
              <GlassCard rise className="overflow-hidden h-full flex flex-col">
                <div className="relative overflow-hidden h-48 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={auction.image}
                    alt={auction.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  {auction.status !== "ACTIVE" && (
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                      <span className="text-sm font-black text-white uppercase tracking-wider">
                        {auction.status === "RESERVED" ? "Sold" : "Ended"}
                      </span>
                    </div>
                  )}
                  {auction.discountPercent > 0 && auction.status === "ACTIVE" && (
                    <div className="absolute top-3 right-3 bg-brand px-3 py-1 rounded-full text-xs font-black text-white shadow-lg">
                      −{auction.discountPercent}% off
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-gradient transition">
                      {auction.title}
                    </h3>
                    <p className="text-xs text-[var(--ink-soft)] mt-2">
                      {auction.category} · {auction.city}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)]">
                        Top bid
                      </span>
                      <div className="live-dot w-2 h-2 rounded-full bg-[var(--bad)]" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                      <AnimatedNumber
                        value={auction.topBid ?? auction.askPrice}
                        qapik
                        suffix=" ₼"
                      />
                    </p>
                    <p className="text-xs text-[var(--ink-soft)] mt-1">
                      {auction.bidCount} bids
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <span className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-semibold">
                      {auction.qty} units
                    </span>
                  </div>

                  <button className="btn-grad mt-4 w-full py-2.5 text-sm font-bold rounded-xl transition">
                    Place bid
                  </button>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
