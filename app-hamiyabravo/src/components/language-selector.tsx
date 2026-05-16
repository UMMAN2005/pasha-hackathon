"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Flag } from "./ui/flags";

const LANGS = [
  { code: "en" as const, label: "English" },
  { code: "az" as const, label: "Azərbaycan" },
  { code: "ru" as const, label: "Русский" },
];

// Cosmetic only — UI is English; switching languages is a no-op for the demo.
export function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<"en" | "az" | "ru">("en");
  const current = LANGS.find((l) => l.code === code)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15"
      >
        <Flag code={current.code} />
        <span className="uppercase">{current.code}</span>
        <ChevronDown className="h-4 w-4 opacity-70" />
      </button>
      {open && (
        <div className="glass absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl p-1">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setCode(l.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                l.code === code
                  ? "bg-emerald-100 text-emerald-800"
                  : "text-[var(--ink)] hover:bg-emerald-50"
              }`}
            >
              <Flag code={l.code} />
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
