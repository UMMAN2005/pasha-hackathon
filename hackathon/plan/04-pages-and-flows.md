# 04 — Pages, Routes & Flows

Honors the PRD §22 route list exactly, plus the screens in PRD §7.1 / §7.2. Two route groups: `(admin)` = Bravo internal (PRD §7.1), `(market)` = B2B buyer (PRD §7.2). Buyer never sees cost/risk/internal-decay (PRD §15, §19).

Visual language is defined separately in `hackathon/design/` (editorial, calm, one hero number per screen). This file is **what each page is and does**, not how it's styled.

## Route map

| Route | Group | PRD screen (§7) | Purpose | Primary action |
|---|---|---|---|---|
| `/` | — | — | Redirect: buyer→`/marketplace`, Bravo→`/admin`, none→`/select-user` | — |
| `/select-user` | — | §22 mock auth | Pick a seeded demo user (role switcher) | Choose user |
| `/admin` | admin | Executive Overview | Daily command center, KPIs, the demo opener | Go to Action Queue |
| `/admin/inventory` | admin | Inventory Risk List | Prioritized risky batches | Open a batch |
| `/admin/inventory/[batchId]` | admin | Product Detail Page | Batch-level analysis | Approve recommendation |
| `/admin/recommendations` | admin | Action Queue | Approve/reject AI actions (the decision moment) | **Approve** |
| `/admin/listings` | admin | Marketplace Control | Listings Bravo published, reservations, remaining qty | Confirm pickup |
| `/admin/audit` | admin | (PRD §10/§19) | Audit trail | — |
| `/marketplace` | market | Marketplace Home | Buyer browses discounted stock | Open a listing |
| `/marketplace/[listingId]` | market | Product Listing Detail | Buyer evaluates a batch | **Reserve** |
| `/marketplace/orders` | market | Buyer Dashboard | Buyer's reservations + pickup codes | Show pickup code |
| `/api/chat` | — | AI assistant | Streaming Claude ops chatbot (admin) | — |
| `/api/risk/recalculate` | — | PRD §10 | Re-run risk scoring (HQ) | — |

`/admin/inventory` doubles as PRD's "Inventory Risk List" and Branch-risk view (a branch filter + a small leaderboard block instead of a separate Heatmap page — scope simplification, story unchanged).

## Page specs

### `/select-user`
Grid of seeded users (name, role badge, scope). Click → sets iron-session, redirects to the role's home. One "Astoria Hotel (Buyer)" card is the demo buyer; "Kamran — Branch A Manager" is the demo approver; "Aysel — HQ" sees everything. Used to switch surfaces live in the pitch without logging in/out.

### `/admin` — Executive Overview (PRD §7.1 Executive Overview)
- **Hero:** `Bu gün bərpa olundu` — ₼ recovered today (sum of `Order.totalAmount` for `PICKED_UP` today, via `getKpisService()`), one giant number, calm progress vs a target.
- Calm impact strip: meals saved · kg saved · CO₂e avoided · ₼0 lost (from `domain/sustainability.ts`).
- "5 məhsul tezliklə xarab ola bilər — AI hər biri üçün plan hazırladı": top-5 `PENDING` recommendations as plain rows (product, plain risk phrase, recommended action in words). Row → `/admin/recommendations`.
- Branch leaderboard: branches ranked by open expected-loss (PRD §7.1 branch leaderboard / branch heatmap intent).
- Primary button: **AI növbəsinə bax** → `/admin/recommendations`.
- AI chatbot launcher (corner) → `/api/chat` panel.
- Empty-state guard: if no recommendations (shouldn't happen post-seed), show "Recalculate" (HQ).

### `/admin/inventory` — Inventory Risk List (PRD §7.1)
Table sorted by risk desc: product, SKU, branch, qty, expiry (countdown days), risk badge (color by band — see `05-ai-spec.md`), expected loss ₼, recommended action, status. Filters: branch, category, risk band, status (PRD §10 `/api/inventory/batches` filters). Row → product detail.

### `/admin/inventory/[batchId]` — Product Detail (PRD §7.1 Product Detail Page)
- Header: product, branch, qty, expiry countdown, condition status.
- 14-day sales sparkline (Recharts) + avg daily sales (the formula inputs, made legible — PRD §7.1 "sales trend, demand forecast").
- Risk panel: risk score, expected unsold qty, expected loss, confidence (plain words). A collapsed **"Niyə? / Why?"** → calls `explainRecommendation` (Claude or fallback) on expand.
- Action history (audit rows for this batch).
- If a `PENDING` rec exists: the recommendation card + **Təsdiqlə (Approve)** + Reject. Approve here = same action as the queue.

### `/admin/recommendations` — Action Queue (PRD §7.1 Action Queue) — THE decision screen
- Queue of `PENDING` recommendations, priority sorted. Each card: product + branch + qty, plain risk sentence, **recommended action**, money side-by-side: `Bərpa olunur +₼X` (expectedRecovery) vs `Heç nə etməsək ₼Y itki` (expectedLoss), confidence in words, collapsed "Why?".
- Primary: **Təsdiqlə (Approve)** → `approveRecommendation` action → `createListingService` → toast "Bazara çıxarıldı", card moves to done, listing now live in `/marketplace`. Secondary: Reject (reason optional).
- This screen must satisfy PRD §15: a manager approves in ≤3 clicks (here: 1).

### `/admin/listings` — Marketplace Control (PRD §7.1)
Listings Bravo published: title, discount, price, qty remaining, status, buyer reservations. Each reserved order shows a **Confirm pickup** input (enter/scan pickup code) → `confirmPickupService` → inventory decrements, status → SOLD/updated, audit writes, Overview KPI rises. This is the loop-close screen for the demo (or do it from `/marketplace/orders` — pick one path in the storyboard; default: here, by the manager).

### `/admin/audit` — Audit (PRD §19)
Reverse-chron table: time, actor, entity, action, metadata. Proves "every approval/listing/order/pickup creates an audit log entry".

### `/marketplace` — Marketplace Home (PRD §7.2) — buyer surface
- Slim hero: `₼X dəyər bu gün rəfinizə hazır` (total value available).
- Grid of listing cards: pastel tile + product initial, discount badge (`−40%`), title, short origin line, **big new price, small struck old price**, **Reserve** button. Optional amber `TƏCİLİ` badge when discount high.
- Filters: category, branch, pickup window (PRD §7.2). **No expiry date, no cost, no risk, no branch performance** — enforced by `getPublicListings()` whitelist (`03-architecture.md`).

### `/marketplace/[listingId]` — Listing Detail (PRD §7.2)
Product, available qty, discount, storage note, pickup window/rules. Qty selector (min/max enforced). **Reserve** → `placeOrderService` (transaction) → success screen with **pickup code** (big, the thing the buyer screenshots). Cancellation note (cancel reduces reliability — PRD §13, shown as copy, not built).

### `/marketplace/orders` — Buyer Dashboard (PRD §7.2)
Buyer's orders: product, qty, total, status (Reserved/Picked up), **pickup code**, pickup window. Recommended categories block (content-based, simple: same categories the buyer ordered) — PRD §7.2 "recommended categories".

## Core user flows

### Flow 1 — Manager: predict → approve (PRD §12 steps 6–7)
`/admin` (sees risk) → **AI növbəsinə bax** → `/admin/recommendations` → reads money saved vs lost → **Approve** → listing created + audit. ≤3 clicks. (Variant: `/admin/inventory` → batch → Approve.)

### Flow 2 — Buyer: discover → reserve (PRD §12 step 8)
Switch user → `/marketplace` → card → `/marketplace/[id]` → set qty → **Reserve** → pickup code shown → appears in `/marketplace/orders`. Stock now `quantityReserved`, not yet decremented.

### Flow 3 — Loop close: pickup → impact (PRD §12 steps 9–10)
Switch to manager → `/admin/listings` → enter pickup code → **Confirm pickup** → `quantityOnHand` drops, audit writes, `Order.PICKED_UP` → `/admin` hero number is higher, status line narrates it (`narrateEvent`), `0 itki`.

### Flow 4 — Impact close
`/admin` impact strip / a focused Impact section: ₼ recovered · meals saved · kg saved · CO₂e avoided. The closing screenshot. (Can be a section on `/admin` or a dedicated `/admin#impact` anchor — keep it one calm view, no new nav burden.)

## Storyboard → exact clicks (must match `00-overview.md` timing)

| Beat | Route | Click |
|---|---|---|
| 0–12s | `/admin` | (just present the hero + the 5-at-risk line) |
| 12–28s | `/admin/recommendations` | tap **Təsdiqlə** on Greek Yogurt |
| 28–42s | `/marketplace` → `/marketplace/[yogurt]` | tap **Sifariş et (Reserve)**, show pickup code |
| 42–52s | `/admin/listings` | enter the code, **Confirm pickup**; cut to `/admin` showing higher hero number |
| 52–60s | `/admin` impact strip | hold on recovered ₼ · meals · kg · CO₂e |

E2E test (`tests/e2e/storyboard.spec.ts`) automates exactly this click path (`07-testing-and-demo.md`).
