# Off-taker Reframe + Cross-Branch Bulk Pooling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe HamıyaBravo's buy-side into category-matched off-taker segments with cross-branch bulk pooling and a food-bank donation fallback, so all four mentor critiques are answered without rebuilding the engine.

**Architecture:** Add a pure domain module (`offtaker.ts`) for the category→segment capability matrix and best-match scoring; a thin service wrapper; additive Prisma columns (no destructive migrate); seed-level pooling + segment assignment + donation pass; and presentational badges in the AI Queue and marketplace. The existing risk/auction/order engine is untouched.

**Tech Stack:** Next.js 15 App Router, Prisma 6 + SQLite, TypeScript, Tailwind, Vitest (existing `tests/unit/` pattern), `prisma db push` (additive only).

**Working dir:** `/home/umammadov/Demo/pasha-hackathon/.claude/worktrees/hamiyabravo-mvp/app-hamiyabravo` (all paths below are relative to this). Spec: `../docs/superpowers/specs/2026-05-16-offtaker-reframe-bulk-pooling-design.md`.

**Conventions:** money is qəpik integers; category `.name` values are exactly `Dairy | Meat | Produce | Bakery | Packaged`; reseed = `npx prisma db seed` (NEVER `db:reset`/force-reset — destructive migrate is blocked). Maintainer independently runs `npm run typecheck` + `npm run build` + reseed + count script before declaring done (subagent build claims are not trusted).

---

### Task 1: Additive schema columns

**Files:**
- Modify: `prisma/schema.prisma` (model `Company`, model `MarketplaceListing`)

- [ ] **Step 1: Add `segment` to Company**

In `model Company`, add after the `city String?` line:

```prisma
  segment            String? // OfftakerSegment: PROCESSOR | BAKERY_CAFE_FEED | KITCHEN | FOOD_BANK (BUYER only)
```

- [ ] **Step 2: Add pooling/segment/donation columns to MarketplaceListing**

In `model MarketplaceListing`, add after the `maxQty Int` line:

```prisma
  targetSegment    String? // AI best-match off-taker segment
  pooledQty        Int? // total qty pooled across branches (null = single-branch)
  pooledBranches   Int? // count of contributing branches (null/1 = single)
  donated          Boolean         @default(false) // routed to food-bank tier
```

- [ ] **Step 3: Apply additively**

Run: `npm run db:push`
Expected: `Your database is now in sync with your Prisma schema.` and Prisma Client regenerated. No data loss prompt (all new columns are nullable / defaulted).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): off-taker segment + pooling + donation columns (additive)"
```

---

### Task 2: Pure domain module `offtaker.ts` (TDD)

**Files:**
- Create: `src/domain/offtaker.ts`
- Test: `tests/unit/offtaker.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/offtaker.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  OFFTAKER_SEGMENTS,
  segmentLabel,
  eligibleSegments,
  bestSegment,
  isOnPolicy,
} from "@/domain/offtaker";

describe("offtaker capability matrix", () => {
  it("exposes the four segments", () => {
    expect(OFFTAKER_SEGMENTS).toEqual([
      "PROCESSOR",
      "BAKERY_CAFE_FEED",
      "KITCHEN",
      "FOOD_BANK",
    ]);
  });

  it("maps fruit/produce to processors first, kitchen second", () => {
    expect(eligibleSegments("Produce")).toEqual([
      "PROCESSOR",
      "KITCHEN",
      "FOOD_BANK",
    ]);
  });

  it("maps bakery to bakery/cafe/feed", () => {
    expect(eligibleSegments("Bakery")).toEqual([
      "BAKERY_CAFE_FEED",
      "FOOD_BANK",
    ]);
  });

  it("always allows FOOD_BANK as fallback even for unknown categories", () => {
    expect(eligibleSegments("Mystery")).toEqual(["FOOD_BANK"]);
  });

  it("bestSegment picks the highest-priority eligible segment present", () => {
    const r = bestSegment("Produce", [
      { segment: "KITCHEN", reliability: 90 },
      { segment: "PROCESSOR", reliability: 60 },
    ]);
    expect(r.segment).toBe("PROCESSOR");
    expect(r.label).toBe("Food processor");
    expect(r.why.length).toBeGreaterThan(0);
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it("bestSegment falls back to FOOD_BANK when no commercial match exists", () => {
    const r = bestSegment("Bakery", [{ segment: "KITCHEN", reliability: 99 }]);
    expect(r.segment).toBe("FOOD_BANK");
  });

  it("isOnPolicy is true only when buyer segment can take the category", () => {
    expect(isOnPolicy("PROCESSOR", "PROCESSOR")).toBe(true);
    expect(isOnPolicy("KITCHEN", "PROCESSOR")).toBe(false);
    expect(isOnPolicy(null, "PROCESSOR")).toBe(false);
  });

  it("segmentLabel returns human labels", () => {
    expect(segmentLabel("FOOD_BANK")).toBe("Food bank");
    expect(segmentLabel("BAKERY_CAFE_FEED")).toBe("Bakery / Café / Feed");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run tests/unit/offtaker.test.ts`
Expected: FAIL — `Cannot find module '@/domain/offtaker'`.

- [ ] **Step 3: Implement `src/domain/offtaker.ts`**

```ts
// Pure off-taker capability matrix + best-match scoring. No I/O, no deps.
export type OfftakerSegment =
  | "PROCESSOR"
  | "BAKERY_CAFE_FEED"
  | "KITCHEN"
  | "FOOD_BANK";

export const OFFTAKER_SEGMENTS: OfftakerSegment[] = [
  "PROCESSOR",
  "BAKERY_CAFE_FEED",
  "KITCHEN",
  "FOOD_BANK",
];

const LABELS: Record<OfftakerSegment, string> = {
  PROCESSOR: "Food processor",
  BAKERY_CAFE_FEED: "Bakery / Café / Feed",
  KITCHEN: "Caterer / Hotel / Kitchen",
  FOOD_BANK: "Food bank",
};

export function segmentLabel(s: OfftakerSegment | string | null): string {
  if (!s) return "—";
  return LABELS[s as OfftakerSegment] ?? s;
}

// Ordered by priority: index 0 is the strongest commercial fit.
// FOOD_BANK is always appended as the guaranteed donation fallback.
const MATRIX: Record<string, OfftakerSegment[]> = {
  Produce: ["PROCESSOR", "KITCHEN"],
  Bakery: ["BAKERY_CAFE_FEED"],
  Dairy: ["KITCHEN"],
  Meat: ["KITCHEN"],
  Packaged: ["KITCHEN", "PROCESSOR"],
};

export function eligibleSegments(category: string): OfftakerSegment[] {
  const base = MATRIX[category] ?? [];
  return [...base, "FOOD_BANK"];
}

export function isOnPolicy(
  buyerSegment: OfftakerSegment | string | null,
  category: string
): boolean {
  if (!buyerSegment) return false;
  return eligibleSegments(category).includes(
    buyerSegment as OfftakerSegment
  );
}

export type Candidate = {
  segment: OfftakerSegment | string | null;
  reliability: number; // 0-100
};

export type Match = {
  segment: OfftakerSegment;
  label: string;
  why: string;
  confidence: number; // 0-1
};

// Pick the highest-priority eligible segment that has at least one
// candidate buyer; weight by matrix priority + best candidate reliability.
export function bestSegment(
  category: string,
  candidates: Candidate[]
): Match {
  const order = eligibleSegments(category);
  for (let i = 0; i < order.length; i++) {
    const seg = order[i];
    const buyers = candidates.filter((c) => c.segment === seg);
    if (seg === "FOOD_BANK" || buyers.length > 0) {
      const rel =
        buyers.length > 0
          ? Math.max(...buyers.map((b) => b.reliability))
          : 60;
      const priorityScore = (order.length - i) / order.length; // 1..~0
      const confidence =
        Math.round((0.55 * priorityScore + 0.45 * (rel / 100)) * 100) / 100;
      const why =
        seg === "FOOD_BANK"
          ? `No commercial off-taker can use this ${category.toLowerCase()} in time — routing to donation so it is never a total loss.`
          : `${LABELS[seg]} buyers directly process ${category.toLowerCase()} surplus at scale; best candidate reliability ${rel}%.`;
      return { segment: seg, label: LABELS[seg], why, confidence };
    }
  }
  return {
    segment: "FOOD_BANK",
    label: LABELS.FOOD_BANK,
    why: "Donation fallback.",
    confidence: 0.5,
  };
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run tests/unit/offtaker.test.ts`
Expected: PASS (8 tests green).

- [ ] **Step 5: Commit**

```bash
git add src/domain/offtaker.ts tests/unit/offtaker.test.ts
git commit -m "feat(domain): off-taker capability matrix + best-match (TDD)"
```

---

### Task 3: Service wrapper `offtaker-match.ts`

**Files:**
- Create: `src/server/services/offtaker-match.ts`

- [ ] **Step 1: Implement the service**

```ts
import { prisma } from "@/lib/db";
import { bestSegment, type Match } from "@/domain/offtaker";

// Best off-taker match for a category, using the live pool of verified
// BUYER companies as candidates. Safe: returns FOOD_BANK fallback on error.
export async function matchForCategory(category: string): Promise<Match> {
  try {
    const buyers = await prisma.company.findMany({
      where: { type: "BUYER" },
      select: { segment: true, reliabilityScore: true },
    });
    return bestSegment(
      category,
      buyers.map((b) => ({
        segment: b.segment,
        reliability: b.reliabilityScore,
      }))
    );
  } catch {
    return bestSegment(category, []);
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0 (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/server/services/offtaker-match.ts
git commit -m "feat(service): off-taker match wrapper over live buyer pool"
```

---

### Task 4: Seed off-taker companies with segments

**Files:**
- Modify: `prisma/seed.ts` (the `EXTRA_BUYERS` const ~line 284; the company insert ~line 392; hero companies array ~line 118)

- [ ] **Step 1: Replace `EXTRA_BUYERS` with segmented off-takers**

Replace the entire `const EXTRA_BUYERS: [string, string, string, number][] = [ ... ];` block with (note the added 5th tuple element = segment):

```ts
const EXTRA_BUYERS: [string, string, string, number, string][] = [
  ["company-caspian", "Caspian Juicery", "Baku", 92, "PROCESSOR"],
  ["company-shirvan", "Shirvan Jam & Sauce Co", "Baku", 81, "PROCESSOR"],
  ["company-firuze", "Firuzə Dried-Fruit Works", "Baku", 69, "PROCESSOR"],
  ["company-old", "Old City Smoothie Bar", "Baku", 85, "PROCESSOR"],
  ["company-pekara", "Pekara Breadcrumb Co", "Sumqayit", 77, "BAKERY_CAFE_FEED"],
  ["company-mugam", "Muğam Café Network", "Ganja", 64, "BAKERY_CAFE_FEED"],
  ["company-sheki", "Sheki AgroFeed Farm", "Shaki", 79, "BAKERY_CAFE_FEED"],
  ["company-shah", "Shah Palace Hotel Kitchen", "Baku", 95, "KITCHEN"],
  ["company-zira", "Zira Central Kitchen", "Baku", 90, "KITCHEN"],
  ["company-park", "Park Inn Catering", "Baku", 88, "KITCHEN"],
  ["company-bahar", "Bahar Canteen Group", "Mingachevir", 72, "KITCHEN"],
  ["company-qaynana", "Qaynana Cloud Kitchen", "Ganja", 66, "KITCHEN"],
  ["company-foodbank", "Food Bank Azerbaijan", "Baku", 80, "FOOD_BANK"],
];
```

- [ ] **Step 2: Set `segment` when inserting EXTRA_BUYERS companies**

Find the `...EXTRA_BUYERS.map(([slug, name, city, rel], i) => ({` block in the `companies` array and replace it with (destructure the new `seg`, add `segment: seg`):

```ts
    ...EXTRA_BUYERS.map(([slug, name, city, rel, seg], i) => ({
      id: uuidv5(slug),
      type: "BUYER",
      legalName: name,
      verificationStatus: i % 7 === 0 ? "PENDING" : "VERIFIED",
      reliabilityScore: rel,
      city,
      latitude: CITY_COORD[city][0] + (i % 3) * 0.01,
      longitude: CITY_COORD[city][1] + (i % 2) * 0.01,
      segment: seg,
    })),
```

- [ ] **Step 3: Give hero buyer companies a segment**

In the hero `companies` array (the `data.companies` source, ~line 118 — entries with `type: "BUYER"` such as "Astoria Hotel", "Restoran Nar & Qrill", "Kafe Mərkəz"), add `segment` to each BUYER entry: `"Astoria Hotel"` → `segment: "KITCHEN"`, `"Restoran Nar & Qrill"` → `segment: "KITCHEN"`, `"Kafe Mərkəz"` → `segment: "BAKERY_CAFE_FEED"`. Then in the `...data.companies.map((c) => ({ ... }))` block of the `companies` insert array, add `segment: c.segment ?? null,` as the last property so it is persisted. (Bravo/internal companies keep `segment: null`.)

- [ ] **Step 4: Reseed**

Run: `npx prisma db seed`
Expected: ends with `Seed finished` and no error.

- [ ] **Step 5: Verify every BUYER has a segment**

Run:
```bash
npx tsx -e "import {PrismaClient} from '@prisma/client';const p=new PrismaClient();(async()=>{const b=await p.company.findMany({where:{type:'BUYER'}});const missing=b.filter(c=>!c.segment).length;const fb=b.filter(c=>c.segment==='FOOD_BANK').length;console.log(JSON.stringify({buyers:b.length,missingSegment:missing,foodBanks:fb}));await p.\$disconnect();})()"
```
Expected: `missingSegment:0` and `foodBanks` ≥ 1.

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(seed): segmented off-taker companies (processor/bakery/kitchen/foodbank)"
```

---

### Task 5: Seed — assign `targetSegment` + cross-branch pooling

**Files:**
- Modify: `prisma/seed.ts` (the `seedMarketplace` function — after ACTIVE/historical listings are created, before the trim/pickup section)

- [ ] **Step 1: Add a pooling + targeting pass**

Add this helper near the top of `seedMarketplace` (after the `buyers` const) :

```ts
  const { eligibleSegments } = await import("@/domain/offtaker");
```

Then, immediately after all listings are created (right before the "Complete pickups" block / step 4 trim), insert:

```ts
  // Assign AI target segment + pool same product across nearby branches.
  const liveListings = await prisma.marketplaceListing.findMany({
    include: { batch: { include: { product: { include: { category: true } } } } },
  });
  for (const l of liveListings) {
    const cat = l.batch.product.category.name;
    const targetSegment = eligibleSegments(cat)[0];
    // Sibling batches of the same product in OTHER branches.
    const siblings = await prisma.inventoryBatch.findMany({
      where: {
        productId: l.batch.productId,
        id: { not: l.batchId },
      },
      select: { quantityOnHand: true, quantityReserved: true },
    });
    const siblingQty = siblings.reduce(
      (s, b) => s + Math.max(0, b.quantityOnHand - b.quantityReserved),
      0
    );
    const pooledBranches = 1 + Math.min(siblings.length, 4);
    const pooledQty =
      Math.max(0, l.maxQty) + Math.min(siblingQty, l.maxQty * 4);
    await prisma.marketplaceListing.update({
      where: { id: l.id },
      data: {
        targetSegment,
        pooledBranches: pooledBranches > 1 ? pooledBranches : null,
        pooledQty: pooledBranches > 1 ? pooledQty : null,
        maxQty: pooledBranches > 1 ? pooledQty : l.maxQty,
      },
    });
  }
```

- [ ] **Step 2: Reseed**

Run: `npx prisma db seed`
Expected: `Seed finished`, no error.

- [ ] **Step 3: Verify targeting + pooling**

Run:
```bash
npx tsx -e "import {PrismaClient} from '@prisma/client';const p=new PrismaClient();(async()=>{const ls=await p.marketplaceListing.findMany();const noSeg=ls.filter(l=>!l.targetSegment).length;const pooled=ls.filter(l=>(l.pooledBranches??1)>1).length;console.log(JSON.stringify({listings:ls.length,missingTarget:noSeg,pooledListings:pooled}));await p.\$disconnect();})()"
```
Expected: `missingTarget:0`, `pooledListings` ≥ 1.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(seed): AI target segment + cross-branch bulk pooling"
```

---

### Task 6: Seed — donation fallback pass

**Files:**
- Modify: `prisma/seed.ts` (end of `seedMarketplace`, after the pickups loop, before the queue trim)

- [ ] **Step 1: Add the donation pass**

Insert after the pickups loop and before the `// 4) Keep exactly the reserved...` trim:

```ts
  // Donation fallback: a slice of accepted historical lots is rerouted to
  // the food bank so "nothing is ever a total loss" is demonstrably true.
  const foodBank = await prisma.company.findFirst({
    where: { type: "BUYER", segment: "FOOD_BANK" },
  });
  if (foodBank) {
    const donatable = await prisma.marketplaceListing.findMany({
      where: { status: { in: ["RESERVED", "SOLD"] } },
      orderBy: { createdAt: "asc" },
      take: 4,
    });
    for (const l of donatable) {
      await prisma.marketplaceListing.update({
        where: { id: l.id },
        data: { donated: true, targetSegment: "FOOD_BANK" },
      });
      await prisma.order.updateMany({
        where: { listingId: l.id },
        data: {
          buyerCompanyId: foodBank.id,
          buyerName: foodBank.legalName,
        },
      });
    }
  }
```

(If the `Order` model has no `buyerName` column, drop that line — keep only `buyerCompanyId`.)

- [ ] **Step 2: Reseed**

Run: `npx prisma db seed`
Expected: `Seed finished`, no error.

- [ ] **Step 3: Verify a donation tier exists**

Run:
```bash
npx tsx -e "import {PrismaClient} from '@prisma/client';const p=new PrismaClient();(async()=>{const d=await p.marketplaceListing.count({where:{donated:true}});const a=await p.marketplaceListing.count({where:{status:'ACTIVE'}});const q=await p.recommendation.count({where:{status:'PENDING'}});console.log(JSON.stringify({donated:d,activeListings:a,pendingRecs:q}));await p.\$disconnect();})()"
```
Expected: `donated` ≥ 1, `activeListings:6`, `pendingRecs:10` (invariants from prior work preserved).

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(seed): food-bank donation fallback tier"
```

---

### Task 7: Expose segment/pooling/donation in the auction service

**Files:**
- Modify: `src/server/services/auction.ts` (`AuctionCard`, `AuctionDetail`, `AuctionBid` interfaces + `listAuctions`, `getAuction`, `getClosedAuctions` maps)

- [ ] **Step 1: Extend the returned shapes**

In the `AuctionCard` interface add:
```ts
  targetSegment: string | null;
  pooledBranches: number | null;
  pooledQty: number | null;
  donated: boolean;
```
In the `AuctionBid` interface add:
```ts
  buyerSegment: string | null;
```

- [ ] **Step 2: Populate them**

In `listAuctions` the `prisma.marketplaceListing.findMany` `include` already loads `batch.product`; ensure `bids` include `buyerCompany`. In the `.map((l) => ({ ... }))` return add:
```ts
      targetSegment: l.targetSegment ?? null,
      pooledBranches: l.pooledBranches ?? null,
      pooledQty: l.pooledQty ?? null,
      donated: l.donated ?? false,
```
In `getAuction`, add the same four fields to the returned object, and in its `bids: l.bids.map((b) => ({ ... }))` add:
```ts
      buyerSegment: b.buyerCompany?.segment ?? null,
```
(`getAuction` already includes `bids: { include: { buyerCompany: true } }`.)

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exit 0. Fix any consumer that destructures the interfaces if the compiler flags it (only additive optional reads expected).

- [ ] **Step 4: Commit**

```bash
git add src/server/services/auction.ts
git commit -m "feat(service): expose segment, pooling, donation, buyer segment"
```

---

### Task 8: AI Queue card — best-match + poolable badges

**Files:**
- Modify: `src/app/(admin)/admin/recommendations/page.tsx`

- [ ] **Step 1: Compute the match per card**

At the top of the file add:
```ts
import { eligibleSegments, segmentLabel } from "@/domain/offtaker";
```
The page already loads `recs` with `batch.product`. Ensure the query `include` loads the product category: in the `include.batch.include` object add `product: { include: { category: true } }` (replace the existing `product: true`).

In the `cards` map, after `aiPrice` is computed, add:
```ts
    const category = rec.batch.product.category.name;
    const matchLabel = segmentLabel(eligibleSegments(category)[0]);
```
and include `category, matchLabel` in the returned card object; destructure `matchLabel` where the card is rendered.

- [ ] **Step 2: Render the badge**

In the card JSX, next to the existing units / expiry chips, add:
```tsx
<span className="inline-flex items-center rounded-md bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
  Best match: {matchLabel}
</span>
```

- [ ] **Step 3: Verify build**

Run: `npm run typecheck && npm run build`
Expected: typecheck exit 0; build prints the route table with `/admin/recommendations` and exits 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/admin/recommendations/page.tsx"
git commit -m "feat(ui): AI Queue shows best-match off-taker segment"
```

---

### Task 9: Marketplace — segment, pooled-from-N, donation, out-of-policy bids

**Files:**
- Modify: `src/app/(market)/marketplace/page.tsx` (listing cards)
- Modify: `src/app/(market)/marketplace/[listingId]/page.tsx` (detail + leaderboard)

- [ ] **Step 1: Listing card badges**

In `marketplace/page.tsx`, add `import { segmentLabel } from "@/domain/offtaker";`. For each `auction` card, under the title add:
```tsx
{auction.targetSegment && (
  <span className="mt-2 inline-flex items-center rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">
    For: {segmentLabel(auction.targetSegment)}
  </span>
)}
{(auction.pooledBranches ?? 1) > 1 && (
  <span className="mt-2 ml-1 inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
    Pooled · {auction.pooledBranches} branches
  </span>
)}
{auction.donated && (
  <span className="mt-2 ml-1 inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
    Donated
  </span>
)}
```

- [ ] **Step 2: Detail page — pooled qty + segment in the stat ribbon**

In `[listingId]/page.tsx`, add `import { segmentLabel } from "@/domain/offtaker";`. In the stat ribbon array, change the "Available" stat `sub` to:
```ts
      sub:
        (auction.pooledBranches ?? 1) > 1
          ? `pooled from ${auction.pooledBranches} branches`
          : "units in lot",
```
and add a 5th-style line under the title:
```tsx
{auction.targetSegment && (
  <span className="mt-2 inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
    AI match: {segmentLabel(auction.targetSegment)}
  </span>
)}
```

- [ ] **Step 3: Out-of-policy bid pill in the leaderboard**

In the leaderboard `sortedBids.map(...)`, where the buyer name renders, add after it:
```tsx
{auction.targetSegment &&
  bid.buyerSegment &&
  bid.buyerSegment !== auction.targetSegment && (
    <span className="ml-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
      out-of-policy
    </span>
  )}
```

- [ ] **Step 4: Verify build**

Run: `npm run typecheck && npm run build`
Expected: typecheck exit 0; build exits 0 with `/marketplace` and `/marketplace/[listingId]` in the route table.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(market)/marketplace/page.tsx" "src/app/(market)/marketplace/[listingId]/page.tsx"
git commit -m "feat(ui): marketplace shows segment, pooling, donation, out-of-policy bids"
```

---

### Task 10: (Stretch) `/pitch` narrative route

**Files:**
- Create: `src/app/pitch/page.tsx`

Cut this task first if time is short — it has no dependents.

- [ ] **Step 1: Create the page**

```tsx
import { GlassCard } from "@/components/ui/kit";

const ROWS = [
  ["Near-expiry is bad for restaurants", "Kitchen segment cooks same-day; donation fallback for the rest"],
  ["Small lots are useless for bulk buyers", "Cross-branch bulk pooling into one aggregated lot"],
  ["Fruit & bakery are the real waste, poor restaurant fit", "Category→segment matrix: fruit→Processors, bakery→Bakery/Café/Feed"],
  ["Target specific clients who directly utilize products", "AI best-match segment per lot + segmented off-taker marketplace"],
];

export default function PitchPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-10">
      <div className="space-y-3">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-600">
          HamıyaBravo
        </p>
        <h1 className="text-4xl font-black text-slate-900">
          AI routes every category of supermarket surplus to the off-taker
          who can actually use it — in bulk, before it expires.
        </h1>
        <p className="text-lg text-slate-600">
          Whatever doesn&apos;t clear is auto-donated. Nothing is a total loss.
        </p>
      </div>
      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-black text-slate-900">
          We heard the critique
        </h2>
        <div className="divide-y divide-slate-200">
          {ROWS.map(([c, a]) => (
            <div key={c} className="grid grid-cols-2 gap-4 py-3">
              <p className="text-sm font-semibold text-rose-600">{c}</p>
              <p className="text-sm font-semibold text-emerald-700">{a}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + commit**

Run: `npm run build`
Expected: exit 0 with `/pitch` in the route table.

```bash
git add src/app/pitch/page.tsx
git commit -m "feat(ui): /pitch critique-answer narrative page"
```

---

### Task 11: Final verification (maintainer-run, not trusted from subagents)

**Files:** none (verification only)

- [ ] **Step 1: Clean typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: typecheck exit 0; build exit 0; route table includes `/admin/recommendations`, `/marketplace`, `/marketplace/[listingId]` (and `/pitch` if Task 10 done).

- [ ] **Step 2: Reseed (additive, never force-reset)**

Run: `npx prisma db seed`
Expected: `Seed finished`.

- [ ] **Step 3: Invariant + feature count check**

Run:
```bash
npx tsx -e "import {PrismaClient} from '@prisma/client';const p=new PrismaClient();(async()=>{const a=await p.marketplaceListing.count({where:{status:'ACTIVE'}});const q=await p.recommendation.count({where:{status:'PENDING'}});const seg=await p.company.count({where:{type:'BUYER',segment:null}});const pooled=await p.marketplaceListing.count({where:{pooledBranches:{gt:1}}});const don=await p.marketplaceListing.count({where:{donated:true}});console.log(JSON.stringify({activeListings:a,pendingRecs:q,buyersMissingSegment:seg,pooledListings:pooled,donated:don}));await p.\$disconnect();})()"
```
Expected: `activeListings:6`, `pendingRecs:10`, `buyersMissingSegment:0`, `pooledListings`≥1, `donated`≥1.

- [ ] **Step 4: Restart the production server for the demo**

Run: `fuser -k 3000/tcp; npm run start` (background) then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/select-user` → expect `200`.

- [ ] **Step 5: Manual demo checklist**
  - Admin → AI Queue: each card shows "Best match: {segment}".
  - Buyer → Market: cards show "For: {segment}", some "Pooled · N branches", a "Donated" tag exists.
  - Buyer → a listing: stat ribbon shows "pooled from N branches"; leaderboard marks a non-matching bid "out-of-policy".
  - `/pitch` (if built) renders the critique→answer table.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: off-taker reframe verified (build green, seed invariants hold)"
```

---

## Self-Review

**Spec coverage:**
- §4 schema → Task 1 ✓
- §5.1 offtaker.ts → Task 2 ✓
- §5.2 offtaker-match → Task 3 ✓
- §5.3 pooling → Task 5 ✓
- §5.4 donation → Task 6 ✓
- §5.5 AI match + soft policy UI → Tasks 7–9 ✓
- §5.6 reseed off-takers → Task 4 ✓
- §5.7 pitch (stretch) → Task 10 ✓
- §7 verification → Tasks 2,5,6,8,9,11 ✓
- §8 risks (additive only, seed-level aggregation, soft flag, maintainer verify) → respected throughout ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; the only conditional ("drop `buyerName` if column absent" in Task 6) is an explicit, decidable instruction, not a placeholder.

**Type consistency:** `OfftakerSegment`, `eligibleSegments`, `segmentLabel`, `bestSegment`, `isOnPolicy`, `Match`, `Candidate` are defined in Task 2 and used with identical signatures in Tasks 3/8/9; `targetSegment/pooledQty/pooledBranches/donated` column names are identical across Tasks 1, 5, 6, 7, 9, 11; `buyerSegment` defined and consumed consistently in Tasks 7 and 9.

No gaps found.
