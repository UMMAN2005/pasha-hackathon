import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { prisma } from "@/lib/db";
import { getToday } from "@/lib/clock";
import { recalcRiskService } from "@/server/services/recalc";
import { createListingFromRecommendation } from "@/server/services/listing";
import { acceptBid } from "@/server/services/auction";

const NAMESPACE = "bravo-hamiya-mvp";

function uuidv5(name: string): string {
  const ns = Buffer.from(NAMESPACE);
  const nameBuffer = Buffer.from(name, "utf8");
  const combined = Buffer.concat([ns, nameBuffer]);
  const hash = createHash("sha1").update(combined).digest();

  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  return [
    hash.subarray(0, 4).toString("hex"),
    hash.subarray(4, 6).toString("hex"),
    hash.subarray(6, 8).toString("hex"),
    hash.subarray(8, 10).toString("hex"),
    hash.subarray(10, 16).toString("hex"),
  ].join("-");
}

type BatchData = {
  sku: string;
  sales14: number[];
};

// Single source of truth for the PRD §18 product/batch dataset. Sales14 sums
// are authoritative (185/101/1236/98/95) and the per-day series is spread so
// avgFirst7≈avgLast7 → demandSlowdownFactor≈1.0 (reproduces §18 risk scores).
const PRODUCT_SPECS = [
  {
    sku: "DARY-YOG-500",
    name: "Greek Yogurt 500g",
    categoryId: uuidv5("cat-dairy"),
    branchId: uuidv5("branch-a"),
    qty: 120,
    expiry: new Date("2026-05-18T00:00:00.000Z"),
    costPerUnit: 180,
    retailPrice: 320,
    condition: "GOOD" as const,
    sales14: [14, 13, 13, 13, 14, 13, 13, 13, 13, 14, 13, 13, 13, 13],
  },
  {
    sku: "MEAT-CHK-1000",
    name: "Chicken Breast 1kg",
    categoryId: uuidv5("cat-meat"),
    branchId: uuidv5("branch-b"),
    qty: 45,
    expiry: new Date("2026-05-17T00:00:00.000Z"),
    costPerUnit: 650,
    retailPrice: 1190,
    condition: "CHECK_REQUIRED" as const,
    sales14: [8, 7, 7, 7, 8, 7, 7, 7, 7, 8, 7, 7, 7, 7],
  },
  {
    sku: "PROD-BAN-1000",
    name: "Bananas (kg)",
    categoryId: uuidv5("cat-produce"),
    branchId: uuidv5("branch-c"),
    qty: 230,
    expiry: new Date("2026-05-16T00:00:00.000Z"),
    costPerUnit: 90,
    retailPrice: 210,
    condition: "GOOD" as const,
    sales14: [89, 88, 88, 89, 88, 88, 88, 89, 88, 88, 89, 88, 88, 88],
  },
  {
    sku: "BAKE-CRS-6",
    name: "Croissants Pack",
    categoryId: uuidv5("cat-bakery"),
    branchId: uuidv5("branch-d"),
    qty: 80,
    expiry: new Date("2026-05-15T00:00:00.000Z"),
    costPerUnit: 140,
    retailPrice: 360,
    condition: "GOOD" as const,
    sales14: [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
  },
  {
    sku: "PACK-PST-500",
    name: "Pasta Sauce 500g",
    categoryId: uuidv5("cat-packaged"),
    branchId: uuidv5("branch-a"),
    qty: 300,
    expiry: new Date("2026-06-10T00:00:00.000Z"),
    costPerUnit: 150,
    retailPrice: 340,
    condition: "GOOD" as const,
    sales14: [7, 7, 7, 7, 6, 7, 7, 7, 7, 6, 7, 7, 7, 6],
  },
];

export function buildSeedData() {
  const today = getToday();

  const branches = [
    { id: uuidv5("branch-a"), name: "Bravo Branch A", city: "Baku", latitude: 40.4093, longitude: 49.8671 },
    { id: uuidv5("branch-b"), name: "Bravo Branch B", city: "Baku", latitude: 40.3950, longitude: 49.8820 },
    { id: uuidv5("branch-c"), name: "Bravo Branch C", city: "Ganja", latitude: 40.6828, longitude: 46.3606 },
    { id: uuidv5("branch-d"), name: "Bravo Branch D", city: "Sumqayit", latitude: 40.5897, longitude: 49.6686 },
  ];

  const categories = [
    { id: uuidv5("cat-dairy"), name: "Dairy", perishabilityLevel: 5 },
    { id: uuidv5("cat-meat"), name: "Meat", perishabilityLevel: 5 },
    { id: uuidv5("cat-produce"), name: "Produce", perishabilityLevel: 4 },
    { id: uuidv5("cat-bakery"), name: "Bakery", perishabilityLevel: 5 },
    { id: uuidv5("cat-packaged"), name: "Packaged", perishabilityLevel: 1 },
  ];

  const companies = [
    {
      id: uuidv5("company-bravo"),
      type: "BRAVO",
      legalName: "Bravo MMC",
      verificationStatus: "VERIFIED",
      reliabilityScore: 100,
      city: "Baku",
      latitude: 40.4093,
      longitude: 49.8671,
    },
    {
      id: uuidv5("company-astoria"),
      type: "BUYER",
      legalName: "Astoria Hotel",
      verificationStatus: "VERIFIED",
      reliabilityScore: 96,
      city: "Baku",
      latitude: 40.3777,
      longitude: 49.84,
    },
    {
      id: uuidv5("company-nar"),
      type: "BUYER",
      legalName: "Restoran Nar & Qrill",
      verificationStatus: "VERIFIED",
      reliabilityScore: 88,
      city: "Ganja",
      latitude: 40.67,
      longitude: 46.37,
    },
    {
      id: uuidv5("company-merkez"),
      type: "BUYER",
      legalName: "Kafe Mərkəz",
      verificationStatus: "VERIFIED",
      reliabilityScore: 74,
      city: "Sumqayit",
      latitude: 40.585,
      longitude: 49.672,
    },
  ];

  const users = [
    {
      id: uuidv5("user-aysel"),
      role: "HQ_ADMIN",
      name: "Aysel",
      email: "hq@bravo.az",
      companyId: uuidv5("company-bravo"),
      branchId: null,
    },
    {
      id: uuidv5("user-kamran"),
      role: "BRANCH_MANAGER",
      name: "Kamran",
      email: "mgr.a@bravo.az",
      companyId: uuidv5("company-bravo"),
      branchId: uuidv5("branch-a"),
    },
    {
      id: uuidv5("user-fin"),
      role: "FINANCE_ANALYST",
      name: "Finance",
      email: "fin@bravo.az",
      companyId: uuidv5("company-bravo"),
      branchId: null,
    },
    {
      id: uuidv5("user-astoria"),
      role: "BUSINESS_BUYER",
      name: "Astoria Hotel",
      email: "buyer@astoria.az",
      companyId: uuidv5("company-astoria"),
      branchId: null,
    },
    {
      id: uuidv5("user-ops"),
      role: "LOGISTICS_OPERATOR",
      name: "Logistics",
      email: "ops@bravo.az",
      companyId: uuidv5("company-bravo"),
      branchId: null,
    },
  ];

  const productSpecs = PRODUCT_SPECS;

  const products = productSpecs.map((p) => ({
    id: uuidv5(`prod-${p.sku}`),
    sku: p.sku,
    name: p.name,
    categoryId: p.categoryId,
    barcode: null,
    brand: null,
    unitSize: null,
    storageType: null,
    isActive: true,
  }));

  const batches: (typeof productSpecs[0] & { id: string; batchId: string })[] =
    productSpecs.map((p) => ({
      ...p,
      id: uuidv5(`batch-${p.sku}`),
      batchId: uuidv5(`batch-${p.sku}`),
      productId: uuidv5(`prod-${p.sku}`),
    }));

  return {
    branches,
    categories,
    companies,
    users,
    products,
    batches: batches.map((b) => ({
      sku: b.sku,
      sales14: b.sales14,
    })) as BatchData[],
  };
}

// ---- deterministic PRNG + helpers (no Math.random / Date.now) ----
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ri = (r: () => number, lo: number, hi: number) =>
  lo + Math.floor(r() * (hi - lo + 1));
const dayOffset = (today: Date, d: number) => {
  const x = new Date(today);
  x.setDate(x.getDate() + d);
  return x;
};

const CITY_COORD: Record<string, [number, number]> = {
  Baku: [40.4093, 49.8671],
  Sumqayit: [40.5897, 49.6686],
  Ganja: [40.6828, 46.3606],
  Mingachevir: [40.77, 47.0489],
  Lankaran: [38.7529, 48.8475],
  Shaki: [41.1975, 47.1706],
  Quba: [41.3614, 48.5128],
  Yevlakh: [40.619, 47.15],
};

const EXTRA_BRANCHES = [
  ["branch-e", "Bravo Branch E", "Mingachevir"],
  ["branch-f", "Bravo Branch F", "Lankaran"],
  ["branch-g", "Bravo Branch G", "Shaki"],
  ["branch-h", "Bravo Branch H", "Quba"],
  ["branch-i", "Bravo Branch I", "Yevlakh"],
  ["branch-j", "Bravo Branch J", "Baku"],
] as const;

const EXTRA_CATEGORIES = [
  ["cat-beverages", "Beverages", 2],
  ["cat-frozen", "Frozen", 2],
  ["cat-deli", "Deli", 4],
] as const;

const EXTRA_BUYERS: [string, string, string, number][] = [
  ["company-caspian", "Caspian Grill House", "Baku", 92],
  ["company-shirvan", "Shirvan Restaurant", "Baku", 81],
  ["company-firuze", "Firuzə Catering", "Baku", 69],
  ["company-old", "Old City Bistro", "Baku", 85],
  ["company-pekara", "Pekara Bakery Co", "Sumqayit", 77],
  ["company-mugam", "Muğam Lounge", "Ganja", 64],
  ["company-shah", "Shah Palace Hotel", "Baku", 95],
  ["company-zira", "Zira Fine Dining", "Baku", 90],
  ["company-cay", "Çay Evi Network", "Lankaran", 58],
  ["company-bahar", "Bahar Cafeteria", "Mingachevir", 72],
  ["company-qaynana", "Qaynana Kitchen", "Ganja", 66],
  ["company-park", "Park Inn Kitchen", "Baku", 88],
  ["company-sheki", "Sheki Halva House", "Shaki", 79],
];

// Generated product catalog (hero 5 stay in PRODUCT_SPECS).
const CATALOG: [string, string, number, number][] = [
  ["Milk 1L", "cat-dairy", 95, 175],
  ["Kefir 500ml", "cat-dairy", 78, 150],
  ["Butter 200g", "cat-dairy", 240, 420],
  ["White Cheese 500g", "cat-dairy", 360, 690],
  ["Ayran 500ml", "cat-dairy", 45, 95],
  ["Beef Mince 1kg", "cat-meat", 720, 1290],
  ["Lamb Chops 1kg", "cat-meat", 980, 1750],
  ["Sausages 500g", "cat-meat", 310, 560],
  ["Chicken Wings 1kg", "cat-meat", 420, 760],
  ["Tomatoes 1kg", "cat-produce", 70, 160],
  ["Cucumbers 1kg", "cat-produce", 60, 140],
  ["Apples 1kg", "cat-produce", 80, 180],
  ["Potatoes 2kg", "cat-produce", 90, 210],
  ["Strawberries 250g", "cat-produce", 180, 360],
  ["Lemons 1kg", "cat-produce", 120, 250],
  ["Tandir Bread", "cat-bakery", 35, 80],
  ["Baguette", "cat-bakery", 40, 95],
  ["Cake Slice", "cat-bakery", 150, 320],
  ["Donuts 4pk", "cat-bakery", 130, 280],
  ["Spaghetti 500g", "cat-packaged", 70, 150],
  ["Rice 1kg", "cat-packaged", 140, 260],
  ["Sunflower Oil 1L", "cat-packaged", 190, 340],
  ["Canned Beans 400g", "cat-packaged", 60, 130],
  ["Orange Juice 1L", "cat-beverages", 130, 260],
  ["Cola 1.5L", "cat-beverages", 90, 190],
  ["Mineral Water 6x0.5L", "cat-beverages", 110, 230],
  ["Iced Tea 1L", "cat-beverages", 95, 200],
  ["Frozen Pizza", "cat-frozen", 220, 430],
  ["Frozen Berries 500g", "cat-frozen", 240, 460],
  ["Ice Cream 1L", "cat-frozen", 200, 390],
  ["Olives 300g", "cat-deli", 160, 320],
  ["Hummus 250g", "cat-deli", 140, 290],
  ["Smoked Salmon 200g", "cat-deli", 520, 940],
];

export async function seedDatabase() {
  const today = getToday();
  const data = buildSeedData();

  await prisma.bid.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.marketplaceListing.deleteMany({});
  await prisma.recommendation.deleteMany({});
  await prisma.riskScore.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.salesTransaction.deleteMany({});
  await prisma.inventoryBatch.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.company.deleteMany({});

  // Branches (hero + extra)
  const branches = [
    ...data.branches,
    ...EXTRA_BRANCHES.map(([slug, name, city]) => ({
      id: uuidv5(slug),
      name,
      city,
      latitude: CITY_COORD[city][0],
      longitude: CITY_COORD[city][1],
    })),
  ];
  await prisma.branch.createMany({ data: branches });

  // Categories (hero + extra)
  await prisma.category.createMany({
    data: [
      ...data.categories,
      ...EXTRA_CATEGORIES.map(([slug, name, p]) => ({
        id: uuidv5(slug),
        name,
        perishabilityLevel: p,
      })),
    ],
  });

  // Companies (hero + extra buyers)
  const companies = [
    ...data.companies.map((c) => ({
      id: c.id,
      type: c.type,
      legalName: c.legalName,
      verificationStatus: c.verificationStatus,
      reliabilityScore: c.reliabilityScore,
      city: c.city,
      latitude: c.latitude,
      longitude: c.longitude,
    })),
    ...EXTRA_BUYERS.map(([slug, name, city, rel], i) => ({
      id: uuidv5(slug),
      type: "BUYER",
      legalName: name,
      verificationStatus: i % 7 === 0 ? "PENDING" : "VERIFIED",
      reliabilityScore: rel,
      city,
      latitude: CITY_COORD[city][0] + (i % 3) * 0.01,
      longitude: CITY_COORD[city][1] + (i % 2) * 0.01,
    })),
  ];
  await prisma.company.createMany({ data: companies });

  // Users (hero + a couple buyer logins + branch managers)
  const users = [
    ...data.users,
    {
      id: uuidv5("user-shah"),
      role: "BUSINESS_BUYER",
      name: "Shah Palace Hotel",
      email: "buyer@shah.az",
      companyId: uuidv5("company-shah"),
      branchId: null,
    },
    {
      id: uuidv5("user-mgr-c"),
      role: "BRANCH_MANAGER",
      name: "Nigar",
      email: "mgr.c@bravo.az",
      companyId: uuidv5("company-bravo"),
      branchId: uuidv5("branch-c"),
    },
  ];
  await prisma.user.createMany({ data: users });

  // Products (hero + generated catalog)
  const genProducts = CATALOG.map(([name, cat], idx) => {
    const sku = `GEN-${cat.slice(4, 7).toUpperCase()}-${(idx + 1)
      .toString()
      .padStart(3, "0")}`;
    return {
      id: uuidv5(`prod-${sku}`),
      sku,
      name,
      categoryId: uuidv5(cat),
      barcode: null,
      brand: null,
      unitSize: null,
      storageType: null,
      isActive: true,
      _cat: cat,
      _cost: CATALOG[idx][2],
      _retail: CATALOG[idx][3],
    };
  });
  await prisma.product.createMany({
    data: [
      ...data.products,
      ...genProducts.map(({ _cat, _cost, _retail, ...p }) => {
        void _cat;
        void _cost;
        void _retail;
        return p;
      }),
    ],
  });

  // Hero batches + 14-day sales (kept for the demo narrative)
  const heroBatches = PRODUCT_SPECS.map((spec) => ({
    id: uuidv5(`batch-${spec.sku}`),
    productId: uuidv5(`prod-${spec.sku}`),
    branchId: spec.branchId,
    lotNumber: `LOT-${spec.sku.slice(-3)}-${today
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}`,
    expiryDate: spec.expiry,
    quantityOnHand: spec.qty,
    costPerUnit: spec.costPerUnit,
    retailPrice: spec.retailPrice,
    conditionStatus: spec.condition,
  }));
  const sales: {
    productId: string;
    branchId: string;
    quantity: number;
    unitPrice: number;
    soldAt: Date;
  }[] = [];
  for (const spec of PRODUCT_SPECS) {
    for (let i = 0; i < 14; i++) {
      sales.push({
        productId: uuidv5(`prod-${spec.sku}`),
        branchId: spec.branchId,
        quantity: spec.sales14[i],
        unitPrice: spec.retailPrice,
        soldAt: dayOffset(today, i - 14),
      });
    }
  }

  // Generated batches: each product across 2-4 branches with varied risk
  const branchIds = branches.map((b) => b.id);
  const genBatches: typeof heroBatches = [];
  genProducts.forEach((p, pi) => {
    const r = rng(1000 + pi);
    const nB = ri(r, 2, 4);
    const used = new Set<number>();
    for (let k = 0; k < nB; k++) {
      let bi = ri(r, 0, branchIds.length - 1);
      while (used.has(bi)) bi = (bi + 1) % branchIds.length;
      used.add(bi);
      const qty = ri(r, 25, 420);
      const expDays = ri(r, 6, 16);
      const id = uuidv5(`gbatch-${p.sku}-${k}`);
      genBatches.push({
        id,
        productId: p.id,
        branchId: branchIds[bi],
        lotNumber: `LOT-${p.sku.slice(-3)}-${k}${pi}`,
        expiryDate: dayOffset(today, expDays),
        quantityOnHand: qty,
        costPerUnit: p._cost,
        retailPrice: p._retail,
        conditionStatus: r() < 0.08 ? "CHECK_REQUIRED" : "GOOD",
      });
      // Varied sell-through (~0.6%–5.6%/day) spreads risk across the
      // inventory instead of pinning everything at 100, while keeping a
      // healthy share high-risk for the auction queue.
      const sellRate = 0.006 + r() * 0.05;
      const base = Math.max(1, Math.round(qty * sellRate));
      for (let d = 0; d < 14; d++) {
        sales.push({
          productId: p.id,
          branchId: branchIds[bi],
          quantity: Math.max(0, base + ((d % 3) - 1) + (r() < 0.5 ? 1 : 0)),
          unitPrice: p._retail,
          soldAt: dayOffset(today, d - 14),
        });
      }
    }
  });

  await prisma.inventoryBatch.createMany({
    data: [...heroBatches, ...genBatches],
  });
  // chunk sales inserts (SQLite variable limit safety)
  for (let i = 0; i < sales.length; i += 200) {
    await prisma.salesTransaction.createMany({
      data: sales.slice(i, i + 200),
    });
  }

  console.log(
    `Seed: ${branches.length} branches, ${companies.length} companies, ${
      data.products.length + genProducts.length
    } products, ${heroBatches.length + genBatches.length} batches, ${
      sales.length
    } sales`
  );

  await recalcRiskService({ all: true });
  console.log("Recalc completed");

  await seedMarketplace(today);
  console.log("Marketplace, bids, orders & pickups seeded");
}

// Build a lively marketplace: hero ACTIVE auctions + many more,
// lots of bids, accepted orders and completed pickups.
async function seedMarketplace(today: Date) {
  const buyers = (
    await prisma.company.findMany({ where: { type: "BUYER" } })
  ).map((c) => ({ id: c.id, name: c.legalName }));

  const ACTIVE_TARGET = 6; // live auctions visible in the buyer market
  const QUEUE_TARGET = 10; // pending recommendations awaiting approval

  // Add a realistic bid ladder to a listing; returns the leading bid id.
  const addLadder = async (
    listingId: string,
    price: number,
    maxQty: number,
    seed: number
  ): Promise<string> => {
    const r = rng(seed);
    const n = ri(r, 2, 6);
    const base = Math.round(price * (0.78 + r() * 0.12));
    const rows = [];
    let leadId = "";
    for (let k = 0; k < n; k++) {
      const buyer = buyers[ri(r, 0, buyers.length - 1)];
      const id = uuidv5(`gbid-${listingId}-${k}`);
      if (k === n - 1) leadId = id;
      rows.push({
        id,
        listingId,
        buyerCompanyId: buyer.id,
        buyerName: buyer.name,
        pricePerUnit: base + k * Math.max(30, Math.round(price * 0.04)),
        quantity: ri(r, 5, Math.max(6, Math.min(maxQty, 60))),
        status: k === n - 1 ? "LEADING" : "OUTBID",
      });
    }
    await prisma.bid.createMany({ data: rows });
    return leadId;
  };

  let activeCount = 0;
  // Every live (6) + queued (10) product must be a distinct product.
  const usedProducts = new Set<string>();

  // 1) Hero ACTIVE auctions with a clean, readable bid ladder.
  const heroSkus = ["DARY-YOG-500", "MEAT-CHK-1000"];
  for (const sku of heroSkus) {
    const rec = await prisma.recommendation.findFirst({
      where: { status: "PENDING", batch: { product: { sku } } },
      include: { batch: { include: { product: true } } },
    });
    if (!rec) continue;
    usedProducts.add(rec.batch.product.id);
    const listing = await createListingFromRecommendation(rec.id, {
      id: "seed",
      name: "Seed",
    });
    const base = Math.round(listing.price * 0.82);
    const step = Math.max(40, Math.round(listing.price * 0.05));
    const ladder =
      sku === "DARY-YOG-500"
        ? [
            { b: buyers[2], p: base, q: 30 },
            { b: buyers[1], p: base + step, q: 40 },
            { b: buyers[0], p: base + step * 2, q: 50 },
          ]
        : [
            { b: buyers[1], p: base, q: 12 },
            { b: buyers[0], p: base + step, q: 20 },
          ];
    await prisma.bid.createMany({
      data: ladder.map((x, i) => ({
        listingId: listing.id,
        buyerCompanyId: x.b.id,
        buyerName: x.b.name,
        pricePerUnit: x.p,
        quantity: x.q,
        status: i === ladder.length - 1 ? "LEADING" : "OUTBID",
      })),
    });
    activeCount++;
  }

  // 2) Fill the buyer market up to ACTIVE_TARGET with the strongest
  //    recs — one per distinct product.
  const activeRecs = await prisma.recommendation.findMany({
    where: { status: "PENDING", actionType: { in: ["LIST_B2B", "BUNDLE"] } },
    include: { batch: { include: { product: true } } },
    orderBy: { expectedRecovery: "desc" },
    take: 300,
  });
  for (const rec of activeRecs) {
    if (activeCount >= ACTIVE_TARGET) break;
    if (heroSkus.includes(rec.batch.product.sku)) continue;
    if (usedProducts.has(rec.batch.product.id)) continue;
    let listing;
    try {
      listing = await createListingFromRecommendation(rec.id, {
        id: "seed",
        name: "Seed",
      });
    } catch {
      continue;
    }
    usedProducts.add(rec.batch.product.id);
    await addLadder(
      listing.id,
      listing.price,
      listing.maxQty,
      7000 + activeCount
    );
    activeCount++;
  }

  // 3) Reserve QUEUE_TARGET distinct-product recs for the live AI queue
  //    (left PENDING). List & accept a capped set of the rest as
  //    historical KPI volume; anything beyond is trimmed in step 4.
  const HIST_TARGET = 20;
  const remainingRecs = await prisma.recommendation.findMany({
    where: { status: "PENDING", actionType: { in: ["LIST_B2B", "BUNDLE"] } },
    include: { batch: { include: { product: true } } },
    orderBy: { expectedRecovery: "desc" },
  });
  const reservedIds: string[] = [];
  let hi = 0;
  for (const rec of remainingRecs) {
    const pid = rec.batch.product.id;
    if (reservedIds.length < QUEUE_TARGET && !usedProducts.has(pid)) {
      usedProducts.add(pid);
      reservedIds.push(rec.id); // stays PENDING — this is the AI queue
      continue;
    }
    if (hi >= HIST_TARGET) continue; // surplus is trimmed in step 4
    let listing;
    try {
      listing = await createListingFromRecommendation(rec.id, {
        id: "seed",
        name: "Seed",
      });
    } catch {
      continue;
    }
    const leadId = await addLadder(
      listing.id,
      listing.price,
      listing.maxQty,
      9000 + hi
    );
    try {
      await acceptBid(leadId, { id: uuidv5("user-aysel"), name: "Aysel" });
    } catch {
      /* listing race — skip */
    }
    hi++;
  }

  // Complete pickups on most accepted orders so KPIs & impact are rich.
  const orders = await prisma.order.findMany({
    where: { status: "RESERVED" },
    include: { listing: { include: { batch: true } } },
    orderBy: { createdAt: "asc" },
  });
  let oi = 0;
  for (const o of orders) {
    if (oi % 4 === 0) {
      oi++;
      continue;
    } // leave some reserved
    const ago = oi % 5 === 0 ? 0 : oi % 3; // several picked up "today"
    await prisma.order.update({
      where: { id: o.id },
      data: { status: "PICKED_UP", pickedUpAt: dayOffset(today, -ago) },
    });
    await prisma.inventoryBatch.update({
      where: { id: o.listing.batchId },
      data: {
        quantityOnHand: { decrement: o.quantity },
        quantityReserved: { decrement: o.quantity },
      },
    });
    await prisma.auditLog.create({
      data: {
        actorName: "Logistics",
        entityType: "Order",
        entityId: o.id,
        action: "PICKUP_CONFIRM",
        metadata: JSON.stringify({ qty: o.quantity }),
        createdAt: dayOffset(today, -ago),
      },
    });
    oi++;
  }

  // 4) Keep exactly the reserved distinct-product recs as the AI queue.
  await prisma.recommendation.deleteMany({
    where: { status: "PENDING", id: { notIn: reservedIds } },
  });
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  seedDatabase()
    .then(() => {
      console.log("Seed finished");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
