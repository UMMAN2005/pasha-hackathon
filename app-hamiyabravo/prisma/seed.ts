import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { prisma } from "@/lib/db";
import { getToday } from "@/lib/clock";
import { recalcRiskService } from "@/server/services/recalc";
import { createListingFromRecommendation } from "@/server/services/listing";

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
    { id: uuidv5("branch-a"), name: "Bravo Branch A", city: "Baku" },
    { id: uuidv5("branch-b"), name: "Bravo Branch B", city: "Baku" },
    { id: uuidv5("branch-c"), name: "Bravo Branch C", city: "Ganja" },
    { id: uuidv5("branch-d"), name: "Bravo Branch D", city: "Sumqayit" },
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
    },
    {
      id: uuidv5("company-astoria"),
      type: "BUYER",
      legalName: "Astoria Hotel",
      verificationStatus: "VERIFIED",
      reliabilityScore: 96,
    },
    {
      id: uuidv5("company-nar"),
      type: "BUYER",
      legalName: "Restoran Nar & Qrill",
      verificationStatus: "VERIFIED",
      reliabilityScore: 88,
    },
    {
      id: uuidv5("company-merkez"),
      type: "BUYER",
      legalName: "Kafe Mərkəz",
      verificationStatus: "VERIFIED",
      reliabilityScore: 74,
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

  for (const branch of data.branches) {
    await prisma.branch.create({ data: branch });
  }

  for (const category of data.categories) {
    await prisma.category.create({ data: category });
  }

  for (const company of data.companies) {
    await prisma.company.create({
      data: {
        id: company.id,
        type: company.type,
        legalName: company.legalName,
        verificationStatus: company.verificationStatus,
        reliabilityScore: company.reliabilityScore,
      },
    });
  }

  for (const user of data.users) {
    await prisma.user.create({
      data: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        companyId: user.companyId,
        branchId: user.branchId,
      },
    });
  }

  for (const product of data.products) {
    await prisma.product.create({ data: product });
  }

  for (const spec of PRODUCT_SPECS) {
    const batch = await prisma.inventoryBatch.create({
      data: {
        id: uuidv5(`batch-${spec.sku}`),
        productId: uuidv5(`prod-${spec.sku}`),
        branchId: spec.branchId,
        lotNumber: `LOT-${spec.sku.substring(spec.sku.length - 3)}-${today
          .toISOString()
          .substring(0, 10)
          .replace(/-/g, "")}`,
        expiryDate: spec.expiry,
        quantityOnHand: spec.qty,
        costPerUnit: spec.costPerUnit,
        retailPrice: spec.retailPrice,
        conditionStatus: spec.condition,
      },
    });

    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    for (let i = 0; i < 14; i++) {
      const saleDate = new Date(fourteenDaysAgo);
      saleDate.setDate(saleDate.getDate() + i);

      await prisma.salesTransaction.create({
        data: {
          productId: uuidv5(`prod-${spec.sku}`),
          branchId: spec.branchId,
          quantity: spec.sales14[i],
          unitPrice: spec.retailPrice,
          soldAt: saleDate,
        },
      });
    }
  }

  console.log(
    "Seed completed: 4 branches, 5 categories, 4 companies, 5 users, 5 products, 5 batches, 70 SalesTransaction"
  );

  await recalcRiskService({ all: true });
  console.log("Recalc completed: RiskScore and Recommendation rows created");

  await seedLiveAuctions();
  console.log("Demo auctions + live bids seeded");
}

// Pre-open a couple of auctions with bids so the marketplace looks alive.
async function seedLiveAuctions() {
  const buyers = [
    { id: uuidv5("company-astoria"), name: "Astoria Hotel" },
    { id: uuidv5("company-nar"), name: "Restoran Nar & Qrill" },
    { id: uuidv5("company-merkez"), name: "Kafe Mərkəz" },
  ];

  // Approve the two hottest recommendations into live listings.
  for (const sku of ["DARY-YOG-500", "MEAT-CHK-1000"]) {
    const rec = await prisma.recommendation.findFirst({
      where: {
        status: "PENDING",
        batch: { product: { sku } },
      },
    });
    if (!rec) continue;
    const listing = await createListingFromRecommendation(rec.id, {
      id: "seed",
      name: "Seed",
    });

    // A small ladder of bids: last one is LEADING (highest).
    const base = Math.round(listing.price * 0.82);
    const step = Math.max(40, Math.round(listing.price * 0.05));
    const ladder =
      sku === "DARY-YOG-500"
        ? [
            { buyer: buyers[2], price: base, qty: 30 },
            { buyer: buyers[1], price: base + step, qty: 40 },
            { buyer: buyers[0], price: base + step * 2, qty: 50 },
          ]
        : [
            { buyer: buyers[1], price: base, qty: 12 },
            { buyer: buyers[0], price: base + step, qty: 20 },
          ];

    for (let i = 0; i < ladder.length; i++) {
      const b = ladder[i];
      const leading = i === ladder.length - 1;
      await prisma.bid.create({
        data: {
          listingId: listing.id,
          buyerCompanyId: b.buyer.id,
          buyerName: b.buyer.name,
          pricePerUnit: b.price,
          quantity: b.qty,
          status: leading ? "LEADING" : "OUTBID",
        },
      });
    }
  }
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
