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
  "Sən HamıyaBravo-nun əməliyyat AI-ısan. Bir-iki qısa cümlə ilə, Azərbaycan dilində, sadə dildə izah et NIYƏ bu hərəkət israfın qarşısını alır və pulu geri qaytarır. Verilməyən rəqəm işlətmə. Jarqon yox. Sakit, inamlı ton.";

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
  const parts: string[] = [`Qərar əsası: ${rec.reason}`];
  if (batch.product) parts.push(`Məhsul: ${batch.product}`);
  if (batch.qty) parts.push(`Miqdar: ${batch.qty}`);
  if (batch.daysToExpiry !== undefined) {
    parts.push(
      `Müddət: ${batch.daysToExpiry === 1 ? "sabah" : `${batch.daysToExpiry} gün`}`
    );
  }
  if (batch.riskBand) parts.push(`Risk: ${batch.riskBand}`);
  if (batch.action) parts.push(`Hərəkət: ${batch.action}`);
  if (batch.expectedLoss) parts.push(`Əvvəl itki: ${batch.expectedLoss}`);
  if (batch.expectedRecovery) parts.push(`Bərpa: ${batch.expectedRecovery}`);
  return parts.join("\n");
}
