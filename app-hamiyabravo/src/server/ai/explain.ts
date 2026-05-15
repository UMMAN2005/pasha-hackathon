import { generateText } from "ai";
import { aiAvailable, getModel } from "./client";
import { withTimeout } from "@/lib/timeout";

export type ExplainInput = {
  reason: string;
};

export type BatchContext = {
  product?: string;
  qty?: number;
  daysToExpiry?: number;
  riskBand?: string;
  action?: string;
  expectedLoss?: string;
  expectedRecovery?: string;
};

export async function explainRecommendation(
  rec: ExplainInput,
  batch: BatchContext
): Promise<string> {
  if (!aiAvailable()) {
    return rec.reason;
  }

  const userMessage = buildExplainPrompt(rec, batch);

  const call = generateText({
    model: getModel(),
    system:
      "You are HamıyaBravo's operations AI. In ONE or TWO short sentences, in Azerbaijani, plain non-technical language, explain WHY this action prevents waste and recovers money. No numbers beyond what is given. No jargon, no model talk. Calm, confident.",
    prompt: userMessage,
  }).then((result) => result.text);

  return withTimeout(call, 1500, rec.reason).catch(() => rec.reason);
}

function buildExplainPrompt(rec: ExplainInput, batch: BatchContext): string {
  const parts = [];

  if (batch.product) parts.push(`Məhsul: ${batch.product}`);
  if (batch.qty) parts.push(`Miqdar: ${batch.qty}`);
  if (batch.daysToExpiry !== undefined) {
    const dayWord =
      batch.daysToExpiry === 1 ? "sabah" : `${batch.daysToExpiry} gün`;
    parts.push(`Müddət: ${dayWord}`);
  }
  if (batch.riskBand) parts.push(`Risk: ${batch.riskBand}`);
  if (batch.action) parts.push(`Hərəkət: ${batch.action}`);
  if (batch.expectedLoss) parts.push(`Əvvəl itki: ${batch.expectedLoss}`);
  if (batch.expectedRecovery) parts.push(`Bərpa: ${batch.expectedRecovery}`);

  return parts.join("\n");
}
