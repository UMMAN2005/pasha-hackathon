import { describe, it, expect, beforeEach } from "vitest";

describe("POST /api/chat (offline fallback)", () => {
  beforeEach(() => {
    process.env.AI_ENABLED = "false";
  });

  it("returns offline fallback chunk when AI unavailable", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const req = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "salam" }],
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toContain("AI köməkçi hazırda oflayndır");
  });
});
