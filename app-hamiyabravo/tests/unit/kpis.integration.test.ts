import { describe, it, expect, beforeAll } from "vitest";
import { getKpisService } from "@/server/services/kpis";
import { seedDatabase } from "@/../prisma/seed";

describe("kpis", () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it("returns zeroed impact on a fresh seed (no pickups yet)", async () => {
    const k = await getKpisService();
    expect(k.moneyRecoveredToday).toBe(0);
    expect(k.openRecommendations).toBeGreaterThanOrEqual(5);
    expect(k.atRisk.length).toBeGreaterThanOrEqual(5);
  });
});
