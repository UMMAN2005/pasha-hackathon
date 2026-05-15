# 07 — Testing, Acceptance & Demo Runbook

## Test plan (maps to PRD §20)

| PRD §20 test type | Where | Covered by |
|---|---|---|
| Unit — risk formula | `tests/unit/risk.test.ts` | Task 3 |
| Unit — discount calc | `tests/unit/decision.test.ts` | Task 4 |
| Unit — reservation qty validation | `tests/unit/order.integration.test.ts` | Task 15 |
| Unit — role permissions | `tests/unit/session.test.ts` + RBAC asserts in service tests | Task 9 |
| Integration — import→risk→rec→listing→order | recalc/listing/order/fulfillment integration tests | Tasks 8,13,15,17 |
| UI — dashboard filters, listing create, checkout, pickup | component tests + E2E | Tasks 11–17, 20 |
| Security — buyers can't see internal; unauthorized can't hit admin | `tests/unit/market-privacy.test.ts` + `requireRole` asserts | Tasks 9,14 |
| Data — no negative inventory, no expired-unsafe publish, no duplicate reservation | order/fulfillment integration tests | Tasks 15,17 |
| Demo — seed loads, full story works | `tests/e2e/storyboard.spec.ts` (offline) | Task 20 |

Gate before "demo ready": `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` all green with **`AI_ENABLED=false`** (proves offline safety).

## Acceptance criteria checklist (PRD §19 — must all pass)

- [ ] Admin sees all inventory batches with risk score, expiry, qty, branch, recommendation (`/admin/inventory` — Task 12)
- [ ] Admin approves a recommendation → batch becomes a marketplace listing (`/admin/recommendations` Approve — Task 13)
- [ ] Buyer browses listings, filters by category/branch, reserves qty, gets a pickup code (`/marketplace*` — Tasks 15,16)
- [ ] Inventory qty updates correctly after reservation (reserved) and pickup (on-hand decremented) (Tasks 15,17)
- [ ] Dashboard shows recovered revenue, estimated waste avoided, high-risk branches (`/admin` — Tasks 10,11)
- [ ] System prevents buyers from seeing cost, internal risk, non-approved stock (Task 14 privacy test)
- [ ] Every approval, listing, order, pickup creates an audit log entry (`/admin/audit` — Tasks 8,13,15,17)

This checklist is the **Definition of Done** from `00-overview.md`. Task 21 walks it manually; Task 20 automates the spine.

## Demo run script (the 60 seconds — rehearse to muscle memory)

Pre-flight (do this BEFORE walking on stage):
```bash
docker compose up -d
AI_ENABLED=false pnpm db:reset       # pristine, offline-safe (use real key only if Wi-Fi proven)
AI_ENABLED=false pnpm build && AI_ENABLED=false pnpm start   # or `pnpm dev`
# open http://localhost:3000/select-user , zoom browser to ~125%, Wi-Fi OFF
```

| Time | Do this | Say this (one line) |
|---|---|---|
| 0–12s | `/select-user` → **Kamran (Branch A)** → land on `/admin` | "Bravo loses millions to spoilage. HamıyaBravo predicts it — here's today, and 5 batches the AI already has a plan for." |
| 12–28s | Click **AI növbəsinə bax** → on Greek Yogurt card, click **Təsdiqlə** | "AI saw this yogurt will spoil — recommends 40% off to restaurants. ₼144 lost vs ₼X recovered. Manager approves in one tap." |
| 28–42s | `/select-user` → **Astoria Hotel** → open the yogurt listing → **Sifariş et** → show the big pickup code | "A hotel sees great value — no expiry, no decay, just the deal — and reserves it. Pickup code issued." |
| 42–52s | `/select-user` → **Kamran** → `/admin/listings` → paste code → **Təhvili təsdiqlə** → go to `/admin` | "Pickup confirmed. Stock leaves the books, every step audited, and the recovered number ticks up — zero waste." |
| 52–60s | Stay on `/admin` impact strip (or scroll to Impact) | "Money recovered, meals saved, CO₂ avoided. Bravo didn't just sell surplus — it prevented waste before it happened." |

Backup: if anything stalls, the E2E test path is the same clicks — you can narrate over a pre-recorded run. Keep a 20-second screen recording of `pnpm test:e2e --headed` as insurance.

## Offline / fallback rehearsal (do this at least once)

1. Turn Wi-Fi **off** physically.
2. `AI_ENABLED=false pnpm db:reset && pnpm dev`.
3. Run the full demo script. Everything must work; "Niyə? / Why?" shows the deterministic reason; chatbot shows the canned offline line; status line uses the template. Nothing throws.
4. (If venue Wi-Fi is confirmed solid) optionally run with the real `ANTHROPIC_API_KEY` so Why-text/chatbot are richer — but the pitch must not *depend* on it.

## Judge Q&A prep (anticipate, answer in one breath)

- **"Is the AI real?"** Yes — a transparent, explainable risk formula (days-to-expiry × sales velocity × urgency), deterministic and auditable; Claude adds plain-language explanations on top. Production swaps the formula for trained models (Prophet/XGBoost) without changing the product.
- **"Why is Croissants risk 100, not 95?"** It expires today — nothing can sell after the expiry day, so the model correctly saturates at maximum urgency. The §18 95 was an illustrative figure; our formula is honest.
- **"How do you prevent overselling?"** Every reservation and pickup is a database transaction with stock guards; concurrent double-reserve is covered by tests — no negative inventory possible.
- **"Data privacy?"** Buyers physically cannot receive cost, risk, or branch data — the buyer data layer has a field whitelist enforced by a test.
- **"Commercial model?"** Bravo recovers revenue on stock that was 100% loss; B2B buyers get verified safe stock cheap; the dashboard quantifies ₼ recovered and ESG impact for HQ reporting.
- **"What's not built yet?"** Computer-vision shelf audit, supplier-return/donation routing, trained ML, real payments — all designed (PRD), deliberately out of the 48h vertical slice. The loop you just saw is fully working.

## Reset between runs

`pnpm db:reset` restores byte-identical pristine state (deterministic seed, `02-data-model.md`). Always reset right before the real pitch so the hero number starts at `0 ₼` and climbs live.

## Vercel (optional, do not demo-depend)

If a live URL is wanted: set `DATABASE_URL` to a pooled Neon/Supabase URL, `vercel deploy`, then run `prisma migrate deploy` and `prisma db seed` once against it. Keep `AI_ENABLED` per Wi-Fi confidence. The laptop path remains primary.
