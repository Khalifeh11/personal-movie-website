import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
});

const drawer = (page: Page) => page.getByRole("dialog", { name: "Filters" });
const total = async (page: Page) => Number((await page.getByTestId("counter").textContent())!.split("/")[1]);

async function openFilters(page: Page) {
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(drawer(page)).toBeVisible();
}

test("type filter writes the hash and persists across reload", async ({ page }) => {
  await openFilters(page);
  await drawer(page).getByRole("button", { name: "Series", exact: true }).click();
  await expect(page).toHaveURL(/type=Series/);
  await expect(drawer(page)).toContainText(/\d+ titles? match/);
  await page.reload();
  await openFilters(page);
  await expect(drawer(page).getByRole("button", { name: "Series", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("runtime filter shrinks the deck", async ({ page }) => {
  const before = await total(page);
  await openFilters(page);
  await drawer(page).getByRole("button", { name: "Under 100 min" }).click();
  await expect.poll(() => total(page)).toBeLessThan(before);
  await expect(page).toHaveURL(/rt=short/);
});

test("hide watched is on by default", async ({ page }) => {
  await openFilters(page);
  await expect(drawer(page).getByRole("button", { name: "Hide watched" })).toHaveAttribute("aria-pressed", "true");
});

test("Escape and the close button both close the drawer", async ({ page }) => {
  await openFilters(page);
  await page.keyboard.press("Escape");
  await expect(drawer(page)).toBeHidden();
  await openFilters(page);
  await drawer(page).getByRole("button", { name: "Close filters" }).click();
  await expect(drawer(page)).toBeHidden();
});

test("export downloads the user data file", async ({ page }) => {
  await openFilters(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    drawer(page).getByRole("button", { name: "Export watched & ratings" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("tonight-user-data.json");
});

test("importing a bad file shows an error and keeps the drawer usable", async ({ page }) => {
  await openFilters(page);
  await drawer(page).getByLabel("Import").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("nope") });
  await expect(drawer(page)).toContainText("Invalid user data file");
});

test("importing a valid file hides newly-watched titles", async ({ page }) => {
  const firstId = await page.evaluate(() => document.querySelector("a[href*='imdb.com/title/']")!.getAttribute("href")!.match(/tt\d+/)![0]);
  const before = await total(page);
  await openFilters(page);
  const file = { version: 1, entries: { [firstId]: { watched: true, rating: null, note: "", updatedAt: "2026-10-30T00:00:00.000Z" } } };
  await drawer(page).getByLabel("Import").setInputFiles({ name: "ok.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) });
  await expect(drawer(page)).toContainText("Imported");
  await expect.poll(() => total(page)).toBe(before - 1);
});
