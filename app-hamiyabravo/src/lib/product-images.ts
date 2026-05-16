// Curated product photos. Put up to ~10 image files in /public/products
// and map them below — by exact SKU and/or by category. Nothing is ever
// auto-assigned at "random": any product you haven't mapped shows a clean
// neutral placeholder until you add a real image for it.
//
// HOW TO ADD YOUR OWN IMAGES (max ~10):
//   1. Drop files into app-hamiyabravo/public/products/  (e.g. yogurt.jpg)
//   2. Uncomment / fill the entries below pointing at "/products/<file>"
//   3. npm run build && npm run start
//
// Seed SKUs you may want to map:
//   Heroes: DARY-YOG-500, MEAT-CHK-1000, PROD-BAN-1000, BAKE-CRS-6, PACK-PST-500
//   Generated: GEN-DAI-### , GEN-MEA-### , GEN-PRD-### , GEN-BAK-### , GEN-PAC-###
// Categories: Dairy | Meat | Produce | Bakery | Packaged

const PLACEHOLDER = "/products/placeholder.svg";

// Exact product SKU → image (highest priority). Keep this small (≤10).
const BY_SKU: Record<string, string> = {
  // "DARY-YOG-500": "/products/yogurt.jpg",
  // "MEAT-CHK-1000": "/products/chicken.jpg",
  // "PROD-BAN-1000": "/products/bananas.jpg",
  // "BAKE-CRS-6": "/products/croissant.jpg",
  // "PACK-PST-500": "/products/pasta-sauce.jpg",
};

// Category name → image (fallback when a SKU is not mapped above).
const BY_CATEGORY: Record<string, string> = {
  // Dairy: "/products/dairy.jpg",
  // Meat: "/products/meat.jpg",
  // Produce: "/products/produce.jpg",
  // Bakery: "/products/bakery.jpg",
  // Packaged: "/products/packaged.jpg",
};

// `key` may be a SKU, a category name, or a product name depending on the
// call site — we look it up explicitly and never guess.
export function productImage(key?: string | null): string {
  if (!key) return PLACEHOLDER;
  return BY_SKU[key] ?? BY_CATEGORY[key] ?? PLACEHOLDER;
}
