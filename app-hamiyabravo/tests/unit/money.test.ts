import { describe, it, expect } from "vitest";
import { formatAzn, azn } from "@/lib/money";

describe("money", () => {
  it("formats qəpik as AZN with space thousands", () => {
    expect(formatAzn(1284000)).toBe("12 840 ₼");
    expect(formatAzn(0)).toBe("0 ₼");
    expect(formatAzn(50)).toBe("0,50 ₼");
  });

  it("azn() converts manat to qəpik", () => {
    expect(azn(12.5)).toBe(1250);
  });
});
