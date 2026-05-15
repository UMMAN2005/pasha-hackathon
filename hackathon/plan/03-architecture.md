# 03 — Architecture, Layers & Data Flow

## Layering (strict — keep domain pure)

```
app/ (RSC + pages)  ─calls→  server/actions + server/services  ─use→  domain/ (pure)
                                         │                                  │
                                         └─→ lib/db (Prisma) ─→ Postgres    └─ no IO, no db, no Date.now()
                                         └─→ server/ai (Claude, guarded)
```

Rules:
- `domain/*` (risk, decision, sustainability) are **pure functions**: inputs → outputs, no Prisma, no `fetch`, no `new Date()`. This is what unit tests hit hardest (PRD §20). 100% deterministic.
- `server/services/*` orchestrate: read via Prisma → call `domain/*` → write via Prisma (in a transaction where money/stock changes) → `writeAudit()`.
- `server/actions/*` are thin Next.js Server Actions: auth-check (session role) → Zod-validate input → call a service → `revalidatePath`. No business logic here.
- `app/*` Server Components read via services/Prisma for display; mutations only through Server Actions.
- AI (`server/ai/*`) is **never** in the critical path. Services complete fully without AI; AI enriches text for display only.

## Session & RBAC (mock auth — PRD §22)

- `iron-session` encrypted cookie holds `{ userId, role, companyId, branchId }`.
- A `/select-user` screen + a header role switcher lists the seeded demo users (`02-data-model.md`). Clicking one sets the session. No passwords (PRD §22: "Mock authentication with role-based demo users first"). This is the fastest believable RBAC for a 60s demo and satisfies PRD §19 ("system prevents buyers from seeing Bravo cost/risk/non-approved stock").
- `lib/session.ts` exports:
  - `getSession()` → current session or null
  - `requireRole(...roles)` → throws `ForbiddenError` if session role not allowed (used at the top of every admin Server Action and admin layout)
  - `isBravoRole(role)` / `isBuyer(role)`
- Enforcement points:
  - `app/(admin)/layout.tsx` → `requireRole(HQ_ADMIN, BRANCH_MANAGER, FINANCE_ANALYST, WAREHOUSE_MANAGER, LOGISTICS_OPERATOR)`
  - `app/(market)/layout.tsx` → `requireRole(BUSINESS_BUYER)` (Bravo staff can preview market in demo via HQ — allow HQ_ADMIN too, documented)
  - Every admin mutating action re-checks role server-side (defense in depth — never trust the client).
- **Data isolation (PRD §15 privacy, §19):** the marketplace data layer has a dedicated read function `getPublicListings()` that selects ONLY buyer-safe fields (publicTitle, price, discountPercent, qty available, pickup window). It must be structurally impossible for it to return `costPerUnit`, `riskScore`, `expectedLoss`, branch performance. Enforced by a Prisma `select` whitelist + a unit test asserting the returned shape has no internal keys.

## Data flow (implements PRD §12 end-to-end)

| PRD §12 step | Where it lives | Trigger |
|---|---|---|
| 1–2 Normalize/validate inventory | `prisma/seed.ts` | `db seed` (POS/ERP simulated by seed) |
| 3 Feature engineering (sales velocity, days-to-expiry) | `domain/risk.ts` `buildFeatures()` | called by recalc |
| 4 AI risk scoring | `domain/risk.ts` `scoreBatch()` → `RiskScore` | `recalcRiskService()` |
| 5 Decision engine | `domain/decision.ts` `recommend()` → `Recommendation` | `recalcRiskService()` |
| 6 Admin dashboard / action queue | `app/(admin)/*` | page load |
| 7 Marketplace publishing | `approveRecommendation` action → `createListingService()` | manager taps **Approve** |
| 8 Buyer order (reserve, lock stock) | `placeOrderService()` in a transaction | buyer taps **Reserve** |
| 9 Fulfillment (pickup, decrement, audit) | `confirmPickupService()` in a transaction | pickup code confirmed |
| 10 Learning loop | `AuditLog` + outcome rows | every mutation (stored; "model improves" is spoken roadmap) |

### Cold-start recalc

Risk/recommendations are system-produced, not seeded (`02-data-model.md`). To guarantee the Overview is never empty on a fresh `db:reset` before anyone clicks:
- End of `seed.ts` calls `recalcRiskService({ all: true })` once.
- Also expose `POST /api/risk/recalculate` (PRD §10) and a "Recalculate" button (HQ only) so it can be re-run live if needed. Idempotent: deletes prior `PENDING` recs + latest `RiskScore` for the batch set, regenerates. Never deletes `APPROVED`/`EXECUTED` recs.

## Critical transactions (PRD §15 reliability — no overselling)

`placeOrderService(listingId, qty, buyerCompanyId)` — single Prisma `$transaction`:
1. `SELECT ... FOR UPDATE` equivalent: read listing + batch inside txn.
2. Assert `listing.status === ACTIVE`, `qty` within `[minQty, maxQty]`, and `batch.quantityOnHand - batch.quantityReserved >= qty`. Else throw typed `InsufficientStockError` / `InvalidQuantityError`.
3. `batch.quantityReserved += qty`.
4. If remaining available hits 0 → `listing.status = RESERVED`.
5. Create `Order` (status `RESERVED`, `pickupCode` = deterministic 6-char in tests / random in prod via `lib/code.ts`).
6. `writeAudit('Order','<id>','RESERVE', {qty, listingId})`.

`confirmPickupService(pickupCode)` — single `$transaction`:
1. Find `Order` by code, assert `status === RESERVED`.
2. `batch.quantityOnHand -= qty`; `batch.quantityReserved -= qty`. Assert neither goes negative (typed error if it would).
3. `order.status = PICKED_UP`, `pickedUpAt = now`. If batch fully consumed → `listing.status = SOLD`.
4. `writeAudit('Order','<id>','PICKUP_CONFIRM', {qty})`.

Both services are covered by unit tests including the concurrent-double-reserve case (PRD §20 data tests: "duplicate reservations prevented", "no negative inventory").

## AI layer design (guarded, never load-bearing)

`server/ai/client.ts`:
- Reads `AI_ENABLED` and `ANTHROPIC_API_KEY`. If `AI_ENABLED !== 'true'` or key empty → `aiAvailable = false`.
- Exposes `getModel()` (Vercel AI SDK `anthropic(model)`).

Three consumers, each with a deterministic fallback so the demo is identical offline:
- `explain.ts` `explainRecommendation(rec, batch)`: if `aiAvailable`, one `generateText` call (short system prompt, see `05-ai-spec.md`) → 1–2 sentence plain-language "why". On any error/timeout (1.5s) or unavailable → return `rec.reason` (the deterministic reason already stored). UI shows it under a collapsed "Niyə? / Why?".
- `narrate.ts` `narrateEvent(event)`: turns a structured event (`{type:'pickup', product, qty, buyer, recovered}`) into one calm sentence. Fallback = a template string. Used for the live status line at loop-close.
- `chat/route.ts`: streaming Route Handler (`POST /api/chat`). System prompt grounds Claude in current KPIs (passed in, read server-side from services — never lets the model see raw cost to echo to a buyer; chatbot is admin-surface only). Fallback when unavailable: returns a canned "AI köməkçi hazırda oflayndır" message, stream of one chunk. Tools (optional, time-permitting): a single read-only `getKpis` tool.

Timeouts: all AI calls wrapped in `withTimeout(p, 1500ms)` → fallback. PRD §15 says dashboards < 2s; AI must not break that.

## Error handling (PRD §15, user coding rules)

- Typed domain errors: `ForbiddenError`, `InsufficientStockError`, `InvalidQuantityError`, `NotFoundError`, `RecalcError`.
- Server Actions catch typed errors → return `{ ok:false, error: <user-safe message AZ> }`; never leak stack/internal cost data (PRD §15 security: error messages don't leak sensitive data).
- Unexpected errors → log server-side with context, return generic AZ message.
- No silent catches. Every catch either handles meaningfully or rethrows.

## Audit (PRD §19: every approval/listing/order/pickup logged)

`writeAudit(entityType, entityId, action, metadata)` called inside the same transaction as the mutation (so audit and effect commit atomically). Covered actions: `RECALC`, `APPROVE_REC`, `REJECT_REC`, `CREATE_LISTING`, `RESERVE`, `PICKUP_CONFIRM`. A simple `/admin/audit` table renders it (PRD §10 `/api/audit`, §19).
