"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  X,
  Send,
  Mic,
  Volume2,
  VolumeX,
  Leaf,
} from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What's most at risk right now?",
  "How much can we recover today?",
  "Summarize today's impact",
];

const GREETING =
  "Hi, I'm Bravo AI — your operations co-pilot. I watch every shelf so nothing goes to waste. Ask me anything, or start with:";

// Minimal typing for the Web Speech API (browser-only).
type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
};

export function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
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

  const toggleVoice = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      alert("Voice input isn't supported in this browser.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setInput(t);
      send(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
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
    <div className="glass fixed bottom-6 right-6 z-50 flex h-[34rem] w-[26rem] max-w-[92vw] flex-col overflow-hidden rounded-3xl">
      <div className="bg-brand flex items-center justify-between px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">
            <Leaf className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-extrabold leading-none">Bravo AI</p>
            <p className="text-[10px] uppercase tracking-widest text-white/70">
              operations co-pilot
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

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-[var(--ink)] shadow-sm">
              {GREETING}
            </div>
            <div className="space-y-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="ai-pill block w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition hover:scale-[1.02]"
                >
                  {s}
                </button>
              ))}
            </div>
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
        {loading && <div className="animate-shimmer h-7 w-28 rounded-full" />}
        <div ref={endRef} />
      </div>

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
            listening
              ? "bg-rose-500 text-white"
              : "ai-pill"
          }`}
        >
          <Mic className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`} />
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
    </div>
  );
}
