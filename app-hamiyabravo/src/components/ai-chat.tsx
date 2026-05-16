"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  X,
  Send,
  Mic,
  Volume2,
  VolumeX,
  Leaf,
  MessageSquare,
  Wand2,
  ListChecks,
  AlertTriangle,
  Gavel,
  ArrowRight,
} from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What's most at risk right now?",
  "How much can we recover today?",
  "Summarize today's impact",
];

type AgentAction = {
  id: string;
  label: string;
  desc: string;
  Icon: typeof ListChecks;
  href: string;
  steps: string[];
  done: string;
};

const AGENT_ACTIONS: AgentAction[] = [
  {
    id: "queue",
    label: "Triage the AI queue",
    desc: "Rank pending recommendations by recoverable value and open the queue.",
    Icon: ListChecks,
    href: "/admin/recommendations",
    steps: [
      "Connecting to Bravo AI…",
      "Scanning pending recommendations…",
      "Ranking by recoverable value…",
      "Opening the AI queue…",
    ],
    done: "Queue triaged — opening the highest-value recommendations.",
  },
  {
    id: "risk",
    label: "Hunt the biggest risk",
    desc: "Sweep inventory for the highest spoilage risk and jump to it.",
    Icon: AlertTriangle,
    href: "/admin/inventory",
    steps: [
      "Connecting to Bravo AI…",
      "Sweeping inventory batches…",
      "Scoring spoilage risk…",
      "Opening Risk inventory…",
    ],
    done: "Risk sweep complete — opening the most urgent stock.",
  },
  {
    id: "auctions",
    label: "Run the auction desk",
    desc: "Review live auctions and surface bids ready to accept.",
    Icon: Gavel,
    href: "/admin/listings",
    steps: [
      "Connecting to Bravo AI…",
      "Reading live auctions…",
      "Weighing bids by reliability…",
      "Opening the auction desk…",
    ],
    done: "Auction desk ready — opening live auctions.",
  },
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

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function AiChat() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"chat" | "agent">("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const [agent, setAgent] = useState<{
    running: boolean;
    label: string;
    status: string;
  }>({ running: false, label: "", status: "" });
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const userMsg = text.trim();
      if (!userMsg) return;
      setInput("");
      const history = [...messages, { role: "user" as const, content: userMsg }];
      setMessages([...history, { role: "assistant", content: "" }]);
      setLoading(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });
        let acc = "";
        const apply = (v: string) =>
          setMessages((p) => {
            const n = [...p];
            n[n.length - 1] = { role: "assistant", content: v };
            return n;
          });
        if (res.body) {
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            acc += dec.decode(value, { stream: true });
            apply(acc);
          }
        } else {
          acc = await res.text();
          apply(acc);
        }
        if (speak && acc && typeof window !== "undefined" && window.speechSynthesis) {
          const u = new SpeechSynthesisUtterance(acc);
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
        }
      } catch {
        setMessages((p) => {
          const n = [...p];
          n[n.length - 1] = {
            role: "assistant",
            content: "Something went wrong — try again.",
          };
          return n;
        });
      } finally {
        setLoading(false);
      }
    },
    [messages, speak]
  );

  const runAgent = useCallback(
    async (a: AgentAction) => {
      setMessages((p) => [
        ...p,
        { role: "assistant", content: `Agent engaged — ${a.label}.` },
      ]);
      setAgent({ running: true, label: a.label, status: a.steps[0] });
      for (const s of a.steps) {
        setAgent({ running: true, label: a.label, status: s });
        await sleep(780);
      }
      setMessages((p) => [...p, { role: "assistant", content: a.done }]);
      await sleep(550);
      setAgent({ running: false, label: "", status: "" });
      setOpen(false);
      router.push(a.href);
    },
    [router]
  );

  const toggleVoice = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      alert("Voice input needs Chrome or Edge on a secure (localhost) page.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
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
      setInput((finalText + interim).trim());
    };
    rec.onerror = (ev) => {
      setListening(false);
      const err = ev?.error || "unknown";
      if (err === "not-allowed" || err === "service-not-allowed") {
        alert("Microphone blocked — allow mic access in your browser, then retry.");
      } else if (err !== "aborted" && err !== "no-speech") {
        alert("Voice error: " + err);
      }
    };
    rec.onend = () => {
      setListening(false);
      const t = finalText.trim();
      if (t) send(t);
    };
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-brand fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-5 py-3.5 font-bold text-white shadow-xl transition hover:scale-105"
        style={{ boxShadow: "0 16px 40px -10px rgba(13,148,136,.6)" }}
      >
        <Sparkles className="h-5 w-5" />
        Bravo AI
      </button>
    );
  }

  return (
    <>
      {agent.running && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-md">
          <div className="animate-pop relative w-[24rem] max-w-[90vw] overflow-hidden rounded-3xl bg-white/95 p-8 text-center shadow-2xl">
            <div className="pointer-events-none absolute -inset-10 opacity-40">
              <div className="bg-brand animate-pulse absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
            </div>
            <div className="relative mx-auto mb-6 h-24 w-24">
              <div className="bg-brand absolute inset-0 animate-ping rounded-full opacity-20" />
              <div className="bg-brand absolute inset-2 grid place-items-center rounded-full text-white shadow-xl">
                <Sparkles className="h-9 w-9 animate-pulse" />
              </div>
              <div
                className="absolute inset-0 animate-spin"
                style={{ animationDuration: "3s" }}
              >
                <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-emerald-400 shadow" />
                <span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-teal-400 shadow" />
              </div>
            </div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
              Bravo Agent
            </p>
            <p className="mt-2 text-lg font-black text-slate-900">
              {agent.label}
            </p>
            <p className="mt-3 h-5 text-sm font-semibold text-slate-600">
              {agent.status}
            </p>
            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
              <div className="animate-shimmer h-full w-full rounded-full" />
            </div>
            <div className="mt-4 flex justify-center gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="glass fixed bottom-6 right-6 z-50 flex h-[34rem] w-[26rem] max-w-[92vw] flex-col overflow-hidden rounded-3xl">
        <div className="bg-brand flex items-center justify-between px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">
              <Leaf className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-extrabold leading-none">Bravo AI</p>
              <p className="text-[10px] uppercase tracking-widest text-white/70">
                {mode === "agent" ? "autonomous agent" : "operations co-pilot"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSpeak((s) => !s)}
              title={speak ? "Voice replies on" : "Voice replies off"}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
            >
              {speak ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-1 bg-emerald-900/5 p-1.5">
          {(
            [
              { id: "chat", label: "Chat", Icon: MessageSquare },
              { id: "agent", label: "Agent", Icon: Wand2 },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                mode === m.id
                  ? "bg-brand text-white shadow"
                  : "text-emerald-800 hover:bg-white/60"
              }`}
            >
              <m.Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {mode === "agent" ? (
            <div className="space-y-3">
              <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-[var(--ink)] shadow-sm">
                Agent mode — pick a mission and I&apos;ll work the app for you.
              </div>
              {AGENT_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => runAgent(a)}
                  disabled={agent.running}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-white/70 p-3 text-left transition hover:scale-[1.02] hover:border-emerald-400 disabled:opacity-50"
                >
                  <span className="bg-brand grid h-10 w-10 flex-none place-items-center rounded-xl text-white shadow">
                    <a.Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-[var(--ink)]">
                      {a.label}
                    </span>
                    <span className="block text-xs text-[var(--ink-soft)]">
                      {a.desc}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 flex-none text-emerald-600 transition group-hover:translate-x-1" />
                </button>
              ))}
              {messages
                .filter((m) => m.role === "assistant")
                .slice(-3)
                .map((m, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
                  >
                    {m.content}
                  </div>
                ))}
            </div>
          ) : (
            <>
              {messages.length === 0 && (
                <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-[var(--ink)] shadow-sm">
                  Hi, I&apos;m Bravo AI — ask me anything, or tap a suggestion
                  below.
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-brand text-white"
                        : "bg-white/85 text-[var(--ink)] shadow-sm"
                    }`}
                  >
                    {m.content || (loading ? "…" : "")}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="animate-shimmer h-7 w-28 rounded-full" />
              )}
            </>
          )}
          <div ref={endRef} />
        </div>

        {mode === "chat" && (
          <>
            <div className="flex flex-wrap gap-1.5 px-3 pt-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={loading}
                  className="ai-pill rounded-full px-3 py-1 text-[11px] font-bold transition hover:scale-[1.03] disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 p-3"
            >
              <button
                type="button"
                onClick={toggleVoice}
                title="Speak"
                className={`grid h-11 w-11 flex-none place-items-center rounded-xl transition ${
                  listening ? "bg-rose-500 text-white" : "ai-pill"
                }`}
              >
                <Mic
                  className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`}
                />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? "Listening…" : "Ask Bravo AI…"}
                disabled={loading}
                className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white/70 px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="btn-grad grid h-11 w-11 flex-none place-items-center"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
