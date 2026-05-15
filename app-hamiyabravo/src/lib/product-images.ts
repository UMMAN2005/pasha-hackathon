// Maps a product SKU to a local photo in /public/products.
// Falls back to a deterministic photo so the UI is never empty.

const BY_SKU: Record<string, string> = {
  "DARY-YOG-500": "/products/yogurt.jpg",
  "MEAT-CHK-1000": "/products/chicken.jpg",
  "PROD-BAN-1000": "/products/bananas.jpg",
  "BAKE-CRS-6": "/products/croissant.jpg",
  "PACK-PST-500": "/products/pasta-sauce.jpg",
};

const ROTATION = [
  "/products/yogurt.jpg",
  "/products/chicken.jpg",
  "/products/bananas.jpg",
  "/products/croissant.jpg",
  "/products/pasta-sauce.jpg",
];

export function productImage(sku?: string | null): string {
  if (sku && BY_SKU[sku]) return BY_SKU[sku];
  if (!sku) return ROTATION[0];
  let h = 0;
  for (let i = 0; i < sku.length; i++) h = (h * 31 + sku.charCodeAt(i)) >>> 0;
  return ROTATION[h % ROTATION.length];
}
