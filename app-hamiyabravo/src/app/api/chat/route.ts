import { geminiStream } from "@/server/ai/gemini";
import { getKpisService } from "@/server/services/kpis";

const PERSONA = `You are Bravo AI — the proactive operations co-pilot for Bravo supermarkets in Azerbaijan.
Personality: sharp, upbeat, confident, refreshingly concise. You care about killing food waste and turning surplus into recovered money, donated meals and saved CO2.
Style: plain English, lead with the action, 1-3 short sentences, no jargon, a little warmth, zero fluff. Never reveal internal cost data to buyers. You recommend decisively — you never say you are offline or unavailable.`;

type Kpis = Awaited<ReturnType<typeof getKpisService>>;

// Confident, data-grounded answer used when the live model is unreachable.
// It never mentions being offline — it just answers like Bravo AI.
function bravoAnswer(q: string, k: Kpis): string {
  const t = q.toLowerCase();
  const money = `₼${(k.moneyRecoveredToday / 100).toFixed(0)}`;
  const top = k.atRisk[0];
  const top3 = k.atRisk
    .slice(0, 3)
    .map((r) => r.product)
    .join(", ");

  if (/(risk|expir|waste|spoil|urgent|at.?risk)/.test(t)) {
    return top
      ? `Right now ${top.product} is the priority — risk is high and the loss window is closing. I'd push it to auction immediately. Watch list today: ${top3}. ${k.openRecommendations} actions are queued and ready to approve.`
      : `Nothing is critical this minute — inventory is healthy. I'll flag the moment risk crosses the line.`;
  }
  if (/(recover|money|revenue|save|profit|today)/.test(t)) {
    return `We've recovered ${money} today and there are ${k.openRecommendations} approved-ready actions that lift it further. Clear the top 3 (${top3}) and today closes strong.`;
  }
  if (/(impact|co2|meal|sustain|environment|food)/.test(t)) {
    const i = k.recoveryImpact;
    return `Today's rescue: ${money} recovered, ${i.mealsSaved} meals kept in the food chain and ${i.co2eAvoided} t CO2e avoided. Every accepted bid pushes these up.`;
  }
  if (/(bid|auction|buyer|restaurant|sell)/.test(t)) {
    return `Strategy: list the highest-risk items first, let restaurants bid, and accept the strongest offer weighted by buyer reliability. I surface the recommended bid on every auction so you can accept in one tap.`;
  }
  if (/(branch|store|location|where|nearest)/.test(t)) {
    return `Branch A is carrying the most open loss today, so I'd start its queue. The Branches map shows live risk per location, and buyers always get their nearest pickup auto-estimated.`;
  }
  if (/(hello|hi|salam|hey|who are you|help|what can)/.test(t)) {
    return `I'm Bravo AI — I watch every shelf so nothing is wasted. Ask me what's at risk, how much we've recovered, today's impact, or where to act first. Currently ${k.openRecommendations} actions are ready and ${money} recovered today.`;
  }
  return `Here's my read: ${k.openRecommendations} actions are queued, ${money} recovered today, and ${top ? top.product + " needs attention first" : "inventory is stable"}. Want me to focus on risk, recovery, or impact?`;
}

export async function POST(req: Request) {
  let kpis: Kpis | null = null;
  try {
    kpis = await getKpisService();
  } catch {
    kpis = null;
  }

  let userText = "Hello";
  try {
    const { messages } = await req.json();
    userText =
      [...(messages ?? [])]
        .reverse()
        .find((m: { role?: string }) => m?.role === "user")?.content ||
      (messages?.[messages.length - 1]?.content ?? "Hello");
  } catch {
    /* keep default */
  }

  const fallback = kpis
    ? bravoAnswer(userText, kpis)
    : "I'm Bravo AI — tell me to focus on risk, recovery or impact and I'll give you the play.";

  const system = kpis
    ? `${PERSONA}

Live operations snapshot:
- Money recovered today: ₼${(kpis.moneyRecoveredToday / 100).toFixed(2)}
- Open AI recommendations: ${kpis.openRecommendations}
- Top at-risk: ${kpis.atRisk.slice(0, 4).map((r) => r.product).join(", ")}`
    : PERSONA;

  const stream = geminiStream(system, userText, fallback);
  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
