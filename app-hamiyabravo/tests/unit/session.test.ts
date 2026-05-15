import { describe, it, expect } from "vitest";
import { isBravoRole, isBuyer, roleHome } from "@/lib/session";

describe("rbac", () => {
  it("classifies roles", () => {
    expect(isBravoRole("HQ_ADMIN")).toBe(true);
    expect(isBuyer("BUSINESS_BUYER")).toBe(true);
    expect(isBravoRole("BUSINESS_BUYER")).toBe(false);
  });
  it("routes role to home", () => {
    expect(roleHome("BUSINESS_BUYER")).toBe("/marketplace");
    expect(roleHome("HQ_ADMIN")).toBe("/admin");
  });
});
