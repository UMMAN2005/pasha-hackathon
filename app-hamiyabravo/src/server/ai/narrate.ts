import { geminiGenerate } from "./gemini";

export type NarrateEvent = {
  type: "pickup";
  product: string;
  qty: number;
  buyer: string;
  recovered: string;
};

export async function narrateEvent(e: NarrateEvent): Promise<string> {
  const fallback = `${e.buyer} ${e.qty} ədəd ${e.product} aldı · +${e.recovered} · heç nə xarab olmadı`;
  const text = await geminiGenerate(
    "Canlı idarə paneli üçün bu əməliyyat hadisəsini bir qısa, sakit Azərbaycan cümləsi ilə danış. Emoji yox, verilməyən rəqəm yox.",
    `Təhvil hadisəsi: ${e.qty} × ${e.product} → ${e.buyer}, bərpa ${e.recovered}.`,
    { timeoutMs: 3500, maxTokens: 80 }
  );
  return text ?? fallback;
}
