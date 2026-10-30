import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // Wait for the app to mount (hashchange listener attached) before tests change the hash.
  await page.locator("h1").waitFor();
});

const rows = (page: Page) => page.getByRole("article");

test("mood page lists every title in that mood, best rated first", async ({ page }) => {
  await page.goto("/#/mood/on-edge");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("On edge");
  await expect(page.getByText("79 titles", { exact: true })).toBeVisible();
  await expect(rows(page)).toHaveCount(79);
  await expect(rows(page).first()).toContainText("01");
  await expect(rows(page).first()).toContainText("Parasite");
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
  await expect(rows(page).first()).toContainText("Anatomy of a Fall");
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

test("row trailer opens and the close button closes it", async ({ page }) => {
  await page.goto("/#/mood/on-edge");
  await rows(page).first().getByRole("button", { name: "▶ Trailer" }).click();
  const frame = page.locator('iframe[src*="youtube-nocookie.com/embed/"]');
  await expect(frame).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(frame).toHaveCount(0);
});

test("a title without a trailer has no Trailer button", async ({ page }) => {
  await page.goto("/#/mood/transported");
  await expect(rows(page).filter({ hasText: "Pink Floyd" }).getByRole("button", { name: "▶ Trailer" })).toHaveCount(0);
  await expect(rows(page).filter({ hasText: "Samurai Champloo" }).getByRole("button", { name: "▶ Trailer" })).toHaveCount(1);
});

test("marking watched keeps the row until you leave the page", async ({ page }) => {
  await page.goto("/#/mood/on-edge");
  const first = rows(page).first();
  await first.getByRole("button", { name: "Watched" }).click();
  await expect(rows(page)).toHaveCount(79);
  await expect(first).toHaveAttribute("data-dimmed", "true");
  await expect(first.getByRole("button", { name: "✓ Watched" })).toBeVisible();
  await page.getByRole("button", { name: "Moods", exact: true }).click();
  await page.getByRole("menuitem", { name: "Moved" }).click();
  await page.getByRole("button", { name: "Moods", exact: true }).click();
  await page.getByRole("menuitem", { name: "On edge" }).click();
  await expect(rows(page)).toHaveCount(78);
});

test("your rating persists across reload", async ({ page }) => {
  await page.goto("/#/mood/on-edge");
  const stars = rows(page).first().getByRole("slider", { name: "Your rating" });
  await stars.focus();
  for (let i = 0; i < 9; i++) await page.keyboard.press("ArrowRight");
  await expect(stars).toHaveAttribute("aria-valuenow", "4.5");
  await page.reload();
  await expect(rows(page).first().getByRole("slider", { name: "Your rating" })).toHaveAttribute("aria-valuenow", "4.5");
});

test("a note saves on blur", async ({ page }) => {
  await page.goto("/#/mood/on-edge");
  await rows(page).first().getByRole("button", { name: "Note" }).click();
  await page.getByRole("textbox", { name: "Note" }).fill("with popcorn");
  await page.getByRole("heading", { level: 1 }).click();
  await expect(rows(page).first().getByRole("button", { name: "Note •" })).toBeVisible();
});

test("following a link to a mood page starts at the top", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => scrollTo(0, 900));
  await page.evaluate(() => (location.hash = "#/mood/on-edge"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("On edge");
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("Back keeps a filter changed on a mood page", async ({ page }) => {
  await page.goto("/#/?rt=mid");
  await page.getByRole("button", { name: /^On edge, / }).click();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("dialog", { name: "Filters" }).getByRole("button", { name: "Any", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.goBack();
  await expect(page.locator("#moods")).toBeAttached();
  await expect(page).toHaveURL(/#\/$/);
});

test("Back closes an open trailer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^On edge, / }).click();
  await rows(page).first().getByRole("button", { name: "▶ Trailer" }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toBeVisible();
  await page.goBack();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toHaveCount(0);
});
