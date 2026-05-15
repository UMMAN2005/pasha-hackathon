// Presentational, server-safe UI kit for the Vibrant theme.
// No hooks / no "use client" — importable from server and client components.
import { ReactNode } from "react";

export function GlassCard({
  children,
  className = "",
  rise = true,
}: {
  children: ReactNode;
  className?: string;
  rise?: boolean;
}) {
  return (
    <div
      className={`glass ${rise ? "card-rise" : ""} rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}

export function AIBadge({ label = "AI" }: { label?: string }) {
  return (
    <span className="ai-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
      <span className="text-sm leading-none">✦</span>
      {label}
    </span>
  );
}

export function Pill({
  children,
  tone = "violet",
}: {
  children: ReactNode;
  tone?: "violet" | "ok" | "bad" | "amber";
}) {
  const map = {
    violet: "bg-violet-100 text-violet-700",
    ok: "bg-emerald-100 text-emerald-700",
    bad: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function ProductThumb({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`object-cover ${className}`}
    />
  );
}

export function SectionTitle({
  kicker,
  title,
  className = "",
}: {
  kicker?: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {kicker && (
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)]">
          {kicker}
        </p>
      )}
      <h2 className="text-2xl font-extrabold text-[var(--ink)]">{title}</h2>
    </div>
  );
}
