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
      ? `AI proqnozu: ${i.daysToExpiry} gün ərzində təxminən ${projected} ədəd satılmadan qala bilər. ${i.action} indi tətbiq edilməsə, bu məhsul itki riskindədir.`
      : `AI proqnozu: tələbat sabitdir, ${i.product} normal satış planı ilə müddətinədək satılacaq.`;

  const text = await geminiGenerate(
    "Sən HamıyaBravo-nun tələbat proqnozu AI-ısan. İki qısa, inamlı Azərbaycan cümləsi: (1) bu məhsulun müddətinə qədər nə qədərinin satılmadan qala biləcəyi proqnozu, (2) tövsiyə olunan hərəkət və niyə. Sadə dil, panika yox, rəqəmləri şişirtmə.",
    `Məhsul: ${i.product}\nRisk: ${i.riskScore}/100\nMüddət: ${i.daysToExpiry} gün\nAnbar: ${i.qty} ədəd\nGünlük orta satış: ${i.avgDailySales}\nTövsiyə: ${i.action}\nXam proqnoz (satılmamış): ~${projected} ədəd`,
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
    headline: `${i.product} — ${i.discountPercent}% endirimlə təzə`,
    blurb: `${i.city} filialından restoranlar üçün münasib qiymət. Tez tükənə bilər.`,
  };

  const raw = await geminiGenerate(
    'Sən B2B qida bazarı üçün marketinq mətni yazan AI-san. Restoranlara xitabən cəlbedici, qısa Azərbaycan mətni yarat. SADƏCƏ JSON qaytar: {"headline": "...", "blurb": "..."}. headline 6 sözə qədər, blurb 14 sözə qədər. Emoji yox.',
    `Məhsul: ${i.product}\nKateqoriya: ${i.category}\nEndirim: ${i.discountPercent}%\nŞəhər: ${i.city}`,
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
    reasoning: `${best.company} ən yaxşı balansı verir: ${(
      (best.pricePerUnit * best.qty) /
      100
    ).toFixed(2)} ₼ dəyər və ${best.reliability}/100 etibarlılıq. Tövsiyə: qəbul et.`,
  };

  const list = bids
    .map(
      (b) =>
        `id=${b.id} | ${b.company} | etibar=${b.reliability}/100 | ${(
          b.pricePerUnit / 100
        ).toFixed(2)} ₼/ədəd × ${b.qty} = ${(
          (b.pricePerUnit * b.qty) /
          100
        ).toFixed(2)} ₼`
    )
    .join("\n");

  const raw = await geminiGenerate(
    'Sən HamıyaBravo-nun hərrac məsləhətçisi AI-ısan. Verilən təkliflərdən birini seç: ən yüksək ümumi bərpa və alıcı etibarlılığını balanslaşdır. SADƏCƏ JSON qaytar: {"recommendedBidId":"<id>","reasoning":"<bir qısa Azərbaycan cümləsi>"}. id mütləq verilən siyahıdan olmalıdır.',
    `Məhsul: ${product}\nİstənilən qiymət: ${(askPrice / 100).toFixed(
      2
    )} ₼/ədəd\nTəkliflər:\n${list}`,
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
