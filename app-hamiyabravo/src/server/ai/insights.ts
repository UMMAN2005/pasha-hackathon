import { geminiGenerate } from "./gemini";

// ---------- AI demand forecast / risk narrative ----------

export type ForecastInput = {
  product: string;
  riskScore: number;
  daysToExpiry: number;
  qty: number;
  avgDailySales: number;
  action: string;
};

export async function forecastNarrative(i: ForecastInput): Promise<string> {
  const projected = Math.max(
    0,
    i.qty - Math.round(i.avgDailySales * Math.max(0, i.daysToExpiry))
  );
  const fallback =
    i.riskScore >= 60
      ? `AI forecast: ~${projected} units may be unsold within ${i.daysToExpiry} days. If ${i.action} is not applied now, this product is at risk of loss.`
      : `AI forecast: demand is stable. ${i.product} will sell through to expiry on the current plan.`;

  const text = await geminiGenerate(
    "You are HamıyaBravo's demand forecast AI. Two short, confident sentences in English: (1) forecast how many units of this product might go unsold before expiry, (2) recommended action and why. Simple language, no panic, no inflated numbers.",
    `Product: ${i.product}\nRisk: ${i.riskScore}/100\nDays to expiry: ${i.daysToExpiry}\nQty on hand: ${i.qty} units\nAvg daily sales: ${i.avgDailySales}\nRecommended action: ${i.action}\nRaw forecast (unsold): ~${projected} units`,
    { timeoutMs: 4000, maxTokens: 180 }
  );
  return text ?? fallback;
}

// ---------- AI listing marketing copy ----------

export type ListingCopyInput = {
  product: string;
  category: string;
  discountPercent: number;
  city: string;
};

export type ListingCopy = { headline: string; blurb: string };

export async function listingCopy(
  i: ListingCopyInput
): Promise<ListingCopy> {
  const fallback: ListingCopy = {
    headline: `${i.product} — ${i.discountPercent}% off, fresh stock`,
    blurb: `Great price from our ${i.city} branch for restaurants. Limited time.`,
  };

  const raw = await geminiGenerate(
    'You are a B2B food market copywriter. Write compelling, concise English marketing copy for restaurants. Return ONLY JSON: {"headline": "...", "blurb": "..."}. Headline max 6 words, blurb max 14 words. No emojis.',
    `Product: ${i.product}\nCategory: ${i.category}\nDiscount: ${i.discountPercent}%\nCity: ${i.city}`,
    { timeoutMs: 4000, maxTokens: 160, temperature: 0.9 }
  );
  return parseJson<ListingCopy>(raw, fallback, (v) =>
    typeof v.headline === "string" && typeof v.blurb === "string"
      ? { headline: v.headline, blurb: v.blurb }
      : null
  );
}

// ---------- AI bid advisor (the auction brain) ----------

export type AdvisorBid = {
  id: string;
  company: string;
  reliability: number; // 0-100
  pricePerUnit: number; // qəpik
  qty: number;
};

export type BidAdvice = {
  recommendedBidId: string;
  reasoning: string;
};

export async function bidAdvisor(
  product: string,
  askPrice: number,
  bids: AdvisorBid[]
): Promise<BidAdvice | null> {
  if (bids.length === 0) return null;

  // Deterministic score: total value weighted by buyer reliability.
  const scored = bids
    .map((b) => ({
      b,
      score: b.pricePerUnit * b.qty * (0.6 + (b.reliability / 100) * 0.4),
    }))
    .sort((x, y) => y.score - x.score);
  const best = scored[0].b;
  const fallback: BidAdvice = {
    recommendedBidId: best.id,
    reasoning: `${best.company} offers the best balance: ${(
      (best.pricePerUnit * best.qty) /
      100
    ).toFixed(2)} AZN value and ${best.reliability}/100 reliability. Recommended: accept.`,
  };

  const list = bids
    .map(
      (b) =>
        `id=${b.id} | ${b.company} | reliability=${b.reliability}/100 | ${(
          b.pricePerUnit / 100
        ).toFixed(2)} AZN/unit × ${b.qty} = ${(
          (b.pricePerUnit * b.qty) /
          100
        ).toFixed(2)} AZN`
    )
    .join("\n");

  const raw = await geminiGenerate(
    'You are HamıyaBravo auction advisor AI. Pick one bid: balance total recovered value and buyer reliability. Return ONLY JSON: {"recommendedBidId":"<id>","reasoning":"<one short sentence in English>"}. Id must be from the list provided.',
    `Product: ${product}\nAsking price: ${(askPrice / 100).toFixed(
      2
    )} AZN/unit\nBids:\n${list}`,
    { timeoutMs: 4500, maxTokens: 200 }
  );

  return parseJson<BidAdvice>(raw, fallback, (v) => {
    const id = String(v.recommendedBidId ?? "");
    if (!bids.some((b) => b.id === id)) return null;
    return {
      recommendedBidId: id,
      reasoning:
        typeof v.reasoning === "string" && v.reasoning.length > 0
          ? v.reasoning
          : fallback.reasoning,
    };
  });
}

// ---------- helpers ----------

function parseJson<T>(
  raw: string | null,
  fallback: T,
  validate: (v: Record<string, unknown>) => T | null
): T {
  if (!raw) return fallback;
  try {
    const cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return fallback;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    return validate(obj) ?? fallback;
  } catch {
    return fallback;
  }
}
