import { geminiStream } from "@/server/ai/gemini";
import { getKpisService } from "@/server/services/kpis";

const OFFLINE =
  "I'm Bravo AI — running in offline mode right now, but here's what I'd focus on: clear the highest-risk items into auctions and accept the strongest bids to lock in recovery.";

const PERSONA = `You are Bravo AI — the proactive operations co-pilot for Bravo supermarkets in Azerbaijan.
Personality: sharp, upbeat, confident, refreshingly concise. You genuinely care about killing food waste and turning surplus into recovered money, donated meals and saved CO₂.
Style: plain English, lead with the action, 1-3 short sentences, no jargon, a little warmth, zero fluff. Never reveal internal cost data to buyers. You are pragmatic and decisive — you recommend, you don't waffle.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const userText: string =
      [...(messages ?? [])]
        .reverse()
        .find((m: { role?: string }) => m?.role === "user")?.content ??
      (messages?.[messages.length - 1]?.content || "");

    let system = PERSONA;
    try {
      const k = await getKpisService();
      const top = k.atRisk
        .slice(0, 3)
        .map((r) => `${r.product} (${r.reason})`)
        .join(", ");
      system = `${PERSONA}

Live operations snapshot you can reference:
- Money recovered today: ₼${(k.moneyRecoveredToday / 100).toFixed(2)}
- Open AI recommendations: ${k.openRecommendations}
- Top at-risk products: ${top}`;
    } catch {
      /* keep persona-only system prompt */
    }

    const stream = geminiStream(system, userText || "Hello", OFFLINE);
    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return new Response(OFFLINE, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
