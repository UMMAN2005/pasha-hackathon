import { geminiGenerate } from "./gemini";

export type NarrateEvent = {
  type: "pickup";
  product: string;
  qty: number;
  buyer: string;
  recovered: string;
};

export async function narrateEvent(e: NarrateEvent): Promise<string> {
  const fallback = `${e.buyer} picked up ${e.qty} units of ${e.product} · +${e.recovered} recovered · no loss`;
  const text = await geminiGenerate(
    "For the live dashboard, narrate this operational event in one short, calm English sentence. No emojis, no made-up numbers.",
    `Pickup event: ${e.qty} × ${e.product} → ${e.buyer}, recovered ${e.recovered}.`,
    { timeoutMs: 3500, maxTokens: 80 }
  );
  return text ?? fallback;
}
