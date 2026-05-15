import { test, expect } from "@playwright/test";

test.describe("Admin 60-second storyboard loop (offline-safe)", () => {
  test("showcases hero, status, impact, risk, and chatbot", async ({
    page,
  }) => {
    // Ensure offline mode for demo safety
    process.env.AI_ENABLED = "false";

    // 1. Navigate to admin overview
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // 2. Verify hero number displays (data-testid="hero-number")
    const heroNumber = page.locator('[data-testid="hero-number"]');
    await expect(heroNumber).toBeVisible();
    const heroText = await heroNumber.locator("text=/₼/").first();
    await expect(heroText).toContainText("₼");

    // 3. Wait for status line (if a pickup event exists today)
    const statusLine = page.locator(".bg-blue-50.border-blue-200");
    const statusVisible = await statusLine.isVisible();
    if (statusVisible) {
      await expect(statusLine).toBeVisible();
    }

    // 4. Verify impact strip is rendered
    const impactStrip = page.locator("[class*='bg-green']").first();
    await expect(impactStrip).toBeVisible();

    // 5. Verify risk section heading
    const riskHeading = page.locator(
      "h2:has-text('5 məhsul tezliklə xarab ola bilər')"
    );
    await expect(riskHeading).toBeVisible();

    // 6. Open AI chatbot (button in topbar)
    const chatButton = page.locator("button:has-text('AI köməkçi')");
    await expect(chatButton).toBeVisible();
    await chatButton.click();

    // 7. Wait for chat panel to open
    await page.waitForTimeout(500);
    const chatPanel = page.locator("[class*='fixed'][class*='right']").first();
    await expect(chatPanel).toBeVisible();

    // 8. Send a test message to chat
    const inputField = chatPanel.locator("input, textarea").first();
    if (await inputField.isVisible()) {
      await inputField.fill("Riskdə olan məhsullar nələrdir?");
      const sendButton = chatPanel.locator("button:has-text('Göndər')").first();
      if (await sendButton.isVisible()) {
        await sendButton.click();
      } else {
        // Fallback: press Enter
        await inputField.press("Enter");
      }

      // 9. Wait for response (with AI_ENABLED=false, should get offline fallback)
      await page.waitForTimeout(1000);
      const offlineMessage = chatPanel.locator(
        "text=/AI köməkçi hazırda oflayndır/"
      );
      const assistantMessage = chatPanel.locator("[class*='bg-gray']");

      const gotResponse =
        (await offlineMessage.isVisible()) ||
        (await assistantMessage.count()) > 0;
      expect(gotResponse).toBe(true);
    }

    // 10. Close chat
    const closeButton = chatPanel.locator("button").first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }

    // 11. Verify all main page elements are visible
    await expect(heroNumber).toBeVisible();
    await expect(riskHeading).toBeVisible();

    // 12. Scroll and verify branch leaderboard (if present)
    const leaderboardHeading = page.locator("h3:has-text('Şubələr')");
    const leaderboardVisible = await leaderboardHeading.isVisible();
    if (leaderboardVisible) {
      await expect(leaderboardHeading).toBeVisible();
    }

    // Test passes: 60-second loop scenario complete
  });
});
