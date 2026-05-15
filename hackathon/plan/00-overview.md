# 00 — Overview, Scope & Demo Story

## Goal

Ship a deployable web app that **predicts product expiry waste, recommends an action, lets a Bravo manager approve it in one tap, sells the surplus to B2B buyers, confirms pickup, and proves the money/food/CO₂ impact** — an end-to-end loop, demoable in 60 seconds to a non-technical jury. (PRD §1, §24.)

One-line pitch (PRD): *Bravo AI predicts waste before it happens, redirects inventory before expiry, and turns potential losses into profitable B2B sales.*

## The winning vertical slice

The PRD is large (P0/P1/P2 across 10 modules). We do **not** build all of it. We build one complete, beautiful vertical slice that satisfies every PRD acceptance criterion (§19) and tells the full story (§24):

```
Seed real data → Risk engine scores batches → Recommendations generated
   → Bravo Admin sees risk + KPIs → Manager APPROVES → Listing published
   → B2B buyer browses → RESERVES → pickup code → Pickup CONFIRMED
   → inventory decremented → audit logged → KPIs + impact tick up live
   → Claude explains "why" / narrates / answers jury questions
```

### In scope (P0 — must be flawless)

- Deterministic risk + expected-loss + recommendation engine (PRD §11.1, §11.3)
- Seeded Postgres with the PRD §18 demo dataset + engineered 14-day sales history
- **Bravo Admin**: Executive Overview (KPIs), Inventory Risk List, Product Detail, Action Queue (approve → creates listing)
- **B2B Marketplace**: listing grid, listing detail, reserve → order + pickup code (never shows cost/risk/expiry-as-decay)
- **Loop close**: confirm pickup → decrement `quantity_on_hand`/`quantity_reserved`, audit log, KPIs update
- **Impact / Sustainability** close screen (money recovered, meals saved, kg saved, CO₂e avoided)
- Mock RBAC: seeded demo users per role + a role switcher
- Audit log on every critical mutation
- **Claude AI assistant**: "Why this action?" explanation, live demo narration line, ops Q&A chatbot — all with deterministic fallback

### In scope (P1 — include, simple form)

- Dynamic discount ladder (rule-based, PRD §11.2 "Dynamic Pricing → Rule-based discount ladder")
- Notification feed (in-app list; the PRD §14 examples rendered, no real email/push)
- Branch leaderboard / risk ranking on the Overview

### Cut from the build (speak it, don't build it — PRD calls these P2 / production)

Computer-vision shelf audit, supplier-return & donation workflow, real email/push, inter-branch transfer execution UI (we generate the *recommendation* "transfer", but the demo path is marketplace), trained ML models (Prophet/XGBoost — PRD §11.2 production column), Metabase/Superset, real payment processing, multi-tenant buyer onboarding. These exist as *spoken* roadmap, not screens.

> Rationale: PRD §22 ("Build one complete vertical slice before adding advanced features") and §24 ("strongest story is predict → act → recover → prove"). A non-technical jury rewards a clear working loop over a feature list.

## Jury criteria → where we win

The 5 hackathon criteria are equally weighted. Map every build choice to one:

| Criterion | What in this build earns it |
|---|---|
| **Innovation** | Prediction-and-prevention layer (not just a surplus listing app — PRD §21 differentiation); explainable AI risk score + Claude reasoning/narration |
| **UX** | Editorial, calm, one-hero-number screens; manager approves in ≤3 clicks (PRD §15 usability); buyer never sees decay/cost |
| **Feasibility** | Real Postgres, real transactional reservation (no overselling — PRD §15 reliability), runs offline on a laptop, deterministic |
| **Commercialization** | Recovered-revenue KPI front and center; B2B buyer reliability framing; clear "Bravo loses ₼X, recovers ₼Y" money story |
| **Presentation** | The 60s storyboard below is designed so the screens tell the story themselves; Impact close is the board-deck screenshot |

## The 60-second demo storyboard (design the build around this)

Each beat = one screen, one idea, one action, legible from the back of the room. The build must make this run without explanation.

| Time | Screen | What happens | Backing acceptance criterion (§19) |
|---|---|---|---|
| 0–12s | **Executive Overview** | "Bravo loses millions to spoilage. HamıyaBravo predicts it. Here is today." Hero: ₼ recovered today. A calm line: 5 batches will spoil soon, AI has a plan for each. | Dashboard shows recovered revenue, waste avoided, high-risk branches |
| 12–28s | **Action Queue / The Decision** | Greek Yogurt 500g — will likely spoil. AI recommends 40% off to restaurants. Money saved vs money lost. Manager taps **Approve**. (Optional: tap "Why?" → Claude one-liner.) | Admin approves a recommendation → converts batch to listing |
| 28–42s | **B2B Marketplace** | A hotel buyer sees the offer (value + saving loud, **no expiry/decay/cost shown**). Taps **Reserve**. Gets a pickup code. | Buyer browses, filters, reserves, gets pickup code; cannot see internal data |
| 42–52s | **Loop closes** | Pickup confirmed (pickup code). `quantity_on_hand` drops, audit log writes, the Overview hero number ticks up. "Greek Yogurt — 120 units → Astoria Hotel. 0 wasted." | Inventory updates after reservation+pickup; audit entry created |
| 52–60s | **Impact / Sustainability** | Three big proud numbers: ₼ recovered · meals saved · kg saved · CO₂e avoided. Hold. Done. | Dashboard shows estimated waste avoided & sustainability metrics |

If a beat needs explaining out loud beyond one sentence, the screen failed — fix the screen, not the script.

## Definition of done

The build is done when **all PRD §19 acceptance criteria pass** (tracked as a checklist in `07-testing-and-demo.md`) AND the storyboard above runs start-to-finish on a laptop with **Wi-Fi physically off** (Claude features degrade to deterministic fallback, everything else works), AND the E2E test for the storyboard is green.
