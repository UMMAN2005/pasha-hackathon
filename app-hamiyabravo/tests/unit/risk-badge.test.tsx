import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RiskBadge } from "@/components/risk-badge";

describe("RiskBadge", () => {
  it("renders risk band 86 as Kritik", () => {
    render(<RiskBadge score={86} />);
    expect(screen.getByText("Kritik")).toBeInTheDocument();
  });

  it("renders risk band 65 as Yüksək", () => {
    render(<RiskBadge score={65} />);
    expect(screen.getByText("Yüksək")).toBeInTheDocument();
  });

  it("renders risk band 45 as İzlə", () => {
    render(<RiskBadge score={45} />);
    expect(screen.getByText("İzlə")).toBeInTheDocument();
  });

  it("renders risk band 30 as Sabit", () => {
    render(<RiskBadge score={30} />);
    expect(screen.getByText("Sabit")).toBeInTheDocument();
  });
});
