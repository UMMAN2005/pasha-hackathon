"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Send,
  Mic,
  Paperclip,
  X,
  Check,
  Loader2,
  ShoppingBag,
  Plus,
  Minus,
} from "lucide-react";
import { formatAzn } from "@/lib/money";
import { conciergeBuyAction } from "@/server/actions/concierge";

type Offer = {
  listingId: string;
  title: string;
  category: string;
  city: string;
  unitPrice: number;
  available: number;
  minQty: number;
  suggestedQty: number;
  why: string;
};
type Msg = {
  role: "user" | "assistant";
  content: string;
  offers?: Offer[];
};

const STARTERS = [
  "I need fresh fruit for my kitchen this week",
  "Show me the cheapest bakery surplus in bulk",
  "What dairy can I pick up today?",
];

type SpeechResult = { 0: { transcript: string }; isFinal: boolean };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type SpeechErr = { error?: string };
type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: SpeechEvent) => void;
  onerror: (e: SpeechErr) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

export function ConciergeChat({ buyerName }: { buyerName: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || loading) return;
      setInput("");
      const hasAttachment = !!attachment;
      const shown = hasAttachment ? `${q}  📎 ${attachment}` : q;
      setMessages((p) => [...p, { role: "user", content: shown }]);
      setLoading(true);
      try {
        const res = await fetch("/api/concierge", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: q, hasAttachment }),
        });
        const data = (await res.json()) as { reply: string; offers: Offer[] };
        setMessages((p) => [
          ...p,
          { role: "assistant", content: data.reply, offers: data.offers },
        ]);
      } catch {
        setMessages((p) => [
          ...p,
          {
            role: "assistant",
            content: "Something interrupted that — please try again.",
          },
        ]);
      } finally {
        setLoading(false);
        setAttachment(null);
      }
    },
    [attachment, loading]
  );

  const startVoice = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      alert("Voice needs Chrome or Edge on a secure (localhost) page.");
      return;
    }
    setTranscript("");
    setVoiceOpen(true);
    let finalText = "";
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript((finalText + interim).trim());
    };
    rec.onerror = (ev) => {
      const err = ev?.error || "unknown";
      setVoiceOpen(false);
      if (err === "not-allowed" || err === "service-not-allowed") {
        alert("Microphone blocked — allow mic access, then retry.");
      } else if (err !== "aborted" && err !== "no-speech") {
        alert("Voice error: " + err);
      }
    };
    rec.onend = () => {
      setVoiceOpen(false);
      const t = finalText.trim();
      if (t) send(t);
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setVoiceOpen(false);
    }
  };

  const stopVoice = () => recRef.current?.stop();

  return (
    <div className="relative mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col">
      {/* Voice overlay */}
      {voiceOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-md">
          <div className="animate-pop relative w-[26rem] max-w-[92vw] overflow-hidden rounded-3xl bg-white/95 p-10 text-center shadow-2xl">
            <div className="relative mx-auto mb-6 h-32 w-32">
              <span className="bg-brand absolute inset-0 animate-ping rounded-full opacity-20" />
              <span
                className="bg-brand absolute inset-4 animate-ping rounded-full opacity-30"
                style={{ animationDelay: "0.3s" }}
              />
              <span className="bg-brand absolute inset-8 grid place-items-center rounded-full text-white shadow-xl">
                <Mic className="h-10 w-10 animate-pulse" />
              </span>
            </div>
            <div className="mb-5 flex items-end justify-center gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-emerald-500 animate-pulse"
                  style={{
                    height: `${10 + ((i * 7) % 22)}px`,
                    animationDelay: `${i * 0.09}s`,
                  }}
                />
              ))}
            </div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
              Listening
            </p>
            <p className="mt-3 min-h-[3rem] text-lg font-semibold text-slate-900">
              {transcript || "Speak your order…"}
            </p>
            <button
              onClick={stopVoice}
              className="btn-grad mt-6 w-full rounded-xl py-3 text-sm font-bold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="animate-fade-up mb-4 flex items-center gap-3">
        <span className="bg-brand grid h-11 w-11 place-items-center rounded-2xl text-white shadow-lg">
          <Sparkles className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Bravo AI Concierge
          </h1>
          <p className="text-sm text-[var(--ink-soft)]">
            Tell me what you need — I&apos;ll find it and you buy in one click.
          </p>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 space-y-5 overflow-y-auto rounded-3xl p-1">
        {messages.length === 0 && (
          <div className="animate-fade-up space-y-5 pt-6">
            <div className="glass rounded-2xl p-6">
              <p className="text-base font-semibold text-slate-900">
                Hi {buyerName} 👋 — I&apos;m your purchasing concierge.
              </p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                Type, talk, or attach a shopping list. I scan all live Bravo
                surplus and bring back ready-to-buy offers — no bidding. Try a
                quick start below.
              </p>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className="animate-fade-up">
            <div
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-brand text-white"
                    : "glass text-slate-900"
                }`}
              >
                {m.content}
              </div>
            </div>
            {m.offers && m.offers.length > 0 && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {m.offers.map((o) => (
                  <OfferCard key={o.listingId} offer={o} />
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="animate-fade-up flex items-center gap-2 text-sm text-[var(--ink-soft)]">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            Scanning live surplus across all branches…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Always-available quick choices */}
      <div className="mt-3 flex flex-wrap gap-2">
        {STARTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            disabled={loading}
            className="ai-pill rounded-full px-3.5 py-1.5 text-xs font-bold transition hover:scale-[1.04] disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Composer */}
      {attachment && (
        <div className="mb-2 flex items-center gap-2 self-start rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
          <Paperclip className="h-3.5 w-3.5" />
          {attachment}
          <button onClick={() => setAttachment(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="glass mt-2 flex items-center gap-2 rounded-2xl p-2"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          className="hidden"
          onChange={(e) =>
            setAttachment(e.target.files?.[0]?.name ?? null)
          }
        />
        <button
          type="button"
          title="Attach Excel / PDF"
          onClick={() => fileRef.current?.click()}
          className="grid h-11 w-11 flex-none place-items-center rounded-xl text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          type="button"
          title="Voice mode"
          onClick={startVoice}
          className="bg-brand grid h-11 w-11 flex-none place-items-center rounded-xl text-white shadow-lg transition hover:scale-105"
        >
          <Mic className="h-5 w-5" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for anything — “200 units of cheap produce for pickup today”"
          disabled={loading}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-grad grid h-11 w-11 flex-none place-items-center disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function OfferCard({ offer }: { offer: Offer }) {
  const [qty, setQty] = useState(
    Math.min(offer.available, Math.max(offer.minQty, offer.suggestedQty))
  );
  const [state, setState] = useState<"idle" | "buying" | "done" | "error">(
    "idle"
  );
  const [pickup, setPickup] = useState("");
  const [err, setErr] = useState("");

  const clamp = (n: number) =>
    Math.min(offer.available, Math.max(offer.minQty, n || offer.minQty));
  const total = qty * offer.unitPrice;

  const buy = async () => {
    setState("buying");
    setErr("");
    const r = await conciergeBuyAction({ listingId: offer.listingId, quantity: qty });
    if (r.ok) {
      setPickup(r.pickupCode);
      setState("done");
    } else {
      setErr(r.error);
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="animate-pop rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
        <div className="flex items-center gap-2 text-emerald-700">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-200">
            <Check className="h-4 w-4" />
          </span>
          <p className="text-sm font-black">Purchased — {offer.title}</p>
        </div>
        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-emerald-700">
          Pickup code
        </p>
        <p className="bg-brand mt-1 rounded-lg px-4 py-3 text-center font-mono text-2xl font-black text-white">
          {pickup}
        </p>
        <p className="mt-2 text-xs text-emerald-700">
          {qty} units · {formatAzn(total)} · show this code at pickup.
        </p>
      </div>
    );
  }

  return (
    <div className="glass card-rise rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900">
            {offer.title}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">{offer.why}</p>
        </div>
        <span className="flex-none rounded-lg bg-violet-100 px-2 py-1 text-[11px] font-bold text-violet-700">
          {offer.category}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-black text-slate-900">
            {formatAzn(offer.unitPrice)}
            <span className="text-xs font-semibold text-slate-500"> /unit</span>
          </p>
          <p className="text-[11px] text-[var(--ink-soft)]">
            {offer.available} available · min {offer.minQty}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setQty((q) => clamp(q - 10))}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(clamp(parseInt(e.target.value, 10)))}
            className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-bold text-slate-900 outline-none"
          />
          <button
            type="button"
            onClick={() => setQty((q) => clamp(q + 10))}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-900">
          Total {formatAzn(total)}
        </p>
        <button
          onClick={buy}
          disabled={state === "buying"}
          className="btn-grad flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60"
        >
          {state === "buying" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShoppingBag className="h-4 w-4" />
          )}
          {state === "buying" ? "Buying…" : "Buy now"}
        </button>
      </div>
      {state === "error" && (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          {err}
        </p>
      )}
    </div>
  );
}
