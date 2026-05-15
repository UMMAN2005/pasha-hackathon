import { describe, it, expect } from "vitest";
import { getPublicListings, getPublicListing } from "@/server/services/market";

describe("market privacy", () => {
  it("never leaks internal fields to buyers", async () => {
    const list = await getPublicListings();
    for (const l of list) {
      const keys = Object.keys(l);
      for (const banned of [
        "costPerUnit",
        "riskScore",
        "expectedLoss",
        "cost",
        "lotNumber",
        "conditionStatus",
      ])
        expect(keys).not.toContain(banned);
      expect(keys).not.toContain("expiryDate");
    }
  });

  it("single listing hides internal fields", async () => {
    const listings = await getPublicListings();
    if (listings.length === 0) return;
    const l = await getPublicListing(listings[0].id);
    const keys = Object.keys(l);
    expect(keys).not.toContain("costPerUnit");
    expect(keys).not.toContain("riskScore");
    expect(keys).not.toContain("expiryDate");
  });
});
