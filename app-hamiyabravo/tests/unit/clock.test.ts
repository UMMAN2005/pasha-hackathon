import { describe, it, expect } from "vitest";
import { getToday } from "@/lib/clock";

describe("clock", () => {
  it("returns DEMO_TODAY pinned date at UTC midnight", () => {
    process.env.DEMO_TODAY = "2026-05-15";
    const d = getToday();
    expect(d.toISOString()).toBe("2026-05-15T00:00:00.000Z");
  });
});
