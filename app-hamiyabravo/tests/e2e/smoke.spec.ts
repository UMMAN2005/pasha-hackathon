import { test, expect } from "@playwright/test";

test("redesign smoke: select(2), buyer auction, admin branches", async ({
  page,
}) => {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push("PAGEERR " + e.message));
  page.on("response", (r) => {
    if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`);
  });

  // Select screen — exactly 2 options, English
  await page.goto("/select-user");
  await expect(page.getByText("Bravo Admin")).toBeVisible();
  await expect(page.getByText("Restaurant / Buyer")).toBeVisible();

  // Buyer path
  await page
    .getByRole("button")
    .filter({ hasText: "Restaurant / Buyer" })
    .first()
    .click();
  await page.waitForURL("**/marketplace");
  const card = page.locator('[data-testid="listing-card"]').first();
  await expect(card).toBeVisible();
  console.log("SMOKE market cards:", await page.locator('[data-testid="listing-card"]').count());
  await card.click();
  await page.waitForURL(/\/marketplace\/.+/);
  await expect(page.getByRole("button", { name: /Place bid/i })).toBeVisible();

  // Admin path + new Branches map
  await page.goto("/select-user");
  await page
    .getByRole("button")
    .filter({ hasText: "Bravo Admin" })
    .first()
    .click();
  await page.waitForURL("**/admin");
  await page.goto("/admin/branches");
  await page.waitForLoadState("networkidle");
  const svg = page.locator("svg").first();
  await expect(svg).toBeVisible();
  const head = (await page.locator("body").innerText()).slice(0, 160);
  console.log("SMOKE branches head:", head.replace(/\n/g, " | "));

  console.log("SMOKE errors:", JSON.stringify(errs));
  expect(errs).toEqual([]);
});
