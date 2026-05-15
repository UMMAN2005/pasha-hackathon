# HamıyaBravo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single Next.js app that predicts expiry waste, recommends an action, lets a Bravo manager approve it in one tap, sells the surplus to a B2B buyer, confirms pickup, and proves money/food/CO₂ impact — end-to-end, demoable in 60 seconds offline.

**Architecture:** One Next.js 15 App Router codebase. Pure `domain/` functions (risk/decision/sustainability) ← `server/services` (Prisma, transactions, audit) ← Server Actions ← RSC pages. Local Dockerized Postgres. Claude layer is display-only with deterministic fallback. Full design in `00`–`05` of this folder.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind v4 + shadcn/ui, Prisma 6 + PostgreSQL 16, iron-session, Zod, Vercel AI SDK + Anthropic, Vitest, Playwright. Exact versions/commands in `01-tech-stack.md`.

---

## Conventions for every task

- TDD: write the failing test, run it (see it fail), implement minimally, run it (see it pass), commit.
- Money is integer **qəpik** everywhere. "Today" comes only from `getToday()`.
- Commit messages: conventional (`feat:`, `test:`, `chore:`). One commit per task end.
- Run `pnpm typecheck` before each commit; it must pass.
- Paths are relative to the app root chosen in Task 1.

---

## Phase 0 — Scaffold & infrastructure

### Task 1: Next.js app + tooling skeleton

**Files:**
- Create: app root via scaffold (run inside `/home/umammadov/Demo/pasha-hackathon` — create the app in `./app-hamiyabravo`, the new repo root for all paths below)
- Create: `docker-compose.yml`, `.env.example`, `.env`
- Modify: `package.json` (scripts), `tsconfig.json` (path alias `@/*`)

- [ ] **Step 1: Scaffold**

```bash
cd /home/umammadov/Demo/pasha-hackathon
pnpm create next-app@latest app-hamiyabravo --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack
cd app-hamiyabravo
pnpm add @prisma/client zod iron-session @anthropic-ai/sdk ai @ai-sdk/anthropic recharts lucide-react
pnpm add -D prisma tsx vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @playwright/test
pnpm dlx shadcn@latest init -d
```

- [ ] **Step 2: Postgres compose**

`docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: bravo
      POSTGRES_PASSWORD: bravo
      POSTGRES_DB: bravo
    ports: ["5432:5432"]
    volumes: ["bravo_pg:/var/lib/postgresql/data"]
volumes: { bravo_pg: {} }
```

- [ ] **Step 3: Env files**

Create `.env.example` and `.env` with the exact keys listed in `01-tech-stack.md` "Environment variables". Leave `ANTHROPIC_API_KEY` empty in `.env.example`; paste the real key into `.env` only.

- [ ] **Step 4: package.json scripts**

Add: `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:e2e": "playwright test"`, `"db:reset": "prisma migrate reset --force && prisma db seed"`, and `"prisma": { "seed": "tsx prisma/seed.ts" }`.

- [ ] **Step 5: Vitest config**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: ["./tests/setup.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```
`tests/setup.ts`: `import "@testing-library/jest-dom/vitest";`

- [ ] **Step 6: Verify scaffold runs**

Run: `docker compose up -d && pnpm dev`
Expected: `http://localhost:3000` serves the Next.js starter; `pnpm typecheck` passes.

- [ ] **Step 7: Commit**

```bash
git init && git add -A && git commit -m "chore: scaffold Next.js app, Postgres, tooling"
```

### Task 2: Core libs — clock, money, env, db

**Files:**
- Create: `src/lib/clock.ts`, `src/lib/money.ts`, `src/lib/env.ts`, `src/lib/db.ts`
- Test: `tests/unit/money.test.ts`, `tests/unit/clock.test.ts`

- [ ] **Step 1: Failing tests**

`tests/unit/money.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatAzn, azn } from "@/lib/money";
describe("money", () => {
  it("formats qəpik as AZN with space thousands", () => {
    expect(formatAzn(1284000)).toBe("12 840 ₼");
    expect(formatAzn(0)).toBe("0 ₼");
    expect(formatAzn(50)).toBe("0,50 ₼");
  });
  it("azn() converts manat to qəpik", () => {
    expect(azn(12.5)).toBe(1250);
  });
});
```
`tests/unit/clock.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { getToday } from "@/lib/clock";
describe("clock", () => {
  it("returns DEMO_TODAY pinned date at UTC midnight", () => {
    process.env.DEMO_TODAY = "2026-05-15";
    const d = getToday();
    expect(d.toISOString()).toBe("2026-05-15T00:00:00.000Z");
  });
});
```

- [ ] **Step 2: Run, see fail**

Run: `pnpm test` → FAIL (modules not found).

- [ ] **Step 3: Implement**

`src/lib/clock.ts`:
```ts
export function getToday(): Date {
  const v = process.env.DEMO_TODAY;
  if (!v) throw new Error("DEMO_TODAY not set");
  return new Date(`${v}T00:00:00.000Z`);
}
export function daysBetween(target: Date, from: Date): number {
  return Math.floor((target.getTime() - from.getTime()) / 86_400_000);
}
```
`src/lib/money.ts`:
```ts
export const azn = (manat: number): number => Math.round(manat * 100);
export function formatAzn(qapik: number): string {
  const sign = qapik < 0 ? "-" : "";
  const abs = Math.abs(qapik);
  const whole = Math.floor(abs / 100);
  const cents = abs % 100;
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return cents === 0 ? `${sign}${grouped} ₼` : `${sign}${grouped},${cents.toString().padStart(2, "0")} ₼`;
}
```
`src/lib/env.ts`: Zod schema validating `DATABASE_URL`, `SESSION_PASSWORD` (min 32), `ANTHROPIC_API_KEY` (optional), `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`), `AI_ENABLED`, `DEMO_TODAY`. Export typed `env`.
`src/lib/db.ts`: Prisma client singleton (`globalThis` guard for dev HMR).

- [ ] **Step 4: Run, see pass**

Run: `pnpm test` → money + clock PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: core libs (clock, money, env, db)"
```

---

## Phase 1 — Deterministic domain core (pure, TDD)

> This is the engine that wins Feasibility/Innovation. Pure functions, zero IO. Specs: `05-ai-spec.md`.

### Task 3: Risk formula (`domain/risk.ts`)

**Files:**
- Create: `src/domain/risk.ts`
- Test: `tests/unit/risk.test.ts`

- [ ] **Step 1: Failing test (pins formula on fixed synthetic inputs — `05-ai-spec.md §1`)**

```ts
import { describe, it, expect } from "vitest";
import { scoreBatch } from "@/domain/risk";

const base = {
  quantityOnHand: 120,
  costPerUnit: 180,
  expiryDate: new Date("2026-05-18T00:00:00.000Z"),
  today: new Date("2026-05-15T00:00:00.000Z"),
  sales14: Array(14).fill(185 / 14), // flat-ish, sum 185
};

describe("scoreBatch", () => {
  it("Greek Yogurt vector → risk 86 (PRD §18)", () => {
    const r = scoreBatch(base);
    expect(r.riskScore).toBe(86);
    expect(r.expectedLoss).toBe(80 * 180); // 14400 qəpik
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });
  it("day-0 batch saturates at 100", () => {
    const r = scoreBatch({ ...base, expiryDate: base.today, sales14: Array(14).fill(7) });
    expect(r.riskScore).toBe(100);
  });
  it("far expiry, strong sales → low risk (<50)", () => {
    const r = scoreBatch({ ...base, quantityOnHand: 300, costPerUnit: 150,
      expiryDate: new Date("2026-06-10T00:00:00.000Z"), sales14: Array(14).fill(95 / 14) });
    expect(r.riskScore).toBeLessThan(50);
  });
  it("clamps probability to [0,1]", () => {
    const r = scoreBatch({ ...base, sales14: Array(14).fill(0) });
    expect(r.riskScore).toBeLessThanOrEqual(100);
    expect(r.riskScore).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run, see fail**

Run: `pnpm test risk` → FAIL.

- [ ] **Step 3: Implement exactly per `05-ai-spec.md §1`**

```ts
import { daysBetween } from "@/lib/clock";

export const U_WINDOW = 7;
export const URGENCY_BOOST = 0.5;
export const SLOWDOWN_MIN = 1;
export const SLOWDOWN_MAX = 1.5;

export type ScoreInput = {
  quantityOnHand: number;
  costPerUnit: number;
  expiryDate: Date;
  today: Date;
  sales14: number[]; // length 14, oldest→newest
};
export type ScoreResult = {
  riskScore: number;
  expectedUnsoldQty: number;
  expectedLoss: number;
  confidence: number;
  wasteProbability: number;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function scoreBatch(i: ScoreInput): ScoreResult {
  const daysToExpiry = Math.max(daysBetween(i.expiryDate, i.today), 0);
  const sales14 = i.sales14.reduce((a, b) => a + b, 0);
  const avgDaily = sales14 / 14;
  const projected = avgDaily * daysToExpiry;
  const expectedUnsold = Math.max(i.quantityOnHand - projected, 0);
  const baseProb = i.quantityOnHand > 0 ? expectedUnsold / i.quantityOnHand : 0;
  const urgency = 1 + URGENCY_BOOST * (Math.max(0, U_WINDOW - daysToExpiry) / U_WINDOW);
  const first7 = i.sales14.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
  const last7 = i.sales14.slice(7).reduce((a, b) => a + b, 0) / 7;
  const slowdown = clamp(first7 / Math.max(last7, 0.0001), SLOWDOWN_MIN, SLOWDOWN_MAX);
  const wasteProbability = clamp(baseProb * urgency * slowdown, 0, 1);
  const expectedUnsoldQty = Math.round(expectedUnsold);
  const confidence = Math.round(clamp(0.5 + 0.5 * (Math.min(i.sales14.length, 14) / 14), 0, 0.99) * 100) / 100;
  return {
    riskScore: Math.round(wasteProbability * 100),
    expectedUnsoldQty,
    expectedLoss: expectedUnsoldQty * i.costPerUnit,
    confidence,
    wasteProbability,
  };
}
```

- [ ] **Step 4: Run, see pass**

Run: `pnpm test risk` → PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: deterministic risk formula (PRD §11.1)"
```

### Task 4: Decision engine + discount ladder (`domain/decision.ts`)

**Files:**
- Create: `src/domain/decision.ts`
- Test: `tests/unit/decision.test.ts`

- [ ] **Step 1: Failing test (covers every §18 row + each rule — `05-ai-spec.md §2,§3`)**

```ts
import { describe, it, expect } from "vitest";
import { recommend, discountPercent, listingUnitPrice } from "@/domain/decision";

describe("discount ladder", () => {
  it("bands per 05-ai-spec §3", () => {
    expect(discountPercent(95)).toBe(45);
    expect(discountPercent(86)).toBe(40);
    expect(discountPercent(72)).toBe(30);
    expect(discountPercent(55)).toBe(20);
    expect(discountPercent(41)).toBe(0);
  });
  it("never prices below cost", () => {
    expect(listingUnitPrice(320, 180, 45)).toBe(180); // floor at cost
    expect(listingUnitPrice(320, 180, 40)).toBe(192);
  });
});

describe("decision engine (PRD §11.3 / §18)", () => {
  const b = (o: Partial<Parameters<typeof recommend>[0]> = {}) =>
    recommend({ riskScore: 86, quantityOnHand: 120, category: "Dairy", condition: "GOOD", ...o });

  it("Yogurt 86/120/Dairy → LIST_B2B", () => expect(b().actionType).toBe("LIST_B2B"));
  it("Chicken 92 CHECK_REQUIRED → LIST_B2B + complianceGate", () => {
    const r = b({ riskScore: 92, quantityOnHand: 45, category: "Meat", condition: "CHECK_REQUIRED" });
    expect(r.actionType).toBe("LIST_B2B");
    expect(r.complianceGate).toBe(true);
    expect(r.priority).toBe(1);
  });
  it("Bananas 88/230/Produce → BUNDLE", () =>
    expect(b({ riskScore: 88, quantityOnHand: 230, category: "Produce" }).actionType).toBe("BUNDLE"));
  it("Croissants 100/80/Bakery (qty<100) → LIST_B2B", () =>
    expect(b({ riskScore: 100, quantityOnHand: 80, category: "Bakery" }).actionType).toBe("LIST_B2B"));
  it("Pasta 41 → KEEP", () => expect(b({ riskScore: 41 }).actionType).toBe("KEEP"));
  it("UNSAFE → DISPOSE blocked", () =>
    expect(b({ condition: "UNSAFE" }).actionType).toBe("DISPOSE"));
  it("mid risk → IN_STORE_DISCOUNT", () =>
    expect(b({ riskScore: 60 }).actionType).toBe("IN_STORE_DISCOUNT"));
});
```

- [ ] **Step 2: Run, see fail** — `pnpm test decision` → FAIL.

- [ ] **Step 3: Implement exactly per `05-ai-spec.md §2 & §3`**

```ts
export const QTY_HIGH = 100;
export type Condition = "GOOD" | "CHECK_REQUIRED" | "UNSAFE";
export type ActionType =
  | "KEEP" | "IN_STORE_DISCOUNT" | "TRANSFER" | "LIST_B2B"
  | "BUNDLE" | "DONATE" | "SUPPLIER_RETURN" | "DISPOSE";

export function discountPercent(risk: number): number {
  if (risk >= 90) return 45;
  if (risk >= 80) return 40;
  if (risk >= 70) return 30;
  if (risk >= 50) return 20;
  return 0;
}
export function listingUnitPrice(retail: number, cost: number, disc: number): number {
  return Math.max(Math.round((retail * (100 - disc)) / 100), cost);
}

export type DecisionInput = {
  riskScore: number;
  quantityOnHand: number;
  category: string;
  condition: Condition;
};
export type Decision = {
  actionType: ActionType;
  priority: number;
  reason: string;
  complianceGate: boolean;
};

export function recommend(i: DecisionInput): Decision {
  const { riskScore: r, quantityOnHand: q, category: c, condition } = i;
  if (condition === "UNSAFE")
    return { actionType: "DISPOSE", priority: 1, complianceGate: false,
      reason: "Təhlükəsizlik riski — satış bloklandı, utilizasiya/yoxlama" };
  if (condition === "CHECK_REQUIRED" && r >= 80)
    return { actionType: "LIST_B2B", priority: 1, complianceGate: true,
      reason: "Kritik — əvvəlcə uyğunluq yoxlaması, sonra təcili B2B" };
  if (r >= 80 && q >= QTY_HIGH && (c === "Produce" || c === "Bakery"))
    return { actionType: "BUNDLE", priority: 2, complianceGate: false,
      reason: "Yüksək risk — kafelər/çörəkxanalar üçün dəstə təklifi" };
  if (r >= 80 && q >= QTY_HIGH)
    return { actionType: "LIST_B2B", priority: 2, complianceGate: false,
      reason: "Bu gün hərəkət lazımdır — restoranlara endirimlə B2B" };
  if (r >= 80)
    return { actionType: "LIST_B2B", priority: 2, complianceGate: false,
      reason: "Yüksək risk — B2B siyahıya əlavə et" };
  if (r >= 50)
    return { actionType: "IN_STORE_DISCOUNT", priority: 3, complianceGate: false,
      reason: "Orta risk — mağazada endirim, 24 saat izlə" };
  return { actionType: "KEEP", priority: 5, complianceGate: false,
    reason: "Sabit — adi satış planı, izləməyə davam" };
}
```

- [ ] **Step 4: Run, see pass** — `pnpm test decision` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: decision engine + discount ladder (PRD §11.3)"`

### Task 5: Sustainability math (`domain/sustainability.ts`)

**Files:** Create `src/domain/sustainability.ts`; Test `tests/unit/sustainability.test.ts`

- [ ] **Step 1: Failing test (per `05-ai-spec.md §4`)**

```ts
import { describe, it, expect } from "vitest";
import { impact, UNIT_WEIGHT_KG } from "@/domain/sustainability";
describe("sustainability", () => {
  it("120 yogurt units → kg/meals/CO2e", () => {
    const r = impact([{ sku: "DARY-YOG-500", quantity: 120, totalAmount: 1284000 }]);
    expect(r.kgSaved).toBeCloseTo(60, 5);          // 120 * 0.5
    expect(r.mealsSaved).toBe(142);                // floor(60/0.42)
    expect(r.co2eAvoided).toBeCloseTo(150, 1);     // 60 * 2.5
    expect(r.moneyRecovered).toBe(1284000);
    expect(UNIT_WEIGHT_KG["DARY-YOG-500"]).toBe(0.5);
  });
});
```

- [ ] **Step 2: Run, see fail** — `pnpm test sustainability` → FAIL.

- [ ] **Step 3: Implement per `05-ai-spec.md §4`**

```ts
export const KG_PER_MEAL = 0.42;
export const CO2E_PER_KG = 2.5;
export const UNIT_WEIGHT_KG: Record<string, number> = {
  "DARY-YOG-500": 0.5, "MEAT-CHK-1000": 1.0, "PROD-BAN-1000": 1.0,
  "BAKE-CRS-6": 0.4, "PACK-PST-500": 0.5,
};
export type OrderLine = { sku: string; quantity: number; totalAmount: number };
export function impact(lines: OrderLine[]) {
  const kgSaved = lines.reduce((a, l) => a + l.quantity * (UNIT_WEIGHT_KG[l.sku] ?? 0.5), 0);
  return {
    kgSaved,
    mealsSaved: Math.floor(kgSaved / KG_PER_MEAL),
    co2eAvoided: Math.round(kgSaved * CO2E_PER_KG * 10) / 10,
    moneyRecovered: lines.reduce((a, l) => a + l.totalAmount, 0),
    wasteLost: 0,
  };
}
```

- [ ] **Step 4: Run, see pass** — PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: sustainability impact math (PRD §2)"`

---

## Phase 2 — Schema, seed, recalc service

### Task 6: Prisma schema + migration

**Files:** Create `prisma/schema.prisma` (exact content = `02-data-model.md` "Prisma schema" block, verbatim).

- [ ] **Step 1:** Copy the full schema from `02-data-model.md` into `prisma/schema.prisma`.
- [ ] **Step 2:** Run `pnpm prisma migrate dev --name init` → Expected: migration applied, `@prisma/client` generated.
- [ ] **Step 3:** Run `pnpm typecheck` → PASS.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: Prisma schema + initial migration (PRD §8/§9)"`

### Task 7: Deterministic seed

**Files:** Create `prisma/seed.ts`; Test `tests/unit/seed-determinism.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildSeedData } from "@/../prisma/seed";
describe("seed", () => {
  it("is deterministic and reproduces PRD §18 dataset", () => {
    const a = buildSeedData(); const b = buildSeedData();
    expect(a).toEqual(b);
    expect(a.products).toHaveLength(5);
    const yog = a.batches.find(x => x.sku === "DARY-YOG-500")!;
    expect(yog.sales14.reduce((s, n) => s + n, 0)).toBe(185);
    expect(a.companies.some(c => c.legalName === "Astoria Hotel")).toBe(true);
  });
});
```

- [ ] **Step 2: Run, see fail** — FAIL.

- [ ] **Step 3: Implement** `prisma/seed.ts` per `02-data-model.md` "Seed dataset": export pure `buildSeedData()` returning `{ branches, categories, companies, users, products, batches }` with stable `uuidv5` ids (namespace const), the 5 products/batches with the **14-day sales SUM** column distributed `floor(SUM/14)`+remainder, branches A–D, categories, Bravo + 3 buyer companies, 5 demo users. Then a `main()` that wipes tables in FK-safe order and inserts via Prisma, and finally calls `recalcRiskService({ all: true })` (Task 8) for cold-start. Guard `main()` behind `if (require.main === module)` so the test can import `buildSeedData` without DB.

- [ ] **Step 4: Run, see pass** — `pnpm test seed` → PASS.
- [ ] **Step 5: Seed the DB** — `pnpm prisma db seed` → Expected: rows inserted, no error. Verify: `pnpm prisma studio` shows 5 batches, 0 RiskScore yet (recalc wired in Task 8).
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: deterministic seed (PRD §18)"`

### Task 8: Recalc service (risk + recommendations → DB)

**Files:** Create `src/server/services/recalc.ts`, `src/server/audit.ts`; Test `tests/unit/recalc.integration.test.ts` (uses the running Docker DB)

- [ ] **Step 1: Failing integration test (bands + ordering, per `05-ai-spec.md §1` test strategy)**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { recalcRiskService } from "@/server/services/recalc";
import { prisma } from "@/lib/db";
describe("recalc (integration, needs seeded DB)", () => {
  beforeAll(async () => { await recalcRiskService({ all: true }); });
  it("reproduces PRD §18 scores within ±2 and correct ordering", async () => {
    const rows = await prisma.riskScore.findMany({ include: { batch: { include: { product: true } } } });
    const by = (sku: string) => rows.find(r => r.batch.product.sku === sku)!.riskScore;
    expect(by("DARY-YOG-500")).toBeGreaterThanOrEqual(84);
    expect(by("DARY-YOG-500")).toBeLessThanOrEqual(88);
    expect(by("PACK-PST-500")).toBeLessThan(50);
    expect(by("BAKE-CRS-6")).toBeGreaterThanOrEqual(by("MEAT-CHK-1000"));
    expect(by("MEAT-CHK-1000")).toBeGreaterThanOrEqual(by("DARY-YOG-500"));
  });
  it("creates a recommendation + audit per batch", async () => {
    expect(await prisma.recommendation.count()).toBeGreaterThanOrEqual(5);
    expect(await prisma.auditLog.count({ where: { action: "RECALC" } })).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run, see fail** — FAIL.

- [ ] **Step 3: Implement** `src/server/audit.ts`:
```ts
import { prisma } from "@/lib/db";
import type { Prisma, PrismaClient } from "@prisma/client";
export async function writeAudit(
  tx: Prisma.TransactionClient | PrismaClient,
  a: { actorId?: string; actorName: string; entityType: string; entityId: string; action: string; metadata?: any }
) { await tx.auditLog.create({ data: a }); }
```
`src/server/services/recalc.ts`: for each active batch — load product+category+branch, fetch the 14-day `SalesTransaction` quantities (oldest→newest, zero-filled to length 14) ending the day before `getToday()`, call `scoreBatch()`, upsert `RiskScore`; call `recommend()`, `discountPercent()`, `listingUnitPrice()`; compute `expectedRecovery = expectedUnsoldQty * listingUnitPrice` and `expectedLoss` from the score; delete prior `PENDING` recs for the batch (keep APPROVED/EXECUTED), create the new `Recommendation`; `writeAudit(prisma,{actorName:'system',entityType:'Batch',entityId,action:'RECALC',...})`. Idempotent. Wrap each batch in a `prisma.$transaction`.

- [ ] **Step 4: Run, see pass** — `pnpm test recalc` → PASS.
- [ ] **Step 5:** Re-seed (`pnpm db:reset`) → Studio now shows 5 RiskScore + 5 Recommendation rows.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: recalc service — risk+recommendations to DB (PRD §12 steps 3-5)"`

---

## Phase 3 — Bravo Admin surface

### Task 9: Session / mock RBAC + role switcher

**Files:** Create `src/lib/session.ts`, `src/app/select-user/page.tsx`, `src/app/select-user/actions.ts`, `src/app/page.tsx` (root redirect); Test `tests/unit/session.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { isBravoRole, isBuyer, roleHome } from "@/lib/session";
describe("rbac", () => {
  it("classifies roles", () => {
    expect(isBravoRole("HQ_ADMIN")).toBe(true);
    expect(isBuyer("BUSINESS_BUYER")).toBe(true);
    expect(isBravoRole("BUSINESS_BUYER")).toBe(false);
  });
  it("routes role to home", () => {
    expect(roleHome("BUSINESS_BUYER")).toBe("/marketplace");
    expect(roleHome("HQ_ADMIN")).toBe("/admin");
  });
});
```

- [ ] **Step 2: Run, see fail** — FAIL.
- [ ] **Step 3: Implement** `src/lib/session.ts`: iron-session config (`SESSION_PASSWORD`, cookie `hb_session`), `getSession()`, `setSession(user)`, `clearSession()`, `requireRole(...roles)` (throws `ForbiddenError`), `isBravoRole`, `isBuyer`, `roleHome(role)`. `select-user/page.tsx`: server component listing seeded users (query `prisma.user.findMany` with branch/company), each a form posting to a `selectUserAction(userId)` Server Action that sets the session and `redirect(roleHome(role))`. `app/page.tsx`: read session → redirect to `roleHome` or `/select-user`.
- [ ] **Step 4: Run, see pass** — PASS.
- [ ] **Step 5: Manual check** — `/select-user` lists 5 users; picking "Astoria Hotel" → `/marketplace` (404 until Task 14, fine); picking "Aysel HQ" → `/admin` (404 until Task 11).
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: mock RBAC + role switcher (PRD §22)"`

### Task 10: Admin layout + KPI service

**Files:** Create `src/app/(admin)/layout.tsx`, `src/server/services/kpis.ts`, `src/components/app-shell.tsx`; Test `tests/unit/kpis.integration.test.ts`

- [ ] **Step 1: Failing test**
```ts
import { describe, it, expect } from "vitest";
import { getKpisService } from "@/server/services/kpis";
describe("kpis", () => {
  it("returns zeroed impact on a fresh seed (no pickups yet)", async () => {
    const k = await getKpisService();
    expect(k.moneyRecoveredToday).toBe(0);
    expect(k.openRecommendations).toBeGreaterThanOrEqual(5);
    expect(k.atRisk.length).toBeGreaterThanOrEqual(5);
  });
});
```
- [ ] **Step 2: Run, see fail** — FAIL.
- [ ] **Step 3: Implement** `kpis.ts` `getKpisService()`: money recovered today (`Order` PICKED_UP with `pickedUpAt` on `getToday()`), total recovered, `domain/sustainability.impact()` over picked-up orders, open recommendations count, top-5 `PENDING` recs (with product/branch/reason/expectedLoss/expectedRecovery), branch leaderboard (sum open `expectedLoss` per branch). `(admin)/layout.tsx`: `requireRole(...bravo roles)` (catch `ForbiddenError`→redirect `/select-user`), render `<AppShell surface="admin">` with nav (Baxış/Risk/Bazar nəzarəti/Audit) + role switcher + AI chat launcher.
- [ ] **Step 4: Run, see pass** — PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: admin shell + KPI service (PRD §7.1)"`

### Task 11: Executive Overview page

**Files:** Create `src/app/(admin)/admin/page.tsx`, `src/components/hero-number.tsx`, `src/components/impact-strip.tsx`, `src/components/risk-list-mini.tsx`

- [ ] **Step 1: Component test**
```ts
import { render, screen } from "@testing-library/react";
import { HeroNumber } from "@/components/hero-number";
it("renders formatted hero", () => {
  render(<HeroNumber qapik={1284000} label="Bu gün bərpa olundu" />);
  expect(screen.getByText("12 840 ₼")).toBeInTheDocument();
});
```
- [ ] **Step 2: Run, see fail** — FAIL.
- [ ] **Step 3: Implement** `HeroNumber` (giant `formatAzn`, label, optional progress), `ImpactStrip` (meals/kg/CO₂e/₼0 lost from KPIs), `RiskListMini` (top-5 recs: product, plain risk phrase, action words; row links `/admin/recommendations`). `admin/page.tsx` (RSC): `getKpisService()` → hero (`moneyRecoveredToday`), impact strip, "5 məhsul tezliklə xarab ola bilər — AI hər biri üçün plan hazırladı" + `RiskListMini`, branch leaderboard, primary button **AI növbəsinə bax** → `/admin/recommendations`. Calm empty-state with "Recalculate" (HQ) if no recs.
- [ ] **Step 4: Run, see pass** — PASS. Manual: `/admin` shows hero 0 ₼ + 5 at-risk rows.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: Executive Overview (storyboard 0-12s)"`

### Task 12: Inventory Risk List + Product Detail

**Files:** Create `src/app/(admin)/admin/inventory/page.tsx`, `src/app/(admin)/admin/inventory/[batchId]/page.tsx`, `src/components/risk-badge.tsx`, `src/server/services/inventory.ts`

- [ ] **Step 1: Component test** for `RiskBadge` (band→label/color per `05-ai-spec.md §3`): risk 86→"Kritik", 65→"Yüksək", 45→"İzlə", 30→"Sabit". Run, see fail.
- [ ] **Step 2: Implement** `inventory.ts`: `listBatches(filters)` (branch/category/riskBand/status, sorted risk desc, joins latest RiskScore + PENDING rec) and `getBatchDetail(id)` (sales 14-day array, risk, rec, audit rows for batch). Pages: list table (PRD §7.1 columns + filters); detail = header, Recharts sales sparkline, risk panel, collapsed "Niyə? / Why?" (server action calls `explainRecommendation` — stub returns `rec.reason` until Task 18), action history, Approve/Reject if PENDING.
- [ ] **Step 3: Run, see pass.** Manual: list sorted Croissants→…→Pasta; detail renders sparkline.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: inventory risk list + product detail (PRD §7.1)"`

### Task 13: Action Queue + approve → create listing

**Files:** Create `src/app/(admin)/admin/recommendations/page.tsx`, `src/server/actions/approve.ts`, `src/server/services/listing.ts`; Test `tests/unit/listing.integration.test.ts`

- [ ] **Step 1: Failing test**
```ts
import { describe, it, expect } from "vitest";
import { createListingFromRecommendation } from "@/server/services/listing";
import { prisma } from "@/lib/db";
it("approve creates an ACTIVE listing + audit, idempotent", async () => {
  const rec = await prisma.recommendation.findFirstOrThrow({
    where: { status: "PENDING", batch: { product: { sku: "DARY-YOG-500" } } } });
  const l = await createListingFromRecommendation(rec.id, { id: "u", name: "Kamran" });
  expect(l.status).toBe("ACTIVE");
  expect(l.discountPercent).toBe(40);
  const again = await createListingFromRecommendation(rec.id, { id: "u", name: "Kamran" });
  expect(again.id).toBe(l.id); // idempotent, no duplicate
  expect(await prisma.auditLog.count({ where: { action: "APPROVE_REC", entityId: rec.id } })).toBe(1);
});
```
- [ ] **Step 2: Run, see fail** — FAIL.
- [ ] **Step 3: Implement** `listing.ts` `createListingFromRecommendation(recId, actor)` in a `$transaction`: load rec+batch+product, guard rec is PENDING (if already APPROVED return existing listing — idempotent), compute `discountPercent(risk)` + `listingUnitPrice`, create `MarketplaceListing` (publicTitle = buyer-safe product name, price, discount, minQty 1, maxQty = available qty, pickup window = next 2 days from `getToday()`, status ACTIVE), set `rec.status=APPROVED, resolvedAt`, `writeAudit(...,'APPROVE_REC')` + `'CREATE_LISTING'`. `approve.ts` Server Action: `requireRole(HQ_ADMIN,BRANCH_MANAGER)`, Zod-validate recId, call service, `revalidatePath('/admin/recommendations')` & `/admin` & `/marketplace`. `recommendations/page.tsx`: queue cards (money side-by-side, confidence words, collapsed Why), **Təsdiqlə** + Reject.
- [ ] **Step 4: Run, see pass** — PASS.
- [ ] **Step 5: Manual** — approve Greek Yogurt → toast, card resolves, listing exists (Studio).
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: action queue + approve→listing (storyboard 12-28s, PRD §19)"`

---

## Phase 4 — B2B Marketplace surface

### Task 14: Buyer-safe data layer (privacy guarantee)

**Files:** Create `src/server/services/market.ts`; Test `tests/unit/market-privacy.test.ts`

- [ ] **Step 1: Failing test (PRD §15 privacy / §19)**
```ts
import { describe, it, expect } from "vitest";
import { getPublicListings, getPublicListing } from "@/server/services/market";
it("never leaks internal fields to buyers", async () => {
  const list = await getPublicListings({});
  for (const l of list) {
    const keys = Object.keys(l);
    for (const banned of ["costPerUnit","riskScore","expectedLoss","cost","lotNumber","conditionStatus"])
      expect(keys).not.toContain(banned);
    expect(keys).not.toContain("expiryDate"); // buyer sees value, never decay (04-pages)
  }
});
```
- [ ] **Step 2: Run, see fail** — FAIL.
- [ ] **Step 3: Implement** `market.ts`: `getPublicListings(filters)` & `getPublicListing(id)` using an explicit Prisma `select` whitelist returning ONLY `{ id, publicTitle, price, discountPercent, retailStruck, qtyAvailable, pickupStart, pickupEnd, categoryName, branchCity, urgent }`. No expiry, no cost, no risk. `urgent` = discountPercent >= 45.
- [ ] **Step 4: Run, see pass** — PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: buyer-safe market data layer (PRD §15 privacy)"`

### Task 15: Marketplace home + listing detail + reserve

**Files:** Create `src/app/(market)/layout.tsx`, `src/app/(market)/marketplace/page.tsx`, `src/app/(market)/marketplace/[listingId]/page.tsx`, `src/server/actions/reserve.ts`, `src/server/services/order.ts`, `src/lib/code.ts`; Test `tests/unit/order.integration.test.ts`

- [ ] **Step 1: Failing test (transaction-safe, no overselling — PRD §15/§20)**
```ts
import { describe, it, expect } from "vitest";
import { placeOrderService } from "@/server/services/order";
import { prisma } from "@/lib/db";
it("reserves stock, generates pickup code, prevents oversell", async () => {
  const l = await prisma.marketplaceListing.findFirstOrThrow({ where: { status: "ACTIVE" } });
  const buyer = await prisma.company.findFirstOrThrow({ where: { legalName: "Astoria Hotel" } });
  const o = await placeOrderService({ listingId: l.id, quantity: 10, buyerCompanyId: buyer.id });
  expect(o.pickupCode).toMatch(/^[A-Z0-9]{6}$/);
  expect(o.status).toBe("RESERVED");
  const batch = await prisma.inventoryBatch.findFirstOrThrow({ where: { id: l.batchId } });
  expect(batch.quantityReserved).toBeGreaterThanOrEqual(10);
  await expect(placeOrderService({ listingId: l.id, quantity: 999999, buyerCompanyId: buyer.id }))
    .rejects.toThrow(/stock|InsufficientStock/i);
});
```
- [ ] **Step 2: Run, see fail** — FAIL.
- [ ] **Step 3: Implement** `lib/code.ts` `pickupCode()` (6 char A–Z0–9; deterministic in test env via seed counter). `order.ts` `placeOrderService` exactly per `03-architecture.md` "Critical transactions" (`$transaction`, availability assert, `quantityReserved += qty`, listing→RESERVED if exhausted, create Order, `writeAudit('RESERVE')`, typed `InsufficientStockError`/`InvalidQuantityError`). `reserve.ts` Server Action: `requireRole(BUSINESS_BUYER)` (allow HQ_ADMIN preview), Zod, call service, revalidate `/marketplace*` & `/admin*`, return pickup code. `(market)/layout.tsx`: `requireRole(BUSINESS_BUYER, HQ_ADMIN)`, buyer shell (NO AI affordance — `05-ai-spec.md` guardrail). `marketplace/page.tsx`: hero value line + card grid (big new price, small struck old, discount badge, urgent badge, **Sifariş et**), filters category/branch/pickup. `[listingId]/page.tsx`: detail + qty selector (min/max) + Reserve → success showing big pickup code.
- [ ] **Step 4: Run, see pass** — PASS.
- [ ] **Step 5: Manual** — buyer reserves yogurt → pickup code screen.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: marketplace + transactional reserve (storyboard 28-42s, PRD §15)"`

### Task 16: Buyer orders dashboard

**Files:** Create `src/app/(market)/marketplace/orders/page.tsx`, extend `market.ts` with `getBuyerOrders(companyId)`

- [ ] **Step 1: Component/integration test:** `getBuyerOrders` returns the reserved order with `pickupCode`, status, no internal fields. Run, see fail.
- [ ] **Step 2: Implement** service + page: table of orders (product title, qty, total, status, **pickup code**, pickup window) + simple "recommended categories" block (categories the buyer ordered). Buyer-safe fields only.
- [ ] **Step 3: Run, see pass.** Manual: `/marketplace/orders` shows the reservation + code.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: buyer orders dashboard (PRD §7.2)"`

---

## Phase 5 — Loop close & audit

### Task 17: Confirm pickup + Marketplace Control + Audit page

**Files:** Create `src/app/(admin)/admin/listings/page.tsx`, `src/app/(admin)/admin/audit/page.tsx`, `src/server/actions/confirm-pickup.ts`, `src/server/services/fulfillment.ts`; Test `tests/unit/fulfillment.integration.test.ts`

- [ ] **Step 1: Failing test (decrement, no negative, audit — PRD §19/§20)**
```ts
import { describe, it, expect } from "vitest";
import { confirmPickupService } from "@/server/services/fulfillment";
import { placeOrderService } from "@/server/services/order";
import { prisma } from "@/lib/db";
it("pickup decrements stock, closes loop, audits, idempotent", async () => {
  const l = await prisma.marketplaceListing.findFirstOrThrow({ where: { status: "ACTIVE" } });
  const buyer = await prisma.company.findFirstOrThrow({ where: { legalName: "Astoria Hotel" } });
  const before = await prisma.inventoryBatch.findFirstOrThrow({ where: { id: l.batchId } });
  const o = await placeOrderService({ listingId: l.id, quantity: 5, buyerCompanyId: buyer.id });
  const r = await confirmPickupService(o.pickupCode, { id: "m", name: "Kamran" });
  expect(r.status).toBe("PICKED_UP");
  const after = await prisma.inventoryBatch.findFirstOrThrow({ where: { id: l.batchId } });
  expect(after.quantityOnHand).toBe(before.quantityOnHand - 5);
  expect(after.quantityReserved).toBe(before.quantityReserved); // released on pickup
  await expect(confirmPickupService(o.pickupCode, { id: "m", name: "Kamran" })).rejects.toThrow();
  expect(await prisma.auditLog.count({ where: { action: "PICKUP_CONFIRM" } })).toBeGreaterThan(0);
});
```
- [ ] **Step 2: Run, see fail** — FAIL.
- [ ] **Step 3: Implement** `fulfillment.ts` `confirmPickupService(code, actor)` exactly per `03-architecture.md` (`$transaction`: find order RESERVED, `quantityOnHand -= qty`, `quantityReserved -= qty`, guards no-negative typed errors, `order.PICKED_UP + pickedUpAt`, listing→SOLD if exhausted, `writeAudit('PICKUP_CONFIRM')`). `confirm-pickup.ts` action: `requireRole(BRANCH_MANAGER,HQ_ADMIN,LOGISTICS_OPERATOR)`, Zod code, revalidate `/admin*`. `listings/page.tsx`: published listings + reservations + pickup-code input → Confirm. `audit/page.tsx`: reverse-chron audit table.
- [ ] **Step 4: Run, see pass** — PASS.
- [ ] **Step 5: Manual full loop** — approve → reserve → confirm pickup → `/admin` hero now > 0, `/admin/audit` shows the chain.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: confirm pickup + loop close + audit (storyboard 42-52s, PRD §19)"`

---

## Phase 6 — Claude AI layer (display-only, fallback-safe)

### Task 18: AI client + explain + narrate (with fallback tests)

**Files:** Create `src/server/ai/client.ts`, `src/server/ai/explain.ts`, `src/server/ai/narrate.ts`, `src/lib/timeout.ts`; Test `tests/unit/ai-fallback.test.ts`

- [ ] **Step 1: Failing test (fallback is deterministic — the demo-critical guarantee)**
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { explainRecommendation } from "@/server/ai/explain";
import { narrateEvent } from "@/server/ai/narrate";
describe("AI fallback (offline-safe)", () => {
  beforeEach(() => { process.env.AI_ENABLED = "false"; });
  it("explain falls back to deterministic reason", async () => {
    const out = await explainRecommendation(
      { reason: "Yüksək risk — B2B siyahıya əlavə et" } as any, { } as any);
    expect(out).toBe("Yüksək risk — B2B siyahıya əlavə et");
  });
  it("narrate falls back to template", async () => {
    const out = await narrateEvent({ type: "pickup", product: "Yunan qatığı 500q",
      qty: 120, buyer: "Astoria Hotel", recovered: "1 248 ₼" });
    expect(out).toContain("Astoria Hotel");
    expect(out).toContain("120");
    expect(out).toContain("heç nə xarab olmadı");
  });
});
```
- [ ] **Step 2: Run, see fail** — FAIL.
- [ ] **Step 3: Implement** `lib/timeout.ts` `withTimeout(p, ms, fallback)`. `ai/client.ts`: `aiAvailable()` (`AI_ENABLED==='true' && ANTHROPIC_API_KEY`), `getModel()` (`@ai-sdk/anthropic`). `explain.ts`/`narrate.ts` exactly per `05-ai-spec.md §5.1/§5.2`: if not available → return deterministic fallback immediately; else `generateText` wrapped in `withTimeout(1500, fallback)`. Wire `explainRecommendation` into the "Niyə? / Why?" server action used by Tasks 12 & 13.
- [ ] **Step 4: Run, see pass** — PASS (offline path proven). Optional manual with real key: Why-text becomes richer.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: Claude explain/narrate with deterministic fallback (PRD §11)"`

### Task 19: Streaming ops chatbot + live narration line

**Files:** Create `src/app/api/chat/route.ts`, `src/components/ai-chat.tsx`, `src/components/status-line.tsx`; wire `narrateEvent` into loop-close

- [ ] **Step 1: Test** `tests/unit/chat-route.test.ts`: with `AI_ENABLED=false`, `POST /api/chat` body `{messages:[...]}` returns a streamed single-chunk fallback string `AI köməkçi hazırda oflayndır`. Run, see fail.
- [ ] **Step 2: Implement** `api/chat/route.ts` per `05-ai-spec.md §5.3`: build system prompt from `getKpisService()`; if unavailable stream the canned chunk; else `streamText(getModel(), {...})` → `toDataStreamResponse()`. `ai-chat.tsx` (client, `useChat` from `ai/react`) mounted in admin shell only. `status-line.tsx`: after confirm-pickup, show `narrateEvent({type:'pickup',...})` result on `/admin` (revalidated). 
- [ ] **Step 3: Run, see pass.** Manual offline: chatbot answers with fallback; with key: real answers in AZ.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: ops chatbot + live narration (Innovation/Presentation)"`

---

## Phase 7 — Demo hardening

### Task 20: E2E storyboard test (the 60-second path)

**Files:** Create `tests/e2e/storyboard.spec.ts`, `playwright.config.ts`

- [ ] **Step 1: Failing E2E** automating `04-pages-and-flows.md` "Storyboard → exact clicks":
```ts
import { test, expect } from "@playwright/test";
test("60s loop: predict → approve → reserve → pickup → impact", async ({ page }) => {
  await page.goto("/select-user");
  await page.getByText("Kamran").click();                       // Branch A manager
  await expect(page.getByText("Bu gün bərpa olundu")).toBeVisible();
  await page.getByRole("link", { name: /AI növbəsinə bax/ }).click();
  await page.getByRole("button", { name: "Təsdiqlə" }).first().click();
  await expect(page.getByText(/Bazara çıxarıldı|Təsdiqləndi/)).toBeVisible();
  await page.goto("/select-user"); await page.getByText("Astoria Hotel").click();
  await page.getByRole("link", { name: /Yunan qatığı/ }).first().click();
  await page.getByRole("button", { name: "Sifariş et" }).click();
  const code = await page.getByTestId("pickup-code").textContent();
  await page.goto("/select-user"); await page.getByText("Kamran").click();
  await page.goto("/admin/listings");
  await page.getByTestId("pickup-input").fill(code!.trim());
  await page.getByRole("button", { name: /Təhvili təsdiqlə/ }).click();
  await page.goto("/admin");
  await expect(page.getByTestId("hero-number")).not.toHaveText("0 ₼");
  await expect(page.getByText(/xilas edildi|CO₂/)).toBeVisible();
});
```
- [ ] **Step 2: Run, see fail** — adjust selectors/`data-testid`s in components until green. Add `data-testid` to hero, pickup code, pickup input.
- [ ] **Step 3: Implement** `playwright.config.ts` (webServer `pnpm build && pnpm start` with `AI_ENABLED=false` + `pnpm db:reset` global setup so the run is pristine & offline-safe).
- [ ] **Step 4: Run, see pass** — `pnpm test:e2e` → PASS with Wi-Fi off.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "test: e2e 60-second storyboard, offline-safe"`

### Task 21: Polish, empty/loading states, acceptance pass

**Files:** loading.tsx/error.tsx per route group, design tokens, `07-testing-and-demo.md` checklist

- [ ] **Step 1:** Add `loading.tsx` (skeletons) + `error.tsx` (calm AZ message) to `(admin)` and `(market)`. Apply the design tokens from `hackathon/design/` (canvas, ink, Bravo green, one hero number, calm). No console logs/debug.
- [ ] **Step 2:** Run the full PRD §19 acceptance checklist in `07-testing-and-demo.md` manually; fix any gap.
- [ ] **Step 3:** `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` → all green.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "chore: polish, states, acceptance pass — demo ready"`

### Task 22: Demo runbook rehearsal

- [ ] **Step 1:** Follow `07-testing-and-demo.md` "Demo run script" end-to-end with Wi-Fi physically off; time it (≤60s). 
- [ ] **Step 2:** Run `pnpm db:reset` to restore pristine state; confirm idempotent.
- [ ] **Step 3:** Rehearse the judge Q&A list in `07`. 
- [ ] **Step 4: Tag** — `git tag demo-ready && git commit --allow-empty -m "chore: demo-ready tag"`

---

## Self-review (run after writing/executing — checklist, not a subagent)

**1. Spec coverage (PRD §):** §3 personas→Task 9 · §7.1 admin screens→Tasks 11,12,13,17 · §7.2 buyer screens→Tasks 15,16 · §8/§9 data model→Task 6 · §10 APIs (as Server Actions/Route Handlers)→Tasks 8,13,15,17,19 · §11.1 risk→Task 3 · §11.3 decision→Task 4 · §12 data flow→Tasks 7,8,13,15,17 · §13 marketplace rules→Tasks 14,15 · §15 NFR (privacy/no-oversell/audit/3-click)→Tasks 14,15,17 · §18 dataset→Task 7 · §19 acceptance→Tasks 13,15,17,21 · §20 testing→every TDD task + Task 20 · §22 build order→this phase order. **Gap check:** Notifications (§14) — rendered as the in-app at-risk list / status line (Tasks 11,19); real email/push is a documented scope cut (`00-overview.md`). Transfers (§8 model) — documented cut. No silent gaps.

**2. Placeholder scan:** No "TBD/handle errors/similar to Task N". Long schema/seed live verbatim in `02`; the engine code is inline here. Acceptable per writing-plans (concrete docs in same plan folder, not hand-waving).

**3. Type consistency:** `scoreBatch`/`recommend`/`discountPercent`/`listingUnitPrice`/`impact` signatures defined in Tasks 3–5 are used unchanged in Tasks 8,13. `createListingFromRecommendation`, `placeOrderService`, `confirmPickupService`, `getKpisService`, `getPublicListings`, `writeAudit` names are stable across Tasks 8–19. Money is qəpik `Int` everywhere. "Today" only via `getToday()`.

---

## Execution Handoff

Plan complete. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration (REQUIRED SUB-SKILL: superpowers:subagent-driven-development).
2. **Inline Execution** — execute tasks in this session with checkpoints (REQUIRED SUB-SKILL: superpowers:executing-plans).
