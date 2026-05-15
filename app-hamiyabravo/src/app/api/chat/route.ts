import { streamText } from "ai";
import { aiAvailable, getModel } from "@/server/ai/client";
import { getKpisService } from "@/server/services/kpis";

export async function POST(req: Request) {
  const OFFLINE_CHUNK = "AI köməkçi hazırda oflayndır";

  try {
    const { messages } = await req.json();

    if (!aiAvailable()) {
      return new Response(OFFLINE_CHUNK, {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    }

    const kpis = await getKpisService();
    const systemPrompt = buildSystemPrompt(kpis);

    try {
      const result = streamText({
        model: getModel(),
        system: systemPrompt,
        messages,
      });

      return result.toTextStreamResponse();
    } catch {
      return new Response(OFFLINE_CHUNK, {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    }
  } catch {
    return new Response("AI köməkçi hazırda oflayndır", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  }
}

function buildSystemPrompt(kpis: Awaited<ReturnType<typeof getKpisService>>): string {
  const {
    moneyRecoveredToday,
    openRecommendations,
    atRisk,
  } = kpis;

  const atRiskSummary = atRisk
    .slice(0, 3)
    .map((r) => `${r.product} (${r.reason})`)
    .join(", ");

  return `You are HamıyaBravo's operations AI assistant for the demo. Answer questions about waste prevention and food rescue in Azerbaijani, plain language.

Current ops snapshot:
- Money recovered today: ₼${(moneyRecoveredToday / 100).toFixed(2)}
- Open recommendations: ${openRecommendations}
- At-risk products: ${atRiskSummary}

Be calm, clear, and focus on the impact (money, meals, CO₂ saved). Do not show internal cost data to buyers.`;
}
