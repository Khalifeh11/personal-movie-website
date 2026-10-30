import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // Wait for the app to mount (hashchange listener attached) before tests change the hash.
  await page.locator("h1").waitFor();
});

const h1 = (page: import("@playwright/test").Page) => page.getByRole("heading", { level: 1 });
const count = (page: import("@playwright/test").Page) => page.getByText(/^\d+ films?$/);

test("#/decades lands on the busiest decade", async ({ page }) => {
  await page.goto("/#/decades");
  await expect(page).toHaveURL(/#\/decades\/2010$/);
  await expect(h1(page)).toHaveText("2010s");
  await expect(count(page)).toHaveText("107 films");
});

test("ArrowRight steps the decade in place and survives reload", async ({ page }) => {
  await page.goto("/#/decades/2010");
  await expect(h1(page)).toHaveText("2010s");
  const before = await page.evaluate(() => history.length);
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/#\/decades\/2020$/);
  await expect(h1(page)).toHaveText("2020s");
  await expect(count(page)).toHaveText("34 films");
  expect(await page.evaluate(() => history.length)).toBe(before);
  await page.reload();
  await expect(h1(page)).toHaveText("2020s");
});

test("Back after a decade change leaves the page", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => (location.hash = "#/decades/2010"));
  await expect(h1(page)).toHaveText("2010s");
  await page.keyboard.press("ArrowRight");
  await expect(h1(page)).toHaveText("2020s");
  await page.goBack();
  await expect(page).toHaveURL(/#\/$/);
});

test("arrow keys do not move the decade behind an open title card", async ({ page }) => {
  await page.goto("/#/decades/2010");
  await page.getByRole("article").first().getByRole("button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const url = page.url();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(page.url()).toBe(url);
});

test("an unknown decade redirects home", async ({ page }) => {
  await page.goto("/#/decades/2003");
  await expect(page).toHaveURL(/#\/$/);
});

test("a decade emptied by Hide watched shows 0 films and keeps the chart", async ({ page }) => {
  await page.evaluate(() => {
    const entry = { watched: true, rating: null, note: "", updatedAt: "2026-10-30T00:00:00.000Z" };
    localStorage.setItem("tonight.userData.v1", JSON.stringify({ tt0020629: entry }));
  });
  await page.reload();
  await page.goto("/#/decades/1930");
  // The empty state is an h1 too, so match the band's by text.
  await expect(page.locator("h1", { hasText: "1930s" })).toBeVisible();
  await expect(count(page)).toHaveText("0 films");
  await expect(page.getByTestId("decade-chart")).toBeVisible();
});

test("Back restores the decade list's scroll", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => (location.hash = "#/decades/2010"));
  await expect(h1(page)).toHaveText("2010s");
  await page.evaluate(() => scrollTo(0, 1500));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1400);
  const y = await page.evaluate(() => scrollY);
  await page.evaluate(() => (location.hash = "#/"));
  await expect(page.locator("#moods")).toBeAttached();
  await page.goBack();
  await expect(h1(page)).toHaveText("2010s");
  await expect.poll(async () => Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThan(40);
});
