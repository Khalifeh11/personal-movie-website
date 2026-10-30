import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  // Wait for the app to mount (hashchange listener attached) before tests change the hash.
  await page.locator("h1").waitFor();
});

const counter = (page: import("@playwright/test").Page) => page.getByTestId("counter");

test("home shows a film and arrows move", async ({ page }) => {
  const h1 = page.locator("h1");
  await expect(h1).not.toHaveText("");
  const first = await h1.textContent();
  await expect(counter(page)).toHaveText(/^01 \/ \d+$/);
  await page.keyboard.press("ArrowRight");
  await expect(h1).not.toHaveText(first!);
  await expect(counter(page)).toHaveText(/^02 \//);
});

test("wheel scrolls the page instead of flipping", async ({ page }) => {
  const h1 = page.locator("h1");
  const first = await h1.textContent();
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await expect(h1).toHaveText(first!);
});

test("nav goes solid after scrolling", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Site" });
  await expect(nav).toHaveAttribute("data-solid", "false");
  await page.evaluate(() => scrollTo(0, 600));
  await expect(nav).toHaveAttribute("data-solid", "true");
});

test("Moods scrolls to the mood section", async ({ page }) => {
  await page.getByRole("button", { name: "Moods", exact: true }).click();
  await expect(page.locator("#moods")).toBeInViewport();
});

test("legacy hash redirects home and keeps valid filters", async ({ page }) => {
  await page.goto("about:blank"); // a fresh load: filters are read from the URL only on load
  await page.goto("/#mood=on-edge&type=Series");
  await expect(page).toHaveURL(/#\/\?type=Series$/);
});

test("footer shows TMDB attribution", async ({ page }) => {
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await expect(page.getByText("This product uses the TMDB API but is not endorsed or certified by TMDB.")).toBeVisible();
});

test("mood tiles: one per mood plus All; click opens the mood page", async ({ page }) => {
  const tiles = page.locator("#moods").getByRole("button");
  await expect(tiles).toHaveCount(18);
  await expect(page.getByRole("button", { name: "Dread, 48 titles" })).toBeVisible();
  await page.getByRole("button", { name: /^Tense, \d+ titles?$/ }).click();
  await expect(page).toHaveURL(/#\/mood\/tense$/);
});

test("hero trailer opens in place and Esc closes it", async ({ page }) => {
  const trailer = page.locator("section[aria-label=\"Tonight's film\"]").getByRole("button", { name: "▶ Trailer" });
  for (let i = 0; i < 20 && !(await trailer.isVisible()); i++) await page.keyboard.press("ArrowRight");
  await trailer.click();
  const frame = page.locator('iframe[src*="youtube-nocookie.com/embed/"]');
  await expect(frame).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(frame).toHaveCount(0);
});

test("marking the hero film watched moves to the next one", async ({ page }) => {
  const h1 = page.locator("h1");
  const first = await h1.textContent();
  await page.locator("section[aria-label=\"Tonight's film\"]").getByRole("button", { name: "Watched" }).click();
  await expect(h1).not.toHaveText(first!);
});

test("arrow keys on the hero rating change the rating, not the film", async ({ page }) => {
  const h1 = page.locator("h1");
  const first = await h1.textContent();
  const stars = page.locator("section[aria-label=\"Tonight's film\"]").getByRole("slider", { name: "Your rating" });
  await stars.focus();
  await page.keyboard.press("ArrowRight");
  await expect(stars).toHaveAttribute("aria-valuenow", "0.5");
  await expect(h1).toHaveText(first!);
});

test("arrow keys do nothing to the hero while the trailer is open", async ({ page }) => {
  const trailer = page.locator("section[aria-label=\"Tonight's film\"]").getByRole("button", { name: "▶ Trailer" });
  for (let i = 0; i < 20 && !(await trailer.isVisible()); i++) await page.keyboard.press("ArrowRight");
  const counter = await page.getByTestId("counter").textContent();
  await trailer.click();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("counter")).toHaveText(counter!);
});
