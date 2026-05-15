import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HeroNumber } from "@/components/hero-number";

describe("HeroNumber", () => {
  it("renders formatted hero number and label", () => {
    render(<HeroNumber qapik={1284000} label="Bu gün bərpa olundu" />);
    expect(screen.getByText("12 840 ₼")).toBeInTheDocument();
    expect(screen.getByText("Bu gün bərpa olundu")).toBeInTheDocument();
  });
});
