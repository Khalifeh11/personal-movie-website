import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("h1").waitFor();
});

const panel = (page: Page) => page.getByRole("dialog", { name: "Search" });
const box = (page: Page) => page.getByRole("combobox", { name: "Search titles" });
const options = (page: Page) => panel(page).getByRole("option");

test("nav button opens search; typing lists matches, title matches first", async ({ page }) => {
  await page.getByRole("navigation", { name: "Site" }).getByRole("button", { name: "Search" }).click();
  await expect(box(page)).toBeFocused();
  await box(page).fill("car");
  await expect(options(page).first().locator("mark")).toHaveText(/car/i);
  // A director match underlines the start of the name: John Carpenter shows up for "car".
  await expect(options(page).filter({ hasText: "John Carpenter" }).first().locator("mark")).toHaveText("Car");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
});

test("/ opens search, Esc closes it and unlocks scroll", async ({ page }) => {
  await page.keyboard.press("/");
  await expect(box(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("Enter opens the highlighted title's card; arrows move the highlight", async ({ page }) => {
  await page.keyboard.press("ControlOrMeta+k");
  await box(page).fill("lanthimos");
  await expect(options(page).first()).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowDown");
  await expect(options(page).nth(1)).toHaveAttribute("aria-selected", "true");
  const name = (await options(page).nth(1).locator("span.truncate").first().textContent())!;
  await page.keyboard.press("Enter");
  await expect(panel(page)).toHaveCount(0);
  const card = page.getByRole("dialog", { name });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Yorgos Lanthimos");
});

test("See all opens a results page; Back returns", async ({ page }) => {
  await page.keyboard.press("/");
  await box(page).fill("the");
  const all = options(page).filter({ hasText: /^See all \d+ results/ });
  await expect(all).toBeVisible();
  const n = Number((await all.textContent())!.match(/\d+/)![0]);
  await all.click();
  await expect(page).toHaveURL(/#\/search\/the$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("“the”");
  await expect(page.getByText(`${n} titles`, { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.locator("#moods")).toBeAttached();
});

test("decade and mood queries add Go to rows", async ({ page }) => {
  await page.keyboard.press("/");
  await box(page).fill("90s");
  await options(page).filter({ hasText: "The 1990s" }).click();
  await expect(page).toHaveURL(/#\/decades\/1990/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("1990s");
  await page.keyboard.press("/");
  await box(page).fill("dream");
  await options(page).filter({ hasText: "Dreamy" }).first().click();
  await expect(page).toHaveURL(/#\/mood\/dreamy$/);
});

test("no match says so", async ({ page }) => {
  await page.keyboard.press("/");
  await box(page).fill("zzzzq");
  await expect(panel(page)).toContainText("No titles match “zzzzq”");
});
