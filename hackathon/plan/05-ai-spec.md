# 05 — AI & Decision Spec

Two AI tiers, exactly as the locked decision says:

1. **Deterministic core** (`domain/risk.ts`, `domain/decision.ts`, `domain/sustainability.ts`) — pure functions, implement PRD §11.1 / §11.3 / §2. Never fails, never needs internet. This is the real engine and what the unit tests pin.
2. **Claude layer** (`server/ai/*`) — explanation, narration, ops chatbot. Enriches text only. Always has a deterministic fallback so the demo is byte-stable offline.

## 1. Risk formula (PRD §11.1) — exact definition

PRD §11.1 leaves `expiry_urgency_factor` and `demand_slowdown_factor` undefined. We define them precisely and transparently:

```
todayDate           = getToday()                         // lib/clock.ts, pinned by DEMO_TODAY
daysToExpiry        = max(daysBetween(expiryDate, todayDate), 0)
sales14             = sum of SalesTransaction.quantity for this product+branch in the 14 days before today
avgDailySales14d    = sales14 / 14                        // float, internal only
projectedSales      = avgDailySales14d * daysToExpiry
expectedUnsoldQty   = max(quantityOnHand - projectedSales, 0)
base                = expectedUnsoldQty / quantityOnHand   // 0..1   (0 if qty 0)

U_WINDOW            = 7
URGENCY_BOOST       = 0.5
expiryUrgencyFactor = 1 + URGENCY_BOOST * (max(0, U_WINDOW - daysToExpiry) / U_WINDOW)
                      // daysToExpiry 0 -> 1.5 ; 3 -> 1.2857 ; 7+ -> 1.0

avgFirst7           = sum(days -14..-8) / 7
avgLast7            = sum(days -7..-1)  / 7
demandSlowdownFactor= clamp(avgFirst7 / max(avgLast7, 0.0001), 1, 1.5)
                      // sales slowing down recently -> >1 ; stable/rising -> 1.0

wasteProbability    = clamp(base * expiryUrgencyFactor * demandSlowdownFactor, 0, 1)
riskScore           = round(wasteProbability * 100)        // 0..100 int
expectedUnsoldRound = round(expectedUnsoldQty)
expectedLoss        = expectedUnsoldRound * costPerUnit    // qəpik (PRD §11.1)
confidence          = round2(clamp(0.5 + 0.5 * min(salesDays,14)/14, 0, 0.99))
```

All constants (`U_WINDOW`, `URGENCY_BOOST`, slowdown clamp bounds) are named exports in `domain/risk.ts` (PRD §15 maintainability: rules configurable without code spelunking).

### Worked example — Greek Yogurt 500g → 86 (proves the formula + seed)

Seed: qty 120, expiry 2026-05-18, today 2026-05-15, 14-day sales SUM = **185**, cost 180 qəpik.

```
daysToExpiry      = 3
avgDailySales14d  = 185 / 14            = 13.214
projectedSales    = 13.214 * 3          = 39.643
expectedUnsoldQty = 120 - 39.643        = 80.357
base              = 80.357 / 120        = 0.6696
expiryUrgencyFactor = 1 + 0.5*((7-3)/7) = 1.2857
demandSlowdownFactor= 1.0               (flat-enough series, avgFirst7≈avgLast7)
wasteProbability  = 0.6696 * 1.2857     = 0.8609
riskScore         = round(86.09)        = 86      ✓ matches PRD §18
expectedLoss      = round(80.357)*180   = 80*180  = 14 400 qəpik = 144.00 ₼
```

### Canonical seed sales totals (AUTHORITATIVE — supersedes the illustrative avg column in `02-data-model.md`)

The 14-day `SalesTransaction` series per product is a deterministic integer series whose **sum** equals the value below (distribute as evenly as possible across the 14 days; the small day-to-day variance keeps `demandSlowdownFactor ≈ 1.0`). These sums make the formula reproduce PRD §18:

| Product | 14-day sales SUM | daysToExpiry | → riskScore | §18 target |
|---|---|---|---|---|
| Greek Yogurt 500g | 185 | 3 | 86 | 86 ✓ |
| Chicken Breast 1kg | 101 | 2 | 92 | 92 ✓ |
| Bananas (kg) | 1236 | 1 | 88 | 88 ✓ |
| Croissants Pack | 98 | 0 | 100 | 95 (saturates — see note) |
| Pasta Sauce 500g | 95 | 26 | 41 | 41 ✓ |

**Croissants note:** any batch with `daysToExpiry = 0` has `projectedSales = 0` → `base = 1.0` → score saturates at 100. This is *more* correct than PRD §18's illustrative 95 (nothing can sell after the expiry day) and preserves ordering (it is the single most urgent batch). Document this in the demo Q&A prep (`07`); do not "fudge" the formula to hit 95.

**Test strategy (TDD, honest):**
- Unit test pins `scoreBatch()` on **fixed synthetic input vectors** → exact expected outputs (pure function, no seed dependency). This is the real RED/GREEN.
- Integration test seeds the DB, runs recalc, asserts each product's score is within **±2** of the table above AND the **risk ordering** is `Croissants ≥ Chicken ≥ Bananas ≥ Yogurt > Pasta` AND Pasta < 50. Ordering + bands matter for the demo, not exact equality.

## 2. Decision engine (PRD §11.3) — exact rules

Constants: `QTY_HIGH = 100`. Evaluated top-down, first match wins. Returns `{ actionType, priority, reason, complianceGate }`.

| # | Condition | actionType | priority | reason (AZ, plain) |
|---|---|---|---|---|
| 1 | `condition === UNSAFE` OR (`daysToExpiry <= 1` AND `condition === UNSAFE`) | `DISPOSE` | 1 | "Təhlükəsizlik riski — satış bloklandı, utilizasiya/yoxlama" |
| 2 | `condition === CHECK_REQUIRED` AND `riskScore >= 80` | `LIST_B2B` (`complianceGate=true`) | 1 | "Kritik — əvvəlcə uyğunluq yoxlaması, sonra təcili B2B" |
| 3 | `riskScore >= 80` AND `qty >= QTY_HIGH` AND category ∈ {Produce, Bakery} | `BUNDLE` | 2 | "Yüksək risk — kafelər/çörəkxanalar üçün dəstə təklifi" |
| 4 | `riskScore >= 80` AND `qty >= QTY_HIGH` | `LIST_B2B` | 2 | "Bu gün hərəkət lazımdır — restoranlara endirimlə B2B" |
| 5 | `riskScore >= 80` | `LIST_B2B` | 2 | "Yüksək risk — B2B siyahıya əlavə et" |
| 6 | `riskScore` 50–79 | `IN_STORE_DISCOUNT` | 3 | "Orta risk — mağazada endirim, 24 saat izlə" |
| 7 | else (`riskScore < 50`) | `KEEP` | 5 | "Sabit — adi satış planı, izləməyə davam" |

(PRD §11.3 rows for inter-branch transfer, supplier return, donation are encoded as `ActionType.TRANSFER/SUPPLIER_RETURN/DONATE` constants and reachable if data warrants, but the seed dataset deliberately routes the 5 demo batches through rows 2–7 to match PRD §18. Documented as roadmap, not demo path — `00-overview.md` scope cut.)

§18 cross-check: Yogurt(86,120,Dairy)→row4 LIST_B2B ✓ · Chicken(92,45,CHECK_REQUIRED)→row2 compliance+LIST_B2B ✓ · Bananas(88,230,Produce)→row3 BUNDLE ✓ · Croissants(100,80,Bakery)→ qty 80 < 100 so row5 LIST_B2B, flagged urgent by ladder ✓ ("same-day flash") · Pasta(41)→row7 KEEP ✓.

## 3. Discount ladder & pricing (PRD §11.2 rule-based, §13)

```
discountPercent(riskScore):
  >= 90 -> 45
  80-89 -> 40
  70-79 -> 30
  50-69 -> 20
  < 50  -> 0      (no listing created; KEEP)

listingUnitPrice = max( round(retailPrice * (100 - discountPercent)/100), costPerUnit )
                    // never sell below cost (margin floor, PRD §13)
```

§18 cross-check: Yogurt risk 86 → 40% ✓ (PRD "40% discount"). Croissants 100 → 45% (PRD says "flash sale"; 45% is the strong flash tier). Bananas 88 → 40% bundle. Chicken 92 → 45% after compliance.

### Money figures shown in the queue (PRD §7.1 Action Queue)
```
expectedLoss      = expectedUnsoldQty_round * costPerUnit          // "Heç nə etməsək ₼Y itki"
expectedRecovery  = expectedUnsoldQty_round * listingUnitPrice     // "Bərpa olunur +₼X"
```
Both written onto the `Recommendation` row at recalc time (deterministic, stable on stage).

### Risk bands → badge (UI only)
`80–100 Kritik` (ember) · `60–79 Yüksək` (amber) · `40–59 İzlə` (sage) · `0–39 Sabit` (green).

### Confidence → words
`>=0.8 "yüksək"` · `0.6–0.79 "orta"` · `<0.6 "aşağı"`. With 14 days of seed sales → 0.99 → "yüksək" for all demo batches.

## 4. Sustainability math (PRD §2, §7.1) — `domain/sustainability.ts`

Named, configurable constants (PRD §2 KPIs: meals saved, kg saved, CO₂e avoided):

```
KG_PER_MEAL  = 0.42      // kg of food ≈ one meal
CO2E_PER_KG  = 2.5       // kg CO₂e avoided per kg food not wasted (food-waste avg)

unitWeightKg per product (seed):
  Greek Yogurt 500g 0.5 · Chicken Breast 1kg 1.0 · Bananas 1.0 · Croissants Pack 0.4 · Pasta Sauce 500g 0.5

For all PICKED_UP orders (optionally filtered to today for the daily hero):
  kgSaved      = Σ order.quantity * unitWeightKg(product)
  mealsSaved   = floor(kgSaved / KG_PER_MEAL)
  co2eAvoided  = round1(kgSaved * CO2E_PER_KG)            // kg
  moneyRecovered = Σ order.totalAmount                     // qəpik
  wasteLost      = 0                                       // demo loop closes with zero waste
```

These power the `/admin` impact strip and the closing Impact screen (storyboard 52–60s).

## 5. Claude layer — prompts, models, fallback

Model: `claude-sonnet-4-6` (env `ANTHROPIC_MODEL`). All calls `withTimeout(1500ms)` → fallback. `server/ai/client.ts` gates on `AI_ENABLED==='true' && ANTHROPIC_API_KEY`.

### 5.1 `explainRecommendation(rec, batch)` — the "Niyə? / Why?" line
- **System prompt:**
  > You are HamıyaBravo's operations AI. In ONE or TWO short sentences, in Azerbaijani, plain non-technical language, explain WHY this action prevents waste and recovers money. No numbers beyond what is given. No jargon, no model talk. Calm, confident.
- **User content:** product name, qty, daysToExpiry (as a word: "sabah/2 gün"), riskScore band word, recommended action, expectedLoss ₼, expectedRecovery ₼.
- **Fallback (no AI / error / timeout):** return `rec.reason` (already deterministic, AZ, from the decision table). The UI is identical in shape; only richness differs. Demo never breaks.

### 5.2 `narrateEvent(event)` — the live loop-close status line
- Input event e.g. `{type:'pickup', product:'Yunan qatığı 500q', qty:120, buyer:'Astoria Hotel', recovered: '1 248 ₼'}`.
- **System prompt:** "One short calm Azerbaijani sentence narrating this operational event for a live dashboard ticker. No emojis, no numbers you weren't given."
- **Fallback template:** `` `${buyer} ${qty} ədəd ${product} aldı · +${recovered} · heç nə xarab olmadı` ``.

### 5.3 `/api/chat` — ops assistant (admin surface only)
- Streaming via Vercel AI SDK (`streamText`, `@ai-sdk/anthropic`).
- **System prompt:** grounds Claude with current KPIs + top recommendations (read server-side via `getKpisService()` — never raw cost echoed; this surface is internal so cost is allowed here, but the prompt forbids inventing data). "You are HamıyaBravo's ops copilot for Bravo staff. Answer in Azerbaijani, concise. Use only the context provided. If unknown, say so."
- Optional tool (time-permitting, P1): `getKpis` (read-only). Skip if behind schedule — chat with injected context is enough for the demo.
- **Fallback (unavailable):** stream a single chunk: `"AI köməkçi hazırda oflayndır. Əsas göstəricilər aşağıda göstərilir."` UI stays functional.

### Guardrails
- Buyer surface (`(market)`) has **no** AI affordance — zero risk of leaking internal data to a buyer (PRD §15 privacy).
- AI text is display-only; it never changes `riskScore`, `recommendation`, prices, or stock. The loop is driven entirely by the deterministic core.
