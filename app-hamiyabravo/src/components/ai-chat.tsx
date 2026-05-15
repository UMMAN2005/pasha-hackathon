"use client";

import { useState, useRef, useEffect } from "react";

export function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMsg }],
        }),
      });

      if (!response.ok) {
        throw new Error("Chat failed");
      }

      let assistantMsg = "";

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantMsg += chunk;
        }
      } else {
        assistantMsg = await response.text();
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantMsg },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
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
        className="fixed bottom-4 right-4 rounded-full bg-blue-600 p-3 text-white shadow-lg hover:bg-blue-700 transition"
        title="AI assistantı aç"
      >
        <span className="text-xl">💬</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-[90vw] rounded-lg border border-gray-200 bg-white shadow-xl flex flex-col h-96">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold text-gray-900">AI Köməkçi</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-4">
            Sual soruşun...
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500">
              Düşünülür...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Soru yazın..."
          disabled={loading}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          Göndər
        </button>
      </form>
    </div>
  );
}
