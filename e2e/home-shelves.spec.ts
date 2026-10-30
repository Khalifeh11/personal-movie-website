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

test("Back from See all returns to the shelf you left", async ({ page }) => {
  const heading = page.getByRole("heading", { name: "Waiting the longest" });
  await heading.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  expect(before).toBeGreaterThan(0);
  await shelf(page, "Waiting the longest").getByRole("button", { name: "See all →" }).click();
  await expect(page.locator("h1")).toHaveText("Waiting the longest");
  await page.goBack();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(before);
});

test("the wordmark still opens home at the top", async ({ page }) => {
  await page.evaluate(() => scrollTo(0, 1200));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await page.getByRole("link", { name: "Not Tonight" }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});

test("arrow keys leave the hero alone while a shelf card is open or a rail poster has focus", async ({ page }) => {
  const h1 = page.locator("h1");
  const first = await h1.textContent();
  const cell = posters(shelf(page, "Under 90 minutes")).first();
  await cell.scrollIntoViewIfNeeded();
  await cell.focus();
  await page.keyboard.press("ArrowRight");
  await expect(h1).toHaveText(first!);
  await cell.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(h1).toHaveText(first!);
});
