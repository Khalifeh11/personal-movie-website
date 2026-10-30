import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

const rows = (page: Page) => page.getByRole("article");

test("mood page lists every title in that mood, best rated first", async ({ page }) => {
  await page.goto("/#/mood/on-edge");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("On edge");
  await expect(page.getByText("5 titles", { exact: true })).toBeVisible();
  await expect(rows(page)).toHaveCount(5);
  await expect(rows(page).first()).toContainText("01");
  await expect(rows(page).first()).toContainText("Anatomy of a Murder");
});

test("search narrows rows; no match shows the empty state", async ({ page }) => {
  await page.goto("/#/mood/on-edge");
  await page.getByRole("searchbox", { name: "Search" }).fill("malle");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Elevator to the Gallows");
  await page.getByRole("searchbox", { name: "Search" }).fill("zzzz");
  await expect(page.getByText("Nothing matches")).toBeVisible();
  await expect(page.getByText("Clear the search or loosen the filters.")).toBeVisible();
});

test("sort by year puts the newest first", async ({ page }) => {
  await page.goto("/#/mood/on-edge");
  await page.getByRole("combobox", { name: "Sort" }).selectOption("year");
  await expect(rows(page).first()).toContainText("Sin Nombre");
});

test("unknown mood redirects home", async ({ page }) => {
  await page.goto("/#/mood/zzz");
  await expect(page).toHaveURL(/#\/$/);
});

test("Back from a mood page returns to the same hero film", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  const h1 = await page.locator("h1").textContent();
  const counter = await page.getByTestId("counter").textContent();
  await page.getByRole("button", { name: /^On edge, / }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("On edge");
  await page.goBack();
  await expect(page.locator("h1")).toHaveText(h1!);
  await expect(page.getByTestId("counter")).toHaveText(counter!);
});

test("nav Moods dropdown jumps between moods", async ({ page }) => {
  await page.goto("/#/mood/on-edge");
  await page.getByRole("button", { name: "Moods", exact: true }).click();
  await page.getByRole("menuitem", { name: "Moved" }).click();
  await expect(page).toHaveURL(/#\/mood\/moved$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Moved");
});

test("a title with no poster renders a placeholder, not a broken image", async ({ page }) => {
  await page.goto("/#/mood/transported");
  const row = rows(page).filter({ hasText: "Pink Floyd" });
  await expect(row).toHaveCount(1);
  await expect(row.locator("img")).toHaveCount(0);
});
