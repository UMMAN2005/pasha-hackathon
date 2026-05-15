import { describe, it, expect } from "vitest";
import { scoreBatch } from "@/domain/risk";

const base = {
  quantityOnHand: 120,
  costPerUnit: 180,
  expiryDate: new Date("2026-05-18T00:00:00.000Z"),
  today: new Date("2026-05-15T00:00:00.000Z"),
  sales14: Array(14).fill(185 / 14), // flat-ish, sum 185
};

describe("scoreBatch", () => {
  it("Greek Yogurt vector → risk 86 (PRD §18)", () => {
    const r = scoreBatch(base);
    expect(r.riskScore).toBe(86);
    expect(r.expectedLoss).toBe(80 * 180); // 14400 qəpik
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });
  it("day-0 batch saturates at 100", () => {
    const r = scoreBatch({ ...base, expiryDate: base.today, sales14: Array(14).fill(7) });
    expect(r.riskScore).toBe(100);
  });
  it("far expiry, strong sales → low risk (<50)", () => {
    const r = scoreBatch({ ...base, quantityOnHand: 300, costPerUnit: 150,
      expiryDate: new Date("2026-06-10T00:00:00.000Z"), sales14: Array(14).fill(95 / 14) });
    expect(r.riskScore).toBeLessThan(50);
  });
  it("clamps probability to [0,1]", () => {
    const r = scoreBatch({ ...base, sales14: Array(14).fill(0) });
    expect(r.riskScore).toBeLessThanOrEqual(100);
    expect(r.riskScore).toBeGreaterThanOrEqual(0);
  });
});
