# 02 — Data Model, Schema & Seed

Implements PRD §8 (Data Architecture), §9 (Schema Draft), §18 (Demo Dataset). Batch-level inventory, not SKU-level (PRD §8: a product can have multiple expiry dates per branch).

## Datastore: SQLite for demo, Postgres-portable

> **Implemented decision (revised).** The demo runs on **SQLite** (`DATABASE_URL="file:./dev.db"`) via Prisma — zero infra, no server/Docker/root, runs on any laptop fully offline. Two mechanical deltas vs. the Postgres draft below, *nothing else changes*:
> - **`provider = "sqlite"`** instead of `postgresql`.
> - **8 `enum` blocks → `String` columns** (Prisma can't model native enums on SQLite). The enum *value contracts* are unchanged and are validated in-app via Zod; the domain layer already uses TS string unions, so `risk.ts`/`decision.ts`/services are untouched. `AuditLog.metadata Json?` → `String?` (JSON-encoded).
> - Schema is created with `prisma db push` (no migration history needed for a demo); `npm run db:reset` = `prisma db push --force-reset && prisma db seed` (instant, judge-proof, no drift).
>
> **Production / live-URL swap path** (documented, reversible): set `provider = "postgresql"`, point `DATABASE_URL` at Neon/Supabase, restore the Postgres enums, and apply the archived migration in **`prisma/_postgres-migration/`** (the verbatim Postgres DDL written in Task 6) via `prisma migrate deploy`. The schema below is that Postgres reference.

## Prisma schema — Postgres reference (demo uses the SQLite variant above)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // demo: "sqlite"
  url      = env("DATABASE_URL")
}

enum Role {
  HQ_ADMIN
  BRANCH_MANAGER
  WAREHOUSE_MANAGER
  FINANCE_ANALYST
  BUSINESS_BUYER
  LOGISTICS_OPERATOR
}

enum CompanyType {
  BRAVO
  BUYER
}

enum VerificationStatus {
  PENDING
  VERIFIED
  REJECTED
}

enum ConditionStatus {
  GOOD
  CHECK_REQUIRED
  UNSAFE
}

enum ActionType {
  KEEP
  IN_STORE_DISCOUNT
  TRANSFER
  LIST_B2B
  BUNDLE
  DONATE
  SUPPLIER_RETURN
  DISPOSE
}

enum RecStatus {
  PENDING
  APPROVED
  REJECTED
  EXECUTED
}

enum ListingStatus {
  ACTIVE
  RESERVED
  SOLD
  UNPUBLISHED
}

enum OrderStatus {
  RESERVED
  PICKED_UP
  CANCELLED
}

model Company {
  id                 String             @id @default(uuid())
  type               CompanyType
  legalName          String
  taxId              String?
  verificationStatus VerificationStatus @default(VERIFIED)
  reliabilityScore   Int                @default(100) // 0-100, PRD §6 Buyer Reliability
  users              User[]
  orders             Order[]
  createdAt          DateTime           @default(now())
}

model User {
  id        String   @id @default(uuid())
  role      Role
  name      String
  email     String   @unique
  companyId String?
  company   Company? @relation(fields: [companyId], references: [id])
  branchId  String?
  branch    Branch?  @relation(fields: [branchId], references: [id])
  status    String   @default("active")
}

model Branch {
  id        String          @id @default(uuid())
  name      String
  city      String
  latitude  Float?
  longitude Float?
  users     User[]
  batches   InventoryBatch[]
}

model Category {
  id                String    @id @default(uuid())
  name              String    @unique
  perishabilityLevel Int      // 1 (low) .. 5 (high) — drives urgency factor default
  products          Product[]
}

model Product {
  id          String           @id @default(uuid())
  sku         String           @unique
  barcode     String?
  name        String
  brand       String?
  categoryId  String
  category    Category         @relation(fields: [categoryId], references: [id])
  unitSize    String?
  storageType String?          // ambient | chilled | frozen
  isActive    Boolean          @default(true)
  batches     InventoryBatch[]
  sales       SalesTransaction[]
}

model InventoryBatch {
  id               String          @id @default(uuid())
  productId        String
  product          Product         @relation(fields: [productId], references: [id])
  branchId         String
  branch           Branch          @relation(fields: [branchId], references: [id])
  lotNumber        String
  expiryDate       DateTime        // date only (UTC midnight)
  quantityOnHand   Int
  quantityReserved Int             @default(0)
  costPerUnit      Int             // qəpik
  retailPrice      Int             // qəpik
  conditionStatus  ConditionStatus @default(GOOD)
  lastStockCheckAt DateTime?
  riskScores       RiskScore[]
  recommendations  Recommendation[]
  listings         MarketplaceListing[]
}

model SalesTransaction {
  id        String   @id @default(uuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  branchId  String
  quantity  Int
  unitPrice Int      // qəpik
  soldAt    DateTime
}

model RiskScore {
  id                String   @id @default(uuid())
  batchId           String
  batch             InventoryBatch @relation(fields: [batchId], references: [id])
  riskScore         Int      // 0-100
  expectedUnsoldQty Int
  expectedLoss      Int      // qəpik
  confidence        Float    // 0..1
  modelVersion      String   @default("rules-mvp-1")
  generatedAt       DateTime @default(now())
}

model Recommendation {
  id               String     @id @default(uuid())
  batchId          String
  batch            InventoryBatch @relation(fields: [batchId], references: [id])
  actionType       ActionType
  priority         Int        // 1 (highest) .. 5
  reason           String     // deterministic human reason (Claude may enrich at view time)
  expectedRecovery Int        // qəpik
  status           RecStatus  @default(PENDING)
  ownerId          String?
  createdAt        DateTime   @default(now())
  resolvedAt       DateTime?
  listing          MarketplaceListing?
}

model MarketplaceListing {
  id               String        @id @default(uuid())
  batchId          String
  batch            InventoryBatch @relation(fields: [batchId], references: [id])
  recommendationId String?       @unique
  recommendation   Recommendation? @relation(fields: [recommendationId], references: [id])
  publicTitle      String
  price            Int           // qəpik, discounted unit price (buyer-facing)
  discountPercent  Int           // 0-100
  minQty           Int           @default(1)
  maxQty           Int
  pickupStart      DateTime
  pickupEnd        DateTime
  status           ListingStatus @default(ACTIVE)
  orders           Order[]
  createdAt        DateTime      @default(now())
}

model Order {
  id              String      @id @default(uuid())
  listingId       String
  listing         MarketplaceListing @relation(fields: [listingId], references: [id])
  buyerCompanyId  String
  buyerCompany    Company     @relation(fields: [buyerCompanyId], references: [id])
  quantity        Int
  totalAmount     Int         // qəpik
  status          OrderStatus @default(RESERVED)
  pickupCode      String      // 6-char human code, demo-friendly
  createdAt       DateTime    @default(now())
  pickedUpAt      DateTime?
}

model AuditLog {
  id         String   @id @default(uuid())
  actorId    String?
  actorName  String
  entityType String
  entityId   String
  action     String
  metadata   Json?
  createdAt  DateTime @default(now())
}
```

Deviations from PRD §9 (all deliberate, justified):
- Money columns are `Int` qəpik (see `01-tech-stack.md` money decision) instead of `DECIMAL` — avoids float drift in the no-overselling math (PRD §15).
- `Transfer` model from §8 is **omitted** — transfers are a *recommended action type* (`ActionType.TRANSFER`) shown in the queue, but the demo path is marketplace; no transfer-execution screen (scope cut, `00-overview.md`).
- `priority` is `Int` (1–5) not free TEXT — sortable queue.

## Seed dataset (`prisma/seed.ts`)

Deterministic. Uses `DEMO_TODAY` (`2026-05-15`). Reproduces PRD §18 exactly. The 14-day sales history per product is engineered so the §11.1 formula yields the §18 risk scores (validated by an integration test in `06`).

### Branches (PRD §18)

| id key | name | city |
|---|---|---|
| `branch-a` | Bravo Branch A | Baku |
| `branch-b` | Bravo Branch B | Baku |
| `branch-c` | Bravo Branch C | Ganja |
| `branch-d` | Bravo Branch D | Sumqayit |

### Categories

| name | perishabilityLevel |
|---|---|
| Dairy | 5 |
| Meat | 5 |
| Produce | 4 |
| Bakery | 5 |
| Packaged | 1 |

### Companies + demo users (mock RBAC — PRD §3, §22)

Bravo company (`type BRAVO`, `Bravo MMC`). Buyer companies (`type BUYER`, `VERIFIED`):
- `Astoria Hotel` (reliabilityScore 96) — the demo buyer
- `Restoran Nar & Qrill` (reliabilityScore 88)
- `Kafe Mərkəz` (reliabilityScore 74)

Demo users (one per role; password-less, selected via role switcher — `03-architecture.md`):
| name | email | role | scope |
|---|---|---|---|
| Aysel (HQ) | hq@bravo.az | HQ_ADMIN | all branches |
| Kamran (Branch A) | mgr.a@bravo.az | BRANCH_MANAGER | branch-a |
| Finance | fin@bravo.az | FINANCE_ANALYST | read-only |
| Astoria Hotel | buyer@astoria.az | BUSINESS_BUYER | Astoria company |
| Logistics | ops@bravo.az | LOGISTICS_OPERATOR | tasks |

### Products + batches + sales history (reproduces PRD §18)

For each product: one `Product`, one `InventoryBatch` at the listed branch with the listed qty/expiry, `costPerUnit`/`retailPrice` in qəpik, and a 14-day `SalesTransaction` series. `avgDailySales14d` below is `sum(series)/14`; the series is a flat daily value (engineered for stability and to land the §18 risk score under the `05-ai-spec.md` formula).

| Product | SKU | Branch | Category | Qty | Expiry | cost (qəpik) | retail (qəpik) | 14-day sales SUM | §18 risk target |
|---|---|---|---|---|---|---|---|---|---|
| Greek Yogurt 500g | DARY-YOG-500 | A | Dairy | 120 | 2026-05-18 | 180 | 320 | 185 | 86 |
| Chicken Breast 1kg | MEAT-CHK-1000 | B | Meat | 45 | 2026-05-17 | 650 | 1190 | 101 | 92 |
| Bananas (kg) | PROD-BAN-1000 | C | Produce | 230 | 2026-05-16 | 90 | 210 | 1236 | 88 |
| Croissants Pack | BAKE-CRS-6 | D | Bakery | 80 | 2026-05-15 | 140 | 360 | 98 | 95→100 (saturates) |
| Pasta Sauce 500g | PACK-PST-500 | A | Packaged | 300 | 2026-06-10 | 150 | 340 | 95 | 41 |

> **The "14-day sales SUM" column is authoritative and comes from `05-ai-spec.md` (it is engineered so the §11.1 formula reproduces the §18 risk scores).** Do not invent per-day averages — the seed lays down a deterministic integer series **summing to this value** over the 14 days before `DEMO_TODAY`.

`lotNumber` format `LOT-{SKU3}-{YYYYMMDD}` (e.g. `LOT-YOG-20260518`). `conditionStatus`: all `GOOD` except Chicken Breast = `CHECK_REQUIRED` (PRD §18 "Compliance check, then urgent marketplace listing" + §11.3 unsafe/compliance rule).

### Sales series construction (deterministic)

For each product, write 14 `SalesTransaction` rows, one per day for the 14 days **before** `DEMO_TODAY`, `unitPrice = retailPrice`, `branchId` = the batch's branch. Distribute the product's **14-day sales SUM** (table above) across the 14 days as evenly as integers allow (e.g. base = `floor(SUM/14)` per day, then +1 on the first `SUM mod 14` days). This keeps `avgFirst7 ≈ avgLast7` so `demandSlowdownFactor ≈ 1.0`, making the §11.1 formula reproduce the §18 scores. The worked example proving Greek Yogurt SUM 185 → risk 86 is in `05-ai-spec.md §1`.

### Seed must NOT create

RiskScore, Recommendation, MarketplaceListing, Order — these are **produced by the running system** (recalc service + the demo's Approve/Reserve clicks), proving the loop is real, not staged. The seed only lays down raw operational data. The recalc service is invoked once at the end of seed (or on first Overview load) to populate RiskScore + Recommendation so the dashboard has content on a cold start — see `03-architecture.md` "cold-start recalc".

### Seed determinism rules

- Stable UUIDs: derive ids from a fixed string via `uuidv5` (namespace constant) so re-seeding yields identical ids (stable E2E selectors, stable pickup codes in tests).
- No `Math.random()`, no `Date.now()` — dates derived from `DEMO_TODAY`.
- `pnpm db:reset` must yield byte-identical data every run.
