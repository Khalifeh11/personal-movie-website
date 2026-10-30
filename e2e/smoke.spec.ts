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

test("mood tiles show a backdrop still, distinct per tile", async ({ page }) => {
  const imgs = page.locator("#moods").getByRole("button").locator("img");
  await expect(imgs).toHaveCount(18);
  const srcs = await imgs.evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute("src")));
  expect(new Set(srcs).size).toBe(18);
  expect(srcs.every((s) => s?.startsWith("/img/backdrop"))).toBe(true);
});

test("tile stills become visible, also from cache after reload", async ({ page }) => {
  const first = page.locator("#moods img").first();
  await first.scrollIntoViewIfNeeded();
  await expect(first).toHaveAttribute("data-loaded", "true");
  await expect(first).toHaveCSS("opacity", "1");
  await page.reload();
  await page.locator("#moods img").first().scrollIntoViewIfNeeded();
  await expect(page.locator("#moods img").first()).toHaveAttribute("data-loaded", "true");
});

test("hero Feels shows one accent dot per mood", async ({ page }) => {
  const feels = page.locator("section[aria-label=\"Tonight's film\"]").getByTestId("feels");
  const dots = feels.locator("[data-testid=mood-accent]");
  expect(await dots.count()).toBeGreaterThanOrEqual(1);
  expect(await dots.count()).toBeLessThanOrEqual(3);
});

test("tile stills animate scale and filter on hover, over 500ms", async ({ page }) => {
  const img = page.locator("#moods img").first();
  const [prop, dur] = await img.evaluate((el) => [getComputedStyle(el).transitionProperty, getComputedStyle(el).transitionDuration]);
  expect(prop).toContain("scale");
  expect(prop).toContain("filter");
  expect(dur.split(",")[0].trim()).toBe("0.5s");
});

test("the hero still fades in over the background duration", async ({ page }) => {
  const img = page.locator("section[aria-label=\"Tonight's film\"] img[data-loaded]").first();
  expect(await img.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0.7s");
});

test("a focused tile shows a focus ring", async ({ page }) => {
  const tile = page.locator("#moods").getByRole("button").first();
  await tile.focus();
  await expect.poll(() => tile.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none");
});

test("hero byline links the director", async ({ page }) => {
  await page.goto("/");
  const link = page.locator('h1 + * a[href^="#/director/"]');
  // Series have no director; step the hero forward until one has a byline link (deck is seeded daily).
  for (let i = 0; i < 12 && (await link.count()) === 0; i++) await page.keyboard.press("ArrowRight");
  await expect(link.first()).toHaveAttribute("href", /^#\/director\/[a-z0-9-]+$/);
  await link.first().click();
  await expect(page).toHaveURL(/#\/director\//);
});

test("hero explains the pick", async ({ page }) => {
  const why = page.getByTestId("why-this");
  // A film with no applicable reason renders no line; flip past it (at most 5 times).
  for (let i = 0; i < 5 && (await why.count()) === 0; i++) await page.keyboard.press("ArrowRight");
  await expect(why).toHaveText(/^Why this: .+\.$/);
});
