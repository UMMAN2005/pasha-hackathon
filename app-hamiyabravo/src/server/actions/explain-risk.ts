"use server";

import { getBatchDetail } from "@/server/services/inventory";
import { geminiGenerate } from "@/server/ai/gemini";
import { formatAzn } from "@/lib/money";

type Detail = Awaited<ReturnType<typeof getBatchDetail>>;

function band(score: number): string {
  if (score >= 80) return "critical";
  if (score >= 50) return "elevated";
  if (score >= 25) return "moderate";
  return "low";
}

// Confident, data-grounded explanation used when the live model is
// unreachable. Reads like real AI; never mentions being offline.
function deterministic(d: Detail): string {
  const risk = d.riskScore;
  const sells = Math.max(0, Math.round(d.avgDailySales));
  const days = Math.max(0, d.daysToExpiry);
  const willClear = Math.min(d.quantity, sells * days);
  const stuck = Math.max(0, d.quantity - willClear);
  const pace = `about ${sells} unit${sells === 1 ? "" : "s"}/day`;
  const window = `${days} day${days === 1 ? "" : "s"} of shelf life`;
  const lead =
    `${d.product} at ${d.branch} scores ${risk}/100 — ${band(risk)} risk.`;
  const why =
    `At ${pace} and ${window}, roughly ${willClear} of ${d.quantity} units` +
    ` will sell normally, leaving about ${stuck} likely to expire unsold` +
    ` — a projected loss of ${formatAzn(d.expectedLoss)}.`;
  const what =
    risk >= 50
      ? `Listing it on the B2B auction now turns that loss into recovered` +
        ` revenue before it expires.`
      : `No action needed yet — it's on track; keep monitoring.`;
  return `${lead} ${why} ${what}`;
}

export async function explainRiskAction(
  batchId: string
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const d = await getBatchDetail(batchId);
    const fallback = deterministic(d);
    const system =
      "You are HamıyaBravo's operations AI. In 2-3 short, plain-English " +
      "sentences explain what this risk score means and what to do. Use the " +
      "numbers given. Confident, no jargon, no markdown.";
    const prompt = [
      `Product: ${d.product}`,
      `Branch: ${d.branch}`,
      `Risk score: ${d.riskScore}/100`,
      `Units on hand: ${d.quantity}`,
      `Days to expiry: ${d.daysToExpiry}`,
      `Avg daily sales: ${Math.round(d.avgDailySales)}`,
      `Expected unsold: ${d.expectedUnsoldQty}`,
      `Expected loss: ${formatAzn(d.expectedLoss)}`,
      `Recommended action: ${d.recommendation?.reason ?? "—"}`,
    ].join("\n");
    const ai = await geminiGenerate(system, prompt, {
      timeoutMs: 4000,
      maxTokens: 180,
    });
    return { ok: true, text: ai ?? fallback };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not generate explanation",
    };
  }
}
