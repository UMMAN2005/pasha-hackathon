// Provider-agnostic AI core backed by the Google Gemini REST API.
// Direct fetch — no SDK dependency. Every caller has a deterministic
// fallback so the demo never breaks (offline / no key / error / timeout).

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function model(): string {
  return process.env.GEMINI_MODEL || "gemini-2.0-flash";
}

function apiKey(): string {
  return process.env.GEMINI_API_KEY || "";
}

export function aiAvailable(): boolean {
  return process.env.AI_ENABLED === "true" && apiKey().length > 0;
}

/**
 * One-shot generation. Returns the text, or null on any failure
 * (caller substitutes its deterministic fallback).
 */
export async function geminiGenerate(
  system: string,
  prompt: string,
  opts: { timeoutMs?: number; maxTokens?: number; temperature?: number } = {}
): Promise<string | null> {
  if (!aiAvailable()) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 3500);

  try {
    const res = await fetch(
      `${BASE}/${model()}:generateContent?key=${apiKey()}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: opts.temperature ?? 0.7,
            maxOutputTokens: opts.maxTokens ?? 320,
          },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("")
        .trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Streaming generation as a plain-text ReadableStream (SSE decoded).
 * On unavailability/error, emits a single fallback chunk so the
 * client always renders something.
 */
export function geminiStream(
  system: string,
  userText: string,
  fallback: string
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();

  if (!aiAvailable()) {
    return new ReadableStream({
      start(c) {
        c.enqueue(enc.encode(fallback));
        c.close();
      },
    });
  }

  return new ReadableStream({
    async start(controller) {
      try {
        const res = await fetch(
          `${BASE}/${model()}:streamGenerateContent?alt=sse&key=${apiKey()}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: system }] },
              contents: [{ role: "user", parts: [{ text: userText }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
            }),
          }
        );

        if (!res.ok || !res.body) {
          controller.enqueue(enc.encode(fallback));
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let emitted = false;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const json = t.slice(5).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json);
              const piece: string =
                parsed?.candidates?.[0]?.content?.parts
                  ?.map((p: { text?: string }) => p.text ?? "")
                  .join("") ?? "";
              if (piece) {
                emitted = true;
                controller.enqueue(enc.encode(piece));
              }
            } catch {
              /* skip malformed SSE line */
            }
          }
        }
        if (!emitted) controller.enqueue(enc.encode(fallback));
        controller.close();
      } catch {
        controller.enqueue(enc.encode(fallback));
        controller.close();
      }
    },
  });
}
