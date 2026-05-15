# 01 — Tech Stack & Repo Layout

Maps PRD §16 (Recommended Technical Stack) onto the locked "single Next.js full-stack" decision. Where the PRD says "Python FastAPI or Node NestJS" we collapse the backend into Next.js server code — justified in `README.md` (the MVP AI is an arithmetic formula per §11.1, not trained ML, so a Python service buys nothing for 48h).

## Stack

| Layer | Choice | Version | Why (ties to PRD) |
|---|---|---|---|
| Runtime | Node.js | 20 LTS | Stable, Vercel default |
| Package manager | pnpm | 9.x | Fast, deterministic lockfile |
| Framework | Next.js (App Router) | 15.x | PRD §16 frontend; also hosts API via Route Handlers/Server Actions |
| UI lib | React | 19.x | Bundled with Next 15 |
| Language | TypeScript | 5.6+ | Type safety end-to-end |
| Styling | Tailwind CSS | v4 | PRD §16; fast premium UI |
| Components | shadcn/ui (Radix primitives) | latest | Accessible, unstyled-then-themed; fast polished UI |
| Icons | lucide-react | latest | Consistent line icons |
| Charts | Recharts | 2.x | Sparkline/trend on Overview & Product Detail |
| ORM | Prisma | 6.19 | Typed queries, transactions; provider-portable (sqlite ↔ postgresql) |
| Database | **SQLite** (demo, `file:./dev.db`); Postgres-portable | — | Zero infra / offline / any laptop. Interactive transactions still enforce no-overselling (§15). Prod swap → Postgres (see `02-data-model.md`). |
| Session/Auth | iron-session (encrypted cookie) | 8.x | PRD §22 "mock authentication with role-based demo users first" |
| Validation | Zod | 3.x | PRD §15 input validation at boundaries |
| AI SDK | `ai` (Vercel AI SDK) + `@ai-sdk/anthropic` | latest | Streaming Claude chatbot/narration |
| Anthropic | `@anthropic-ai/sdk` | latest | Server-side Claude calls (explanations) |
| Unit test | Vitest | 2.x | PRD §20 unit tests (formula, discount, reservation, RBAC) |
| Component test | @testing-library/react | latest | PRD §20 UI tests |
| E2E | Playwright | 1.x | PRD §20 demo-flow test |
| Lint/format | ESLint (next config) + Prettier | latest | Consistency |

**Claude model:** default `claude-sonnet-4-6` (fast, cheap, great for chat/explanations). Configurable via `ANTHROPIC_MODEL`. Narration/explanation prompts are short; latency budget < 2s (PRD §15 perf).

## Money & units (decision, applies everywhere)

- Store all money as **integer qəpik** (1 ₼ = 100 qəpik). No floats in the DB or domain logic. Column type `Int`.
- Single formatter `formatAzn(qapik: number): string` → `"12 840 ₼"` (space thousands separator, AZN symbol, no decimals in UI hero; detail views may show `,XX`).
- Quantities are integers. Risk score is integer 0–100. `waste_probability` is the only float, internal only.

## Environment variables (`.env`, `.env.example` committed)

```
DATABASE_URL="file:./dev.db"   # demo SQLite; prod: postgresql://… (see 02-data-model.md)
SESSION_PASSWORD="dev-only-change-me-32-chars-minimum-string"
ANTHROPIC_API_KEY=""                # optional; empty => AI falls back to deterministic text
ANTHROPIC_MODEL="claude-sonnet-4-6"
AI_ENABLED="true"                   # master switch; "false" forces fallback (rehearsal/offline)
DEMO_TODAY="2026-05-15"             # pins "today" so risk scores & countdowns are stable in demo
NEXT_PUBLIC_APP_NAME="HamıyaBravo"
```

`DEMO_TODAY` is critical: the risk formula uses "today"; pinning it makes the seeded §18 dataset produce stable scores every run regardless of the real date. All "today" reads go through `lib/clock.ts` (`getToday()`), never `new Date()` directly in domain code.

## Repo layout

```
/                      (Next.js app root = hackathon/app or repo root — see 06 Task 1)
  docker-compose.yml        Postgres 16 service (prod-swap only; demo uses SQLite)
  .env.example
  prisma/
    schema.prisma           full model (see 02-data-model.md)
    seed.ts                 deterministic seed (see 02-data-model.md)
  src/
    lib/
      clock.ts              getToday() — single source of "now"
      money.ts              qəpik helpers + formatAzn
      db.ts                 Prisma client singleton
      session.ts            iron-session config + role helpers (RBAC)
      env.ts                Zod-validated env loader
    domain/
      risk.ts               pure risk formula (PRD §11.1) — NO db, NO io
      decision.ts           pure decision engine (PRD §11.3) + discount ladder
      sustainability.ts     meals/kg/CO2e math
    server/
      actions/              Server Actions (approve, reserve, confirm-pickup, recalc)
      services/             orchestration: recalcRisk, createListing, placeOrder...
      audit.ts              writeAudit() helper
      ai/
        client.ts           Anthropic client + AI_ENABLED guard
        explain.ts          "why this action" (Claude + deterministic fallback)
        narrate.ts          demo narration line (Claude + fallback)
        chat/route.ts       streaming chatbot Route Handler
    app/
      (admin)/...           Bravo internal surface
      (market)/...          B2B buyer surface
      api/...               Route Handlers (chat stream, etc.)
      layout.tsx, globals.css
    components/             ui/ (shadcn) + feature components
  tests/
    unit/                   risk, decision, money, session
    e2e/                    storyboard.spec.ts
```

> The PRD §22 route list (`/admin`, `/admin/inventory`, `/admin/recommendations`, `/admin/listings`, `/marketplace`, `/marketplace/orders`) is honored exactly — see `04-pages-and-flows.md`.

## Commands (every command the engineer needs)

```bash
# one-time (npm — pnpm unavailable in build env; SQLite needs no Docker)
npm install
cp .env.example .env                 # then paste ANTHROPIC_API_KEY (optional)
npm run db:reset                     # prisma db push --force-reset + deterministic seed

# develop
npm run dev                          # http://localhost:3000

# quality gates
npm test                             # vitest unit
npm run test:e2e                     # playwright storyboard
npm run lint && npm run typecheck    # eslint + tsc --noEmit

# reset demo to pristine (run before the pitch — instant, no drift)
npm run db:reset                     # prisma db push --force-reset && prisma db seed

# offline rehearsal (prove AI fallback)
AI_ENABLED=false npm run dev
```

`package.json` scripts: `dev`, `build`, `start`, `test`, `test:e2e`, `lint`, `typecheck` (`tsc --noEmit`), `db:push` (`prisma db push --skip-generate`), `db:reset` (`prisma db push --force-reset && prisma db seed`), `prisma.seed` → `tsx prisma/seed.ts`.

## Vercel-ready (don't deploy by default; keep it possible)

- App is a standard Next.js app → deploys to Vercel as-is.
- For a live URL, swap `DATABASE_URL` to a Neon/Supabase pooled URL and run `prisma migrate deploy` + seed in a one-off. Document this in `07`, do **not** make the demo depend on it.
