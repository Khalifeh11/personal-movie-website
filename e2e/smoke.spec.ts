import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
});

const counter = (page: import("@playwright/test").Page) => page.getByTestId("counter");

test("home shows a film and arrows move", async ({ page }) => {
  const h1 = page.locator("h1");
  await expect(h1).not.toHaveText("");
  const first = await h1.textContent();
  await expect(counter(page)).toHaveText(/^01 \/ \d\d$/);
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
  await page.goto("/#mood=on-edge&type=Series");
  await expect(page).toHaveURL(/#\/\?type=Series$/);
});

test("footer shows TMDB attribution", async ({ page }) => {
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await expect(page.getByText("This product uses the TMDB API but is not endorsed or certified by TMDB.")).toBeVisible();
});
