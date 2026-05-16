import { getAuction } from "@/server/services/auction";
import { getToday, daysBetween } from "@/lib/clock";
import { formatAzn } from "@/lib/money";
import { GlassCard, Pill } from "@/components/ui/kit";
import { BidPanel } from "./bid-panel";
import { notFound } from "next/navigation";
import {
  Trophy,
  Zap,
  Tag,
  Boxes,
  Gavel,
  CalendarClock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ listingId: string }>;
}

export default async function AuctionDetailPage({ params }: PageProps) {
  const { listingId } = await params;
  const auction = await getAuction(listingId);

  if (!auction) notFound();

  const isActive = auction.status === "ACTIVE";
  const sortedBids = [...auction.bids].sort(
    (a, b) => b.pricePerUnit - a.pricePerUnit
  );
  const leader = sortedBids[0] ?? null;

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  let pickupInDays = 0;
  try {
    pickupInDays = Math.max(0, daysBetween(auction.pickupStart, getToday()));
  } catch {
    pickupInDays = Math.max(
      0,
      daysBetween(auction.pickupStart, new Date())
    );
  }
  const pickupLabel =
    pickupInDays === 0
      ? "Pickup opens today"
      : pickupInDays === 1
        ? "Pickup in 1 day"
        : `Pickup in ${pickupInDays} days`;

  const stats = [
    {
      icon: Tag,
      label: "Ask price",
      value: formatAzn(auction.askPrice),
      sub:
        auction.discountPercent > 0
          ? `${auction.discountPercent}% off retail`
          : "per unit",
    },
    {
      icon: Boxes,
      label: "Available",
      value: `${auction.qty}`,
      sub: "units in lot",
    },
    {
      icon: Gavel,
      label: "Bids",
      value: `${auction.bidCount}`,
      sub: leader ? `leading ${formatAzn(leader.pricePerUnit)}/u` : "no bids yet",
    },
    {
      icon: CalendarClock,
      label: "Pickup",
      value: pickupLabel,
      sub: `${fmtDate(auction.pickupStart)} – ${fmtDate(auction.pickupEnd)}`,
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-soft)] hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to marketplace
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl card-rise">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={auction.image}
          alt={auction.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-slate-950/10" />
        <div className="relative flex min-h-[20rem] flex-col justify-end p-8">
          <div className="mb-3 flex items-center gap-2">
            {isActive ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-red-500/90 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white">
                <span className="live-dot h-2 w-2 rounded-full bg-white" />
                Live auction
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur">
                Auction ended
              </span>
            )}
            {auction.discountPercent > 0 && (
              <span className="inline-flex items-center rounded-full bg-brand px-3 py-1.5 text-xs font-black text-white shadow-lg">
                −{auction.discountPercent}% off
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-sm">
            {auction.title}
          </h1>
          <p className="mt-2 text-sm font-medium text-white/80">
            {auction.category} · {auction.city}
          </p>
        </div>
      </div>

      {/* Stat ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <GlassCard key={s.label} className="p-5 card-rise">
            <div className="flex items-center gap-2 text-[var(--ink-soft)]">
              <s.icon className="h-4 w-4" />
              <p className="text-xs font-bold uppercase tracking-widest">
                {s.label}
              </p>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 leading-tight">
              {s.value}
            </p>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">{s.sub}</p>
          </GlassCard>
        ))}
      </div>

      {/* Leaderboard + Bid panel */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)]">
                {isActive ? "Live bids" : "Final bids"}
              </p>
              <h2 className="text-2xl font-black text-slate-900">
                Leaderboard
              </h2>
            </div>
            {leader && (
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)]">
                  Top bid
                </p>
                <p className="text-2xl font-black text-gradient">
                  {formatAzn(leader.total)}
                </p>
              </div>
            )}
          </div>

          {sortedBids.length === 0 ? (
            <GlassCard className="p-10 text-center">
              <Zap className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 font-semibold">
                No bids yet — be the first to lead this auction
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {sortedBids.map((bid, idx) => {
                const top = idx === 0;
                return (
                  <GlassCard
                    key={bid.id}
                    className={`p-5 flex items-center justify-between gap-4 transition-all ${
                      top ? "ring-ok ring-2 border-[var(--ok)]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className={`w-11 h-11 flex-none flex items-center justify-center rounded-full font-bold ${
                          top
                            ? "bg-emerald-100"
                            : idx === 1
                              ? "bg-slate-100"
                              : "bg-amber-50"
                        }`}
                      >
                        {top ? (
                          <Trophy className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <span
                            className={`text-sm font-black ${
                              idx === 1 ? "text-slate-600" : "text-amber-600"
                            }`}
                          >
                            #{idx + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-sm truncate">
                            {bid.buyerName}
                          </p>
                          <div className="h-1.5 w-1.5 flex-none rounded-full bg-slate-300" />
                          <p className="text-xs text-[var(--ink-soft)] flex-none">
                            {Math.round(bid.reliability)}% reliable
                          </p>
                        </div>
                        <p className="text-xs text-[var(--ink-soft)] mt-1">
                          {bid.quantity} units × {formatAzn(bid.pricePerUnit)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      {top && <Pill tone="ok">Leading</Pill>}
                      <p className="font-black text-slate-900 text-lg">
                        {formatAzn(bid.total)}
                      </p>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <BidPanel
            listingId={listingId}
            minNextBid={auction.minNextBid}
            minQty={auction.minQty}
            qty={auction.qty}
            askPrice={auction.askPrice}
            status={auction.status}
          />
        </div>
      </div>
    </div>
  );
}
