import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

type Row = { title: string; added?: string };
const rows: Row[] = JSON.parse(readFileSync("src/data/titles.json", "utf8"));
const DAY = 86_400_000;
const YEAR = 2026;
const doy = (m: number, d: number) => Math.round((Date.UTC(2001, m, d) - Date.UTC(2001, 0, 1)) / DAY);
/** Mirror of the shelf rule: signed month-day distance, wrapping across Jan 1. */
function offset(m: number, d: number, iso: string): number {
  const a = new Date(iso);
  const diff = doy(a.getUTCMonth(), a.getUTCDate()) - doy(m, d);
  return diff - 365 * Math.round(diff / 365);
}
/** Titles added in an earlier year within 3 days of month/day (0-based month), shelf order. */
function around(m: number, d: number): Row[] {
  return rows
    .filter((r) => r.added && Number(r.added.slice(0, 4)) < YEAR && Math.abs(offset(m, d, r.added)) <= 3)
    .sort((x, y) => Math.abs(offset(m, d, x.added!)) - Math.abs(offset(m, d, y.added!)) || x.added!.localeCompare(y.added!) || x.title.localeCompare(y.title));
}
// Local noon so the app's UTC month-day matches the local one.
const noon = (m: number, d: number) => new Date(YEAR, m, d, 12);
const firstAdded = new Date(rows.find((r) => r.added)!.added!);
const hit = { m: firstAdded.getUTCMonth(), d: firstAdded.getUTCDate() };
let miss: { m: number; d: number } | undefined;
for (let m = 0; m < 12 && !miss; m++) {
  for (let d = 1; d <= new Date(YEAR, m + 1, 0).getDate(); d++) {
    if (!around(m, d).length) {
      miss = { m, d };
      break;
    }
  }
}

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

test.describe("This week, years ago", () => {
  test("shows on a matching day, leads with the closest-added title, See all sorts by Added", async ({ page }) => {
    const expected = around(hit.m, hit.d);
    expect(expected.length).toBeGreaterThan(0);
    await page.clock.setFixedTime(noon(hit.m, hit.d));
    await page.goto("/");
    await page.locator("h1").waitFor();
    const region = shelf(page, "This week, years ago");
    await region.scrollIntoViewIfNeeded();
    await expect(region).toBeVisible();
    await expect(posters(region).first()).toHaveAttribute("aria-label", expected[0].title);
    await region.getByRole("button", { name: "See all →" }).click();
    await expect(page).toHaveURL(/#\/shelf\/around/);
    await expect(page.locator("h1")).toHaveText("This week, years ago");
    await expect(page.getByRole("button", { name: "Sort: Added" })).toBeVisible();
  });

  test("hides on a day with nothing nearby and the shelf page is an empty state", async ({ page }) => {
    test.skip(!miss, "every day of the year has a match in the catalogue");
    await page.clock.setFixedTime(noon(miss!.m, miss!.d));
    await page.goto("/");
    await page.locator("h1").waitFor();
    await expect(shelf(page, "Under 90 minutes")).toBeVisible();
    await expect(shelf(page, "This week, years ago")).toHaveCount(0);
    await page.goto("/#/shelf/around");
    await expect(page.getByText("Nothing matches")).toBeVisible();
  });
});
