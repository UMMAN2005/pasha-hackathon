import { describe, it, expect } from "vitest";
import { buildSeedData } from "@/../prisma/seed";

describe("seed", () => {
  it("is deterministic and reproduces PRD §18 dataset", () => {
    const a = buildSeedData();
    const b = buildSeedData();
    expect(a).toEqual(b);
    expect(a.products).toHaveLength(5);
    const yog = a.batches.find((x) => x.sku === "DARY-YOG-500")!;
    expect(yog.sales14.reduce((s, n) => s + n, 0)).toBe(185);
    expect(a.companies.some((c) => c.legalName === "Astoria Hotel")).toBe(true);
  });
});
