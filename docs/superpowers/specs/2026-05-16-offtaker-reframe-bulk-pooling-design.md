# HamıyaBravo — Off-taker Reframe + Cross-Branch Bulk Pooling

**Date:** 2026-05-16
**Status:** Approved (design) — ready for implementation plan
**Owner:** Umman Mammadov

## 1. Problem & Motivation

Hackathon mentors raised four objections to the current "restaurants bid on near-expiry
supermarket surplus" framing:

1. Restaurants shouldn't buy products very close to expiry.
2. Professional buyers purchase in big bulk; single-branch surplus is too small to matter.
3. The biggest waste categories are fruit and bakery — a poor fit for restaurants.
4. We should target specific clients that can directly utilize these products.

These critiques do not invalidate the AI surplus-recovery engine; they invalidate the
*generic-restaurant buyer framing*. The fix is a **buyer-side reframe**: route each surplus
category to the off-taker segment that can actually consume it, pool volume across nearby
branches into bulk lots, and auto-donate whatever doesn't clear. This makes the AI the
hero of the pitch and turns every objection into a feature.

## 2. Goals / Non-Goals

**Goals**
- Segment buyers into off-taker types and match surplus category → best-fit segment via AI.
- Aggregate the same product across nearby branches into a single bulk lot.
- Auto-route unsold-at-expiry lots to a food-bank (donation) tier — never a total loss.
- Reseed demo data as named off-takers; add a judge-facing "critique → answer" narrative.
- Keep the existing risk engine, auction, admin and buyer panels working; demo stays solid.

**Non-Goals (YAGNI / post-hackathon)**
- Hard bid-eligibility gating (use a soft "out-of-policy" flag instead).
- Per-segment dynamic pricing engine.
- Multi-branch pickup logistics / hub routing orchestration.
- New per-segment dashboards or analytics surfaces.

## 3. Critique → Answer Mapping

| Mentor critique | Feature that answers it |
|---|---|
| Near-expiry is bad for restaurants | `KITCHEN` segment cooks same-day; donation fallback for the rest |
| Small lots are useless for bulk buyers | Cross-branch bulk pooling into one aggregated lot |
| Fruit & bakery are the real waste, poor restaurant fit | Category→segment matrix: fruit→`PROCESSOR`, bakery→`BAKERY_CAFE_FEED` |
| Target specific clients who directly utilize products | AI best-match segment per lot + segmented off-taker marketplace |

## 4. Data Model Changes (additive only — `prisma db push`, no destructive migrate)

`Company` (additive, nullable):
- `segment String?` — one of `PROCESSOR | BAKERY_CAFE_FEED | KITCHEN | FOOD_BANK`
  (set for `type = BUYER` companies; null for Bravo/internal).

`MarketplaceListing` (additive, nullable, default single-branch behaviour):
- `pooledQty Int?` — total quantity across pooled branches (null = not pooled).
- `pooledBranches Int?` — count of contributing branches (null/1 = single).
- `targetSegment String?` — AI best-match segment for the lot.
- `donated Boolean @default(false)` — routed to food-bank tier.

All columns nullable/defaulted so existing rows and code paths keep working.

## 5. Components

### 5.1 `src/domain/offtaker.ts` (pure, unit-testable)
- `OFFTAKER_SEGMENTS` constant + display labels.
- `CATEGORY_SEGMENTS: Record<categoryName, Segment[]>` capability matrix, e.g.
  - Fruit / Produce → `[PROCESSOR, KITCHEN]`
  - Bakery → `[BAKERY_CAFE_FEED]`
  - Dairy / Meat → `[KITCHEN]`
  - (any) → `FOOD_BANK` always eligible as fallback.
- `bestSegment(category, candidates)` → ranked segment + a short human "why"
  string, scored by matrix fit × buyer reliability × proximity.
- `isOnPolicy(buyerSegment, listingTargetSegment)` → boolean for the soft flag.

### 5.2 `src/server/services/offtaker-match.ts`
- Given a listing/recommendation (category, branch, candidate buyers) returns
  `{ segment, label, why, confidence }` using `offtaker.ts`.
- Used by the AI queue card and the marketplace listing detail.

### 5.3 Cross-branch pooling (seed-level aggregation — demo-safe)
- Aggregation happens in `prisma/seed.ts` when building the marketplace: group the
  same `productId` across nearby branches into ONE `MarketplaceListing`, setting
  `pooledQty` (sum), `pooledBranches` (count), and `maxQty = pooledQty`.
- No runtime grouping engine (keeps the auction/bid path unchanged and low-risk).
- Listing UI shows "Pooled from N branches · {pooledQty} units".

### 5.4 Donation fallback
- In `prisma/seed.ts`, a closing pass: a slice of expiring, unsold listings is marked
  `donated = true` and assigned to a `FOOD_BANK` company as a donation order, so the
  Impact/KPIs and admin show a real donation tier ("nothing is a total loss").

### 5.5 AI match + soft policy in UI
- AI Queue card and marketplace listing detail render a "Best match: {label} — {why}"
  badge from `offtaker-match`.
- Buyer companies show their segment; a bid from a non-matching segment renders an
  "out-of-policy" pill (informational only — not blocked).

### 5.6 Reseed
- Replace generic buyer companies with named off-takers per segment, e.g.
  `PROCESSOR`: "Gəncə Juicery", "Caspian Jam Co"; `BAKERY_CAFE_FEED`: "City Café Group",
  "AgroFeed Farm"; `KITCHEN`: "Baku Central Kitchen", "Astoria Hotel"; `FOOD_BANK`:
  "Food Bank Azerbaijan". Bids generated consistent with capability matrix.

### 5.7 Pitch narrative (stretch, low-effort/high-value)
- A static `/pitch` route (or a section on admin Overview) with the one-line thesis and
  the critique→answer table from §3. Marked stretch; cut first if time is short.

## 6. Data Flow

Surplus batch → risk score (unchanged) → recommendation → **pooled** across nearby
branches into one lot → AI assigns `targetSegment` (best-match) → segmented off-takers
bid in the auction (unchanged engine) → accepted by Bravo → pickup; **if unsold near
expiry → donated to FOOD_BANK**. KPIs/impact already aggregate orders + donations.

## 7. Testing / Verification

- `offtaker.ts` is pure → straightforward unit checks of matrix + `bestSegment`.
- Build gate (run by maintainer, not trusted from subagents): `tsc --noEmit` rc=0 and
  `next build` rc=0.
- `prisma db push` additive succeeds; `prisma db seed` completes; verify via a Prisma
  count script: every BUYER has a `segment`; ACTIVE listings have `targetSegment`;
  pooled lots have `pooledBranches > 1`; ≥1 `donated` lot exists; AI queue still = 10,
  active = 6, 16 distinct products preserved.
- Manual demo path: AI Queue shows match + pooled badge; marketplace shows segmented
  off-takers + "pooled from N branches"; donation tier visible in impact/admin.

## 8. Risks & Mitigations

- **Risk:** runtime aggregation could destabilise the auction/bid path.
  **Mitigation:** aggregate at seed time only; runtime engine unchanged.
- **Risk:** destructive Prisma migrate is blocked for the AI agent.
  **Mitigation:** all schema changes additive/nullable via `prisma db push`.
- **Risk:** scope creep into eligibility/logistics.
  **Mitigation:** explicit Non-Goals; soft policy flag instead of hard gating.
- **Risk:** demo regression.
  **Mitigation:** maintainer independently runs build + reseed + count verification
  before declaring done (existing project norm).

## 9. Out of Scope

Hard eligibility gating, per-segment pricing, pickup logistics orchestration, new
dashboards, real Gemini connectivity (deterministic fallback remains the demo path).
