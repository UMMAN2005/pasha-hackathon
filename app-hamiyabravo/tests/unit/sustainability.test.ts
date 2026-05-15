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
