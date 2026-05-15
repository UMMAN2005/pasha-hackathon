import { describe, it, expect, beforeAll } from "vitest";
import { recalcRiskService } from "@/server/services/recalc";
import { prisma } from "@/lib/db";

describe("recalc (integration, needs seeded DB)", () => {
  beforeAll(async () => {
    await recalcRiskService({ all: true });
  });

  it("reproduces PRD §18 scores within ±2 and correct ordering", async () => {
    const rows = await prisma.riskScore.findMany({
      include: { batch: { include: { product: true } } },
    });
    const by = (sku: string) =>
      rows.find((r) => r.batch.product.sku === sku)!.riskScore;

    expect(by("DARY-YOG-500")).toBeGreaterThanOrEqual(84);
    expect(by("DARY-YOG-500")).toBeLessThanOrEqual(88);
    expect(by("PACK-PST-500")).toBeLessThan(50);
    expect(by("BAKE-CRS-6")).toBeGreaterThanOrEqual(by("MEAT-CHK-1000"));
    expect(by("MEAT-CHK-1000")).toBeGreaterThanOrEqual(by("DARY-YOG-500"));
  });

  it("creates a recommendation + audit per batch", async () => {
    expect(await prisma.recommendation.count()).toBeGreaterThanOrEqual(5);
    expect(
      await prisma.auditLog.count({ where: { action: "RECALC" } })
    ).toBeGreaterThan(0);
  });
});
