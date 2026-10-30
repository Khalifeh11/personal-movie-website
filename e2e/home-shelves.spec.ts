import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  // Wait for the app to mount (hashchange listener attached) before tests change the hash.
  await page.locator("h1").waitFor();
});

const shelf = (page: import("@playwright/test").Page, name: string) => page.getByRole("region", { name });
// Poster buttons carry the title as aria-label; "See all" does not.
const posters = (region: import("@playwright/test").Locator) => region.locator("button[aria-label]");

test("home lists the two fixed shelves with posters", async ({ page }) => {
  const short = shelf(page, "Under 90 minutes");
  await short.scrollIntoViewIfNeeded();
  await expect(short).toBeVisible();
  await expect(posters(short).first()).toBeVisible();
  await expect(shelf(page, "Waiting the longest")).toBeVisible();
});

test("See all opens the shelf page sorted by Added", async ({ page }) => {
  await shelf(page, "Waiting the longest").getByRole("button", { name: "See all →" }).click();
  await expect(page).toHaveURL(/#\/shelf\/waiting/);
  await expect(page.locator("h1")).toHaveText("Waiting the longest");
  await expect(page.getByRole("button", { name: "Sort: Added" })).toBeVisible();
});

test("a shelf poster opens the title card", async ({ page }) => {
  const cell = posters(shelf(page, "Under 90 minutes")).first();
  await cell.scrollIntoViewIfNeeded();
  const name = await cell.getAttribute("aria-label");
  await cell.click();
  await expect(page.getByRole("dialog", { name: name! })).toBeVisible();
});
