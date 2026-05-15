import { test, expect } from "@playwright/test";

test("auction surfaces render for buyer + admin", async ({ page }) => {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push("PAGEERR " + e.message));
  page.on("response", (r) => {
    if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`);
  });

  // Buyer
  await page.goto("/select-user");
  await page
    .getByRole("button")
    .filter({ hasText: "Astoria Hotel" })
    .first()
    .click();
  await page.waitForURL("**/marketplace");
  const card = page.locator('[data-testid="listing-card"]').first();
  await expect(card).toBeVisible();
  console.log("SMOKE marketplace cards:", await page.locator('[data-testid="listing-card"]').count());
  await card.click();
  await page.waitForURL(/\/marketplace\/.+/);
  await expect(page.getByText("Liderlik Taxtası")).toBeVisible();
  await expect(page.getByRole("button", { name: /Təklif ver/ })).toBeVisible();
  console.log("SMOKE buyer auction detail OK");

  // Admin auction control
  await page.goto("/select-user");
  await page
    .getByRole("button")
    .filter({ hasText: "Kamran" })
    .first()
    .click();
  await page.waitForURL("**/admin");
  await page.goto("/admin/listings");
  await page.waitForLoadState("networkidle");
  const body = (await page.locator("body").innerText()).slice(0, 200);
  console.log("SMOKE admin/listings head:", body.replace(/\n/g, " | "));

  console.log("SMOKE errors:", JSON.stringify(errs));
  expect(errs).toEqual([]);
});
