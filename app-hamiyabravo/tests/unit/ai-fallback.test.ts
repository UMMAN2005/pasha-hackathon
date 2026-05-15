import { describe, it, expect, beforeEach } from "vitest";
import { explainRecommendation, type ExplainInput, type BatchContext } from "@/server/ai/explain";
import { narrateEvent } from "@/server/ai/narrate";

describe("AI fallback (offline-safe)", () => {
  beforeEach(() => {
    process.env.AI_ENABLED = "false";
  });

  it("explain falls back to deterministic reason", async () => {
    const rec: ExplainInput = { reason: "Yüksək risk — B2B siyahıya əlavə et" };
    const batch: BatchContext = {};
    const out = await explainRecommendation(rec, batch);
    expect(out).toBe("Yüksək risk — B2B siyahıya əlavə et");
  });

  it("narrate falls back to template", async () => {
    const out = await narrateEvent({
      type: "pickup",
      product: "Yunan qatığı 500q",
      qty: 120,
      buyer: "Astoria Hotel",
      recovered: "1 248 ₼",
    });
    expect(out).toContain("Astoria Hotel");
    expect(out).toContain("120");
    expect(out).toContain("heç nə xarab olmadı");
  });
});
