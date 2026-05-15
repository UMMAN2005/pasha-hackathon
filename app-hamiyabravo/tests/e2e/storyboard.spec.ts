import { test, expect } from "@playwright/test";

test.describe("60-second money loop: predict → approve → reserve → pickup → impact", () => {
  test("full cycle — Kamran approves, Astoria reserves, Kamran confirms pickup, impact shown", async ({
    page,
  }) => {

    // Step 1: /select-user → Kamran (Branch A manager)
    await page.goto("/select-user");
    await page.getByText("Kamran", { exact: true }).click();

    // Step 2: On /admin, assert hero copy and landing
    await expect(page.getByText("Bu gün bərpa olundu")).toBeVisible();

    // Step 3: Click "AI növbəsinə bax" link → /admin/recommendations
    await page.getByRole("link", { name: /AI növbəsinə bax/ }).click();
    await page.waitForLoadState("domcontentloaded");

    // Step 4: Click first "Təsdiqlə" button to approve the recommendation
    await page.getByRole("button", { name: "Təsdiqlə" }).first().click();
    await page.waitForLoadState("domcontentloaded");

    // Step 5: Navigate to /select-user, select Astoria Hotel (buyer)
    await page.goto("/select-user");
    await page.getByText("Astoria Hotel", { exact: true }).click();

    // Step 6: On /marketplace, open the first listing (Greek Yogurt 500g)
    // The listing card has data-testid="listing-card"; find one and click it
    const firstListing = page.locator('[data-testid="listing-card"]').first();
    await expect(firstListing).toBeVisible();
    await firstListing.click();
    await page.waitForLoadState("domcontentloaded");

    // Step 7: Verify product title is "Greek Yogurt 500g" (the English name, not Azerbaijani)
    await expect(page.getByRole("heading", { name: "Greek Yogurt 500g" })).toBeVisible();

    // Step 8: Click "Sifariş et" (reserve) button
    await page.getByRole("button", { name: "Sifariş et" }).click();
    await page.waitForLoadState("domcontentloaded");

    // Step 9: Capture the pickup code from data-testid="pickup-code"
    const pickupCodeElement = page.locator('[data-testid="pickup-code"]');
    await expect(pickupCodeElement).toBeVisible();
    const pickupCode = await pickupCodeElement.textContent();
    expect(pickupCode).toBeTruthy();
    const code = pickupCode!.trim();

    // Step 10: Return to /select-user, select Kamran again
    await page.goto("/select-user");
    await page.getByText("Kamran", { exact: true }).click();

    // Step 11: Navigate to /admin/listings
    await page.goto("/admin/listings");
    await page.waitForLoadState("domcontentloaded");

    // Step 12: Fill data-testid="pickup-input" with the code, click confirm button
    await page.locator('[data-testid="pickup-input"]').fill(code);
    await page.locator('[data-testid="pickup-submit"]').click();
    await page.waitForLoadState("domcontentloaded");

    // Step 13: Navigate back to /admin
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // Step 14: Assert hero number is NOT "0 ₼" (money was recovered)
    const heroNumber = page.locator('[data-testid="hero-number"]');
    await expect(heroNumber).toBeVisible();
    const heroText = await heroNumber.textContent();
    expect(heroText).not.toContain("0 ₼");

    // Step 15: Assert impact strip is visible (CO₂, food saved metrics)
    const impactElements = page.locator('[class*="rounded-xl"][class*="border-slate-200"]');
    // The impact strip has 4 cards (Öğün, Kiloqram, CO₂, Boşa gedir); at least some should be visible
    const impactCount = await impactElements.count();
    expect(impactCount).toBeGreaterThan(0);

    // Test passes: full 60-second loop complete
  });
});
