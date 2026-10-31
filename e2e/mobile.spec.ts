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

test("swiping the still changes the film", async ({ page }) => {
  const h1 = page.locator("h1");
  const first = await h1.textContent();
  await page.getByTestId("still").evaluate((el) => {
    const touch = (x: number) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 400 });
    el.dispatchEvent(new TouchEvent("touchstart", { touches: [touch(300)], changedTouches: [touch(300)], bubbles: true }));
    el.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [touch(150)], bubbles: true }));
  });
  await expect(h1).not.toHaveText(first!);
});

test("hero is a short still with the title on it and the details below", async ({ page }) => {
  const still = (await page.getByTestId("still").boundingBox())!;
  expect(still.height).toBeLessThan(844 * 0.7);
  const h1 = (await page.locator("h1").boundingBox())!;
  expect(h1.y + h1.height).toBeLessThanOrEqual(still.y + still.height + 1);
  const why = (await page.getByTestId("why-this").boundingBox())!;
  expect(why.y).toBeGreaterThan(still.y + still.height);
  await expect(page.getByRole("button", { name: "Previous" })).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);
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

test("title card poster keeps its 2:3 shape and the sheet has its own close button", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("article").first().getByRole("heading", { level: 2 }).getByRole("button").tap();
  const sheet = page.getByRole("dialog").getByTestId("card");
  const poster = (await sheet.getByTestId("poster").boundingBox())!;
  expect(Math.round(poster.height)).toBe(Math.round((poster.width * 3) / 2));
  // The close control sits inside the sheet with a thumb-sized target, not up by the nav.
  const close = sheet.getByRole("button", { name: "Close" });
  const box = (await close.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await close.tap();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("shelves scroll sideways without widening the page", async ({ page }) => {
  const rail = page.getByRole("region", { name: "Under 90 minutes" }).getByTestId("rail");
  await rail.scrollIntoViewIfNeeded();
  expect(await rail.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  expect(await noHorizontalScroll(page)).toBe(true);
});

test("a horizontal touch drag across the decade chart picks a decade without scrolling the page", async ({ page }) => {
  await page.goto("/#/decades/2010");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("2010s");
  expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(true);
  const box = (await page.getByTestId("decade-chart").boundingBox())!;
  const y = box.y + box.height / 2;
  const scrollBefore = await page.evaluate(() => scrollY);
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", f?: number, dy = 0) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: f === undefined ? [] : [{ x: box.x + box.width * f, y: y + dy }] });
  await touch("touchStart", 0.1);
  // A little vertical drift, as a real finger has: pan-y would scroll on it if the gesture were free.
  for (let i = 1; i <= 16; i++) await touch("touchMove", 0.1 + (0.86 * i) / 16, i);
  await touch("touchEnd");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("2020s");
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
});
