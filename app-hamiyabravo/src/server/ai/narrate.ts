import { generateText } from "ai";
import { aiAvailable, getModel } from "./client";
import { withTimeout } from "@/lib/timeout";

export type NarrateEvent = {
  type: "pickup";
  product: string;
  qty: number;
  buyer: string;
  recovered: string;
};

export async function narrateEvent(e: NarrateEvent): Promise<string> {
  const fallbackTemplate = `${e.buyer} ${e.qty} ədəd ${e.product} aldı · +${e.recovered} · heç nə xarab olmadı`;

  if (!aiAvailable()) {
    return fallbackTemplate;
  }

  const userMessage = `Pickup event: ${e.qty} × ${e.product} to ${e.buyer}, recovered ${e.recovered}.`;

  const call = generateText({
    model: getModel(),
    system:
      "One short calm Azerbaijani sentence narrating this operational event for a live dashboard ticker. No emojis, no numbers you weren't given.",
    prompt: userMessage,
  }).then((result) => result.text);

  return withTimeout(call, 1500, fallbackTemplate).catch(() => fallbackTemplate);
}
