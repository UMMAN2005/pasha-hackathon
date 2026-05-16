import { geminiGenerate } from "./gemini";

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

const SYSTEM =
  "You are HamıyaBravo's operations AI. In 1-2 short sentences, explain in simple English WHY this action prevents waste and recovers money. No made-up numbers. No jargon. Calm, confident tone.";

export async function explainRecommendation(
  rec: ExplainInput,
  batch: BatchContext
): Promise<string> {
  const text = await geminiGenerate(SYSTEM, buildPrompt(rec, batch), {
    timeoutMs: 4000,
    maxTokens: 160,
  });
  return text ?? rec.reason;
}

function buildPrompt(rec: ExplainInput, batch: BatchContext): string {
  const parts: string[] = [`Decision: ${rec.reason}`];
  if (batch.product) parts.push(`Product: ${batch.product}`);
  if (batch.qty) parts.push(`Quantity: ${batch.qty}`);
  if (batch.daysToExpiry !== undefined) {
    parts.push(
      `Days to expiry: ${batch.daysToExpiry === 1 ? "tomorrow" : `${batch.daysToExpiry} days`}`
    );
  }
  if (batch.riskBand) parts.push(`Risk: ${batch.riskBand}`);
  if (batch.action) parts.push(`Action: ${batch.action}`);
  if (batch.expectedLoss) parts.push(`Expected loss: ${batch.expectedLoss}`);
  if (batch.expectedRecovery) parts.push(`Recovery: ${batch.expectedRecovery}`);
  return parts.join("\n");
}
