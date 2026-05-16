import { listAuctions } from "@/server/services/auction";
import { geminiGenerate } from "@/server/ai/gemini";

export const dynamic = "force-dynamic";

type Offer = {
  listingId: string;
  title: string;
  category: string;
  city: string;
  unitPrice: number; // qəpik
  available: number;
  minQty: number;
  suggestedQty: number;
  why: string;
};

const CATEGORY_HINTS: Record<string, string[]> = {
  Produce: ["produce", "fruit", "vegetable", "veg", "banana", "apple", "tomato", "salad", "fresh"],
  Bakery: ["bakery", "bread", "pastry", "croissant", "bun", "cake", "dough"],
  Dairy: ["dairy", "milk", "yogurt", "yoghurt", "cheese", "butter", "cream"],
  Meat: ["meat", "chicken", "beef", "lamb", "poultry", "protein"],
  Packaged: ["packaged", "pasta", "sauce", "canned", "dry", "ambient", "shelf"],
};

function pickQty(msg: string, minQty: number, available: number): number {
  const bulk = /\b(bulk|max(imum)?|as much|everything|all of it|large)\b/.test(msg);
  if (bulk) return Math.max(minQty, available);
  const m = msg.match(/\b(\d{1,5})\b/);
  if (m) {
    const n = parseInt(m[1], 10);
    return Math.min(available, Math.max(minQty, n));
  }
  return Math.min(available, Math.max(minQty, Math.round(available * 0.4)));
}

export async function POST(req: Request) {
  let message = "";
  let hasAttachment = false;
  try {
    const body = await req.json();
    message = String(body?.message ?? "").slice(0, 500);
    hasAttachment = Boolean(body?.hasAttachment);
  } catch {
    /* ignore — treat as empty */
  }

  const msg = message.toLowerCase();
  let auctions: Awaited<ReturnType<typeof listAuctions>> = [];
  try {
    auctions = await listAuctions();
  } catch {
    auctions = [];
  }
  const available = auctions.filter((a) => a.status === "ACTIVE" && a.qty > 0);

  // Score every live lot against the buyer's request.
  const scored = available
    .map((a) => {
      const title = a.title.toLowerCase();
      const catHints = CATEGORY_HINTS[a.category] ?? [];
      const catScore = catHints.some((h) => msg.includes(h)) ? 3 : 0;
      const titleScore = title
        .split(/\s+/)
        .filter((w) => w.length > 2 && msg.includes(w)).length;
      // Relevance = does this lot actually match the request?
      const rel = catScore + titleScore * 2;
      // Deal score only breaks ties / ranks the fallback set.
      const dealScore = a.discountPercent / 40;
      return { a, rel, score: rel + dealScore };
    })
    .sort((x, y) => y.score - x.score);

  const matched = scored.filter((s) => s.rel >= 1);
  const isFallback = matched.length === 0;
  const cheap = /\b(cheap|budget|afford|lowest|best price|save)\b/.test(msg);
  const chosen = (isFallback ? scored : matched).slice(0, 3);
  if (cheap) chosen.sort((x, y) => x.a.askPrice - y.a.askPrice);

  const offers: Offer[] = chosen.map(({ a }) => ({
    listingId: a.id,
    title: a.title,
    category: a.category,
    city: a.city,
    unitPrice: a.askPrice,
    available: a.qty,
    minQty: a.minQty,
    suggestedQty: pickQty(msg, a.minQty, a.qty),
    why:
      a.discountPercent > 0
        ? `${a.category} in ${a.city} · ${a.discountPercent}% below retail`
        : `${a.category} in ${a.city} · ready for immediate pickup`,
  }));

  const names = offers.map((o) => o.title).join(", ");
  const attachNote = hasAttachment
    ? " I've also noted your attached document."
    : "";
  const deterministic =
    offers.length === 0
      ? "Nothing is live for that exact request right now — ask me for fruit, bakery, dairy, meat or packaged surplus and I'll pull buyable offers instantly."
      : isFallback
        ? `I don't have an exact match live right now, so here are the ${offers.length} strongest surplus lots you can grab today instead — ${names}.${attachNote} Set a quantity and buy in one click; no bidding.`
        : `Found ${offers.length} ${
            offers.length === 1 ? "lot" : "lots"
          } that fit — ${names}.${attachNote} Pick a quantity and confirm in one click; no bidding, instant pickup code.`;

  const SYSTEM =
    "You are Bravo AI, a concise purchasing concierge for restaurant buyers. " +
    "In 1-2 warm, confident English sentences, tell the buyer you found matching " +
    "surplus lots they can buy in one click. Do not invent products or prices.";
  const prompt = [
    `Buyer request: ${message || "(no text — voice/empty)"}`,
    hasAttachment ? "Buyer attached a document (treat as a shopping list)." : "",
    isFallback
      ? `No exact match; offering closest available lots: ${names || "none"}`
      : `Matched lots: ${names || "none"}`,
  ]
    .filter(Boolean)
    .join("\n");

  let reply = deterministic;
  try {
    const ai = await geminiGenerate(SYSTEM, prompt, {
      timeoutMs: 3500,
      maxTokens: 140,
    });
    if (ai && ai.trim()) reply = ai.trim();
  } catch {
    /* keep deterministic */
  }

  // A brief, deliberate "scanning" beat — instant replies feel fake in a demo.
  await new Promise((r) => setTimeout(r, 1400));

  return Response.json({ reply, offers });
}
