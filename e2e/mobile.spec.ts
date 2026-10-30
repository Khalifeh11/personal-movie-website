import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  // Wait for the app to mount (hashchange listener attached) before tests change the hash.
  await page.locator("h1").waitFor();
});

const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test("no horizontal scroll on home or a mood page", async ({ page }) => {
  expect(await noHorizontalScroll(page)).toBe(true);
  await page.goto("/#/mood/tense");
  await expect(page.getByRole("article").first()).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);
});

test("nav items live behind the Menu button", async ({ page }) => {
  const filters = page.getByRole("button", { name: "Filters", exact: true });
  await expect(filters).toBeHidden();
  await page.getByRole("button", { name: "Menu" }).tap();
  await expect(filters).toBeVisible();
  await expect(page.getByRole("button", { name: "Moods", exact: true })).toBeVisible();
});

test("mood page menu lists the moods", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("button", { name: "Menu" }).tap();
  await page.getByRole("menuitem", { name: "Feel-good" }).tap();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Feel-good");
});

test("swiping the hero changes the film", async ({ page }) => {
  const h1 = page.locator("h1");
  const first = await h1.textContent();
  await page.locator("section[aria-label=\"Tonight's film\"]").evaluate((el) => {
    const touch = (x: number) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 400 });
    el.dispatchEvent(new TouchEvent("touchstart", { touches: [touch(300)], changedTouches: [touch(300)], bubbles: true }));
    el.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [touch(150)], bubbles: true }));
  });
  await expect(h1).not.toHaveText(first!);
});

test("tiles sit two per row", async ({ page }) => {
  const tiles = page.locator("#moods").getByRole("button");
  const [a, b, c] = await Promise.all([0, 1, 2].map((i) => tiles.nth(i).boundingBox()));
  expect(a!.y).toBe(b!.y);
  expect(c!.y).toBeGreaterThan(a!.y);
});

test("row blurbs are clamped to three lines", async ({ page }) => {
  await page.goto("/#/mood/tense");
  const clamp = await page.getByRole("article").first().locator("p").last().evaluate((el) => getComputedStyle(el).webkitLineClamp);
  expect(clamp).toBe("3");
});

test("tile mood name and count never overlap", async ({ page }) => {
  for (const name of ["Thought-provoking", "Heartbreaking", "Slow & quiet"]) {
    const tile = page.getByRole("button", { name: new RegExp(`^${name}, `) });
    const label = await tile.getByText(name, { exact: true }).boundingBox();
    const count = await tile.getByText(/\d+ titles?/).boundingBox();
    const overlap = label!.x < count!.x + count!.width && count!.x < label!.x + label!.width &&
      label!.y < count!.y + count!.height && count!.y < label!.y + label!.height;
    expect(overlap, name).toBe(false);
  }
});

test("the menu closes when the page changes", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("button", { name: "Menu" }).tap();
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "true");
  await page.evaluate(() => (location.hash = "#/mood/feel-good"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Feel-good");
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
});

test("phones load only the small hero stills", async ({ page }) => {
  const full: string[] = [];
  page.on("request", (r) => /\/img\/backdrop\//.test(r.url()) && full.push(r.url()));
  await page.goto("/");
  await page.locator("h1").waitFor();
  await page.locator("section[aria-label=\"Tonight's film\"]").getByRole("button", { name: "Next" }).tap();
  await page.waitForTimeout(1000);
  expect(full).toEqual([]);
});

test("grid is two-up with no horizontal scroll", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("button", { name: "Grid view" }).click();
  const cols = await page.getByTestId("grid").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(cols).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("title card is a scrollable bottom sheet", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("article").first().getByRole("heading", { level: 2 }).getByRole("button").tap();
  const sheet = page.getByRole("dialog").getByTestId("card");
  const box = (await sheet.boundingBox())!;
  const vh = await page.evaluate(() => innerHeight);
  expect(Math.round(box.y + box.height)).toBe(vh);
  expect(box.width).toBe(390);
  expect(await sheet.evaluate((el) => getComputedStyle(el).overflowY)).toBe("auto");
});
