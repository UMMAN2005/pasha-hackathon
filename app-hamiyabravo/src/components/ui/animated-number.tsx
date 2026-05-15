"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number; // raw value (qəpik if qapik=true)
  qapik?: boolean; // divide by 100, 2 decimals
  suffix?: string;
  durationMs?: number;
  className?: string;
}

function group(n: string): string {
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function AnimatedNumber({
  value,
  qapik = false,
  suffix = "",
  durationMs = 1100,
  className,
}: AnimatedNumberProps) {
  const [shown, setShown] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(value * eased);
      if (t < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [value, durationMs]);

  const text = qapik
    ? group((shown / 100).toFixed(2).replace(".", ","))
    : group(Math.round(shown).toString());

  return (
    <span className={className}>
      {text}
      {suffix}
    </span>
  );
}
