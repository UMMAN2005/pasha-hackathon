"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send } from "lucide-react";

export function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((p) => [...p, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMsg }],
        }),
      });
      let acc = "";
      setMessages((p) => [...p, { role: "assistant", content: "" }]);
      if (res.body) {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          setMessages((p) => {
            const n = [...p];
            n[n.length - 1] = { role: "assistant", content: acc };
            return n;
          });
        }
      } else {
        acc = await res.text();
        setMessages((p) => {
          const n = [...p];
          n[n.length - 1] = { role: "assistant", content: acc };
          return n;
        });
      }
    } catch {
      setMessages((p) => [
        ...p,
        { role: "assistant", content: "Xəta baş verdi. Yenidən cəhd edin." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-brand fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-5 py-3.5 font-bold text-white shadow-xl transition hover:scale-105"
        style={{ boxShadow: "0 16px 40px -10px rgba(138,43,226,.6)" }}
      >
        <Sparkles className="h-5 w-5" />
        AI köməkçi
      </button>
    );
  }

  return (
    <div className="glass fixed bottom-6 right-6 z-50 flex h-[30rem] w-96 max-w-[92vw] flex-col overflow-hidden rounded-3xl">
      <div className="bg-brand flex items-center justify-between px-5 py-4 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <div>
            <p className="text-sm font-extrabold leading-none">Gemini AI</p>
            <p className="text-[10px] uppercase tracking-widest text-white/70">
              əməliyyat köməkçisi
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-white/80 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-6 text-center text-sm text-[var(--ink-soft)]">
            Soruş: “Bu gün ən riskli məhsul hansıdır?”
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-brand text-white"
                  : "bg-white/80 text-[var(--ink)] shadow-sm"
              }`}
            >
              {m.content || (loading ? "…" : "")}
            </div>
          </div>
        ))}
        {loading && <div className="animate-shimmer h-8 w-32 rounded-full" />}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Sual yaz…"
          disabled={loading}
          className="flex-1 rounded-xl border border-violet-200 bg-white/70 px-4 py-2.5 text-sm outline-none focus:border-violet-400"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-grad grid place-items-center px-4"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
