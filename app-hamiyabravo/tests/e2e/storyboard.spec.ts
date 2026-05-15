import { test, expect } from "@playwright/test";

// The 60-second money loop, offline-safe (AI_ENABLED=false via playwright.config).
// predict → approve (Kamran) → reserve (Astoria) → confirm pickup (Kamran) → impact.
// State-changing steps (approve / reserve / confirm) are driven through the real
// UI; pure surface-to-surface navigation uses goto for deterministic timing
// (Next <Link> SPA nav is hydration-flaky under automation; the CTA's presence
// is still asserted so the storyboard UI is verified).
test.describe("60-second money loop", () => {
  test("Kamran approves yogurt, Astoria reserves, Kamran confirms pickup, impact rises", async ({
    page,
  }) => {
    const PRODUCT = "Greek Yogurt 500g";

    // Step 1 — log in as Kamran (Branch A manager)
    await page.goto("/select-user");
    await page.getByText("Kamran", { exact: true }).click();
    await page.waitForURL("**/admin");
    await expect(page.getByText("Bu gün bərpa olundu")).toBeVisible();
    // CTA is present in the UI (storyboard fidelity), then navigate.
    await expect(
      page.getByRole("link", { name: /AI növbəsinə bax/ })
    ).toBeVisible();

    // Step 2 — AI action queue: approve the Greek Yogurt recommendation
    await page.goto("/admin/recommendations");
    const yogurtRow = page
      .locator("div.rounded-xl")
      .filter({ has: page.getByRole("heading", { name: PRODUCT }) });
    await expect(yogurtRow).toBeVisible();
    await yogurtRow.getByRole("button", { name: "Təsdiqlə" }).click();
    // Server action + revalidate persisted → reload shows it left PENDING.
    await expect(yogurtRow.getByRole("button", { name: "Hazırlanan..." }))
      .toHaveCount(0, { timeout: 15000 });
    await page.goto("/admin/recommendations");
    await expect(yogurtRow).toHaveCount(0);

    // Step 3 — switch to the buyer (Astoria Hotel)
    await page.goto("/select-user");
    await page.getByText("Astoria Hotel", { exact: true }).click();
    await page.waitForURL("**/marketplace");

    // Step 4 — open the Greek Yogurt listing
    const yogurtCard = page
      .locator('[data-testid="listing-card"]')
      .filter({ hasText: PRODUCT });
    await expect(yogurtCard.first()).toBeVisible();
    await yogurtCard.first().click();
    await page.waitForURL(/\/marketplace\/.+/);
    await expect(page.getByRole("heading", { name: PRODUCT })).toBeVisible();

    // Step 5 — reserve, capture the pickup code
    await page.getByRole("button", { name: "Sifariş et" }).click();
    const pickupCode = page.locator('[data-testid="pickup-code"]');
    await expect(pickupCode).toBeVisible({ timeout: 15000 });
    const code = (await pickupCode.textContent())?.trim() ?? "";
    expect(code).toMatch(/^[A-Z0-9]{6}$/);

    // Step 6 — back to Kamran, confirm pickup at Marketplace Control
    await page.goto("/select-user");
    await page.getByText("Kamran", { exact: true }).click();
    await page.waitForURL("**/admin");
    await page.goto("/admin/listings");
    await page.locator('[data-testid="pickup-input"]').first().fill(code);
    await page.locator('[data-testid="pickup-submit"]').first().click();
    await page.waitForLoadState("networkidle");

    // Step 7 — impact: hero recovered money is no longer zero
    await page.goto("/admin");
    const hero = page.locator('[data-testid="hero-number"]');
    await expect(hero).toBeVisible();
    await expect(hero).not.toHaveText(/^\s*0 ₼\s*$/, { timeout: 15000 });
  });
});
