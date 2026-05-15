import { describe, it, expect } from "vitest";
import { recommend, discountPercent, listingUnitPrice } from "@/domain/decision";

describe("discount ladder", () => {
  it("bands per 05-ai-spec §3", () => {
    expect(discountPercent(95)).toBe(45);
    expect(discountPercent(86)).toBe(40);
    expect(discountPercent(72)).toBe(30);
    expect(discountPercent(55)).toBe(20);
    expect(discountPercent(41)).toBe(0);
  });
  it("never prices below cost", () => {
    expect(listingUnitPrice(320, 180, 45)).toBe(180); // floor at cost
    expect(listingUnitPrice(320, 180, 40)).toBe(192);
  });
});

describe("decision engine (PRD §11.3 / §18)", () => {
  const b = (o: Partial<Parameters<typeof recommend>[0]> = {}) =>
    recommend({ riskScore: 86, quantityOnHand: 120, category: "Dairy", condition: "GOOD", ...o });

  it("Yogurt 86/120/Dairy → LIST_B2B", () => expect(b().actionType).toBe("LIST_B2B"));
  it("Chicken 92 CHECK_REQUIRED → LIST_B2B + complianceGate", () => {
    const r = b({ riskScore: 92, quantityOnHand: 45, category: "Meat", condition: "CHECK_REQUIRED" });
    expect(r.actionType).toBe("LIST_B2B");
    expect(r.complianceGate).toBe(true);
    expect(r.priority).toBe(1);
  });
  it("Bananas 88/230/Produce → BUNDLE", () =>
    expect(b({ riskScore: 88, quantityOnHand: 230, category: "Produce" }).actionType).toBe("BUNDLE"));
  it("Croissants 100/80/Bakery (qty<100) → LIST_B2B", () =>
    expect(b({ riskScore: 100, quantityOnHand: 80, category: "Bakery" }).actionType).toBe("LIST_B2B"));
  it("Pasta 41 → KEEP", () => expect(b({ riskScore: 41 }).actionType).toBe("KEEP"));
  it("UNSAFE → DISPOSE blocked", () =>
    expect(b({ condition: "UNSAFE" }).actionType).toBe("DISPOSE"));
  it("mid risk → IN_STORE_DISCOUNT", () =>
    expect(b({ riskScore: 60 }).actionType).toBe("IN_STORE_DISCOUNT"));
});
