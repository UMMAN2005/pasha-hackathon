import { geminiStream } from "@/server/ai/gemini";
import { getKpisService } from "@/server/services/kpis";

const OFFLINE = "AI köməkçi hazırda oflayndır";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const userText: string =
      [...(messages ?? [])]
        .reverse()
        .find((m: { role?: string }) => m?.role === "user")?.content ??
      (messages?.[messages.length - 1]?.content || "");

    let system = "Sən HamıyaBravo-nun əməliyyat köməkçisisən. Azərbaycan dilində, sadə, qısa cavab ver.";
    try {
      const k = await getKpisService();
      const top = k.atRisk
        .slice(0, 3)
        .map((r) => `${r.product} (${r.reason})`)
        .join(", ");
      system = `Sən HamıyaBravo-nun əməliyyat AI köməkçisisən. Azərbaycan dilində, sadə və qısa cavab ver. İsrafın qarşısının alınması, qida xilası, pul/CO₂ qənaətinə fokuslan.

Cari vəziyyət:
- Bu gün bərpa olunan: ₼${(k.moneyRecoveredToday / 100).toFixed(2)}
- Açıq tövsiyələr: ${k.openRecommendations}
- Riskli məhsullar: ${top}

Alıcılara daxili maya dəyərini göstərmə.`;
    } catch {
      /* keep generic system prompt */
    }

    const stream = geminiStream(system, userText || "Salam", OFFLINE);
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
