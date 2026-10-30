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
