import { daysBetween } from "@/lib/clock";

export const U_WINDOW = 7;
export const URGENCY_BOOST = 0.5;
export const SLOWDOWN_MIN = 1;
export const SLOWDOWN_MAX = 1.5;

export type ScoreInput = {
  quantityOnHand: number;
  costPerUnit: number;
  expiryDate: Date;
  today: Date;
  sales14: number[]; // length 14, oldest→newest
};
export type ScoreResult = {
  riskScore: number;
  expectedUnsoldQty: number;
  expectedLoss: number;
  confidence: number;
  wasteProbability: number;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function scoreBatch(i: ScoreInput): ScoreResult {
  const daysToExpiry = Math.max(daysBetween(i.expiryDate, i.today), 0);
  const sales14 = i.sales14.reduce((a, b) => a + b, 0);
  const avgDaily = sales14 / 14;
  const projected = avgDaily * daysToExpiry;
  const expectedUnsold = Math.max(i.quantityOnHand - projected, 0);
  const baseProb = i.quantityOnHand > 0 ? expectedUnsold / i.quantityOnHand : 0;
  const urgency = 1 + URGENCY_BOOST * (Math.max(0, U_WINDOW - daysToExpiry) / U_WINDOW);
  const first7 = i.sales14.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
  const last7 = i.sales14.slice(7).reduce((a, b) => a + b, 0) / 7;
  const slowdown = clamp(first7 / Math.max(last7, 0.0001), SLOWDOWN_MIN, SLOWDOWN_MAX);
  const wasteProbability = clamp(baseProb * urgency * slowdown, 0, 1);
  const expectedUnsoldQty = Math.round(expectedUnsold);
  const confidence = Math.round(clamp(0.5 + 0.5 * (Math.min(i.sales14.length, 14) / 14), 0, 0.99) * 100) / 100;
  return {
    riskScore: Math.round(wasteProbability * 100),
    expectedUnsoldQty,
    expectedLoss: expectedUnsoldQty * i.costPerUnit,
    confidence,
    wasteProbability,
  };
}
