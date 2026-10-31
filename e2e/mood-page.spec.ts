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
  await page.goto("/#/mood/tense");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tense");
  await expect(page.getByText("86 titles", { exact: true })).toBeVisible();
  await expect(rows(page)).toHaveCount(86);
  await expect(rows(page).first()).toContainText("01");
  await expect(rows(page).first()).toContainText("Chernobyl");
});

test("search narrows rows; no match shows the empty state", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("searchbox", { name: "Search" }).fill("malle");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Elevator to the Gallows");
  await page.getByRole("searchbox", { name: "Search" }).fill("zzzz");
  await expect(page.getByText("Nothing matches")).toBeVisible();
  await expect(page.getByText("Clear the search or loosen the filters.")).toBeVisible();
});

test("sort by year puts the newest first", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("button", { name: /^Sort:/ }).click();
  await page.getByRole("option", { name: "Year" }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sort: Year" })).toBeVisible();
  await expect(rows(page).first()).toContainText("Marty Supreme");
});

test("direction toggle flips the sort", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("button", { name: "Descending" }).click();
  await expect(page.getByRole("button", { name: "Ascending" })).toBeVisible();
  await expect(rows(page).first()).not.toContainText("Chernobyl");
  await page.getByRole("button", { name: /^Sort:/ }).click();
  await page.getByRole("option", { name: "Title" }).click();
  await expect(page.getByRole("button", { name: "Ascending" })).toBeVisible();
});

test("search matches genres and keywords too", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("searchbox", { name: "Search" }).fill("history");
  await expect(rows(page).filter({ hasText: "Chernobyl" })).toHaveCount(1);
});

test("sort menu works from the keyboard and closes on Escape", async ({ page }) => {
  await page.goto("/#/mood/tense");
  const trigger = page.getByRole("button", { name: /^Sort:/ });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "IMDb rating" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Sort: Year" })).toBeVisible();
});

test("unknown mood redirects home", async ({ page }) => {
  await page.goto("/#/mood/zzz");
  await expect(page).toHaveURL(/#\/$/);
});

test("an old bucket link redirects home", async ({ page }) => {
  await page.goto("/#/mood/on-edge");
  await expect(page).toHaveURL(/#\/$/);
});

test("rows show the film's moods", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await expect(rows(page).filter({ hasText: "Anatomy of a Fall" })).toContainText("Feels: Tense · Puzzling");
});

test("Back from a mood page returns to the same hero film", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  const h1 = await page.locator("h1").textContent();
  const counter = await page.getByTestId("counter").textContent();
  await page.getByRole("button", { name: /^Tense, / }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tense");
  await page.goBack();
  await expect(page.locator("h1")).toHaveText(h1!);
  await expect(page.getByTestId("counter")).toHaveText(counter!);
});

test("nav Moods dropdown jumps between moods", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("button", { name: "Moods", exact: true }).click();
  await page.getByRole("menuitem", { name: "Feel-good" }).click();
  await expect(page).toHaveURL(/#\/mood\/feel-good$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Feel-good");
});

test("row trailer opens and the close button closes it", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await rows(page).first().getByRole("button", { name: "▶ Trailer" }).click();
  const frame = page.locator('iframe[src*="youtube-nocookie.com/embed/"]');
  await expect(frame).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(frame).toHaveCount(0);
});

test("a title without a trailer has no Trailer button", async ({ page }) => {
  await page.goto("/#/mood/all");
  await expect(rows(page).filter({ hasText: "Pink Floyd" }).getByRole("button", { name: "▶ Trailer" })).toHaveCount(0);
  await expect(rows(page).filter({ hasText: "Samurai Champloo" }).getByRole("button", { name: "▶ Trailer" })).toHaveCount(1);
});

test("marking watched keeps the row until you leave the page", async ({ page }) => {
  await page.goto("/#/mood/tense");
  const first = rows(page).first();
  await first.getByRole("button", { name: "Watched" }).click();
  await expect(rows(page)).toHaveCount(86);
  await expect(first).toHaveAttribute("data-dimmed", "true");
  await expect(first.getByRole("button", { name: "✓ Watched" })).toBeVisible();
  await page.getByRole("button", { name: "Moods", exact: true }).click();
  await page.getByRole("menuitem", { name: "Feel-good" }).click();
  await page.getByRole("button", { name: "Moods", exact: true }).click();
  await page.getByRole("menuitem", { name: "Tense" }).click();
  await expect(rows(page)).toHaveCount(85);
});

test("your rating persists across reload", async ({ page }) => {
  await page.goto("/#/mood/tense");
  const stars = rows(page).first().getByRole("slider", { name: "Your rating" });
  await stars.focus();
  for (let i = 0; i < 9; i++) await page.keyboard.press("ArrowRight");
  await expect(stars).toHaveAttribute("aria-valuenow", "4.5");
  await page.reload();
  await expect(rows(page).first().getByRole("slider", { name: "Your rating" })).toHaveAttribute("aria-valuenow", "4.5");
});

test("a note saves on blur", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await rows(page).first().getByRole("button", { name: "Note" }).click();
  await page.getByRole("textbox", { name: "Note" }).fill("with popcorn");
  await page.getByRole("heading", { level: 1 }).click();
  await expect(rows(page).first().getByRole("button", { name: "Note •" })).toBeVisible();
});

test("following a link to a mood page starts at the top", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => scrollTo(0, 900));
  await page.evaluate(() => (location.hash = "#/mood/tense"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tense");
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("Back keeps a filter changed on a mood page", async ({ page }) => {
  await page.goto("/#/?rt=mid");
  await page.getByRole("button", { name: /^Tense, / }).click();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("dialog", { name: "Filters" }).getByRole("button", { name: "Any", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.goBack();
  await expect(page.locator("#moods")).toBeAttached();
  await expect(page).toHaveURL(/#\/$/);
});

test("Back closes an open trailer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Tense, / }).click();
  await rows(page).first().getByRole("button", { name: "▶ Trailer" }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toBeVisible();
  await page.goBack();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toHaveCount(0);
});

test("row posters fade in", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await expect(rows(page).first().locator("img")).toHaveAttribute("data-loaded", "true");
});

test("mood page carries its accent", async ({ page }) => {
  await page.goto("/#/mood/tense");
  const dot = page.getByTestId("mood-accent");
  await expect(dot).toBeVisible();
  await expect(dot).toHaveCSS("background-color", "rgb(224, 78, 58)");
});

test("director name in a row links to the director page", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await rows(page).filter({ hasText: "Parasite" }).getByRole("link", { name: "Bong Joon Ho" }).click();
  await expect(page).toHaveURL(/#\/director\/bong-joon-ho$/);
});

test("co-directors are linked separately", async ({ page }) => {
  await page.goto("/#/mood/tense");
  const row = rows(page).filter({ hasText: /REC/ }).first();
  await expect(row.getByRole("link", { name: "Jaume Balagueró" })).toBeVisible();
  await expect(row.getByRole("link", { name: "Paco Plaza" })).toBeVisible();
});

test("director page lists that director's titles, best rated first", async ({ page }) => {
  await page.goto("/#/director/bong-joon-ho");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bong Joon Ho");
  await expect(page.getByText("3 titles", { exact: true })).toBeVisible();
  await expect(rows(page)).toHaveCount(3);
  await expect(rows(page).first()).toContainText("Parasite");
  await expect(page.getByTestId("mood-accent")).toHaveCount(0);
});

test("director page honours the type filter from the URL", async ({ page }) => {
  await page.goto("about:blank"); // a fresh load: filters are read from the URL only on load
  await page.goto("/#/director/billy-wilder?type=Series");
  await expect(page.getByText("Nothing matches")).toBeVisible();
});

test("Back from a director page restores sort, search and scroll", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("button", { name: /^Sort:/ }).click();
  await page.getByRole("option", { name: "Year" }).click();
  await page.getByRole("searchbox", { name: "Search" }).fill("a");
  const target = rows(page).nth(15);
  await target.scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => scrollY);
  expect(y).toBeGreaterThan(300);
  await target.getByRole("link").first().click();
  await expect(page).toHaveURL(/#\/director\//);
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Tense");
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.goBack();
  await expect(page.getByRole("button", { name: "Sort: Year" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search" })).toHaveValue("a");
  expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThan(40);
});

test("a fresh visit to the same mood page starts at defaults", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("searchbox", { name: "Search" }).fill("a");
  await page.goto("/");
  await page.getByRole("button", { name: /^Tense, / }).click();
  await expect(page.getByRole("searchbox", { name: "Search" })).toHaveValue("");
});

test("Back after a reload lands at defaults without error", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("link", { name: "Bong Joon Ho" }).first().click();
  await page.reload();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tense");
  await expect(page.getByRole("button", { name: "Sort: IMDb rating" })).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("grid view shows posters with a caption and persists across reload", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("button", { name: "Grid view" }).click();
  await expect(rows(page)).toHaveCount(0);
  const cells = page.getByTestId("grid").getByRole("button");
  await expect(cells).toHaveCount(86);
  await expect(cells.first()).toHaveAccessibleName("Chernobyl");
  await expect(cells.first()).toContainText("2019 · Series · IMDb 9.3");
  await expect(cells.first()).not.toContainText("Chernobyl");
  await page.reload();
  await expect(page.getByRole("button", { name: "Grid view" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("grid")).toBeVisible();
  await page.getByRole("button", { name: "List view" }).click();
  await expect(rows(page)).toHaveCount(86);
});

test("poster click opens the title card; Esc closes it", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await rows(page).first().getByRole("button", { name: "Chernobyl", exact: true }).click();
  const card = page.getByRole("dialog", { name: "Chernobyl" });
  await expect(card).toBeVisible();
  await expect(card.getByRole("heading", { level: 2 })).toHaveText("Chernobyl");
  await expect(card).toContainText("The true story of one of the worst");
  await expect(card.getByRole("button", { name: "Watched" })).toBeVisible();
  await expect(card.getByText("Tense")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card).toHaveCount(0);
});

test("card from the grid; trailer stacks above it and Esc closes only the trailer", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("button", { name: "Grid view" }).click();
  await page.getByTestId("grid").getByRole("button", { name: "Chernobyl" }).click();
  const card = page.getByRole("dialog", { name: "Chernobyl" });
  await card.getByRole("button", { name: "▶ Trailer" }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toHaveCount(0);
  await expect(card).toBeVisible();
});

test("director link in the card navigates and closes the card", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await rows(page).filter({ hasText: "Parasite" }).getByRole("button", { name: "Parasite", exact: true }).click();
  await page.getByRole("dialog", { name: "Parasite" }).getByRole("link", { name: "Bong Joon Ho" }).click();
  await expect(page).toHaveURL(/#\/director\/bong-joon-ho$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("closing the trailer and then the card unlocks page scroll", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await rows(page).first().getByRole("button", { name: "Chernobyl", exact: true }).click();
  await page.getByRole("dialog", { name: "Chernobyl" }).getByRole("button", { name: "▶ Trailer" }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("Back with the card and trailer open unlocks page scroll", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Tense, / }).click();
  await rows(page).first().getByRole("button", { name: "Chernobyl", exact: true }).click();
  await page.getByRole("dialog", { name: "Chernobyl" }).getByRole("button", { name: "▶ Trailer" }).click();
  await page.goBack();
  await expect(page.locator("#moods")).toBeAttached();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("rating in the card keeps keyboard focus on the stars", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await rows(page).first().getByRole("button", { name: "Chernobyl", exact: true }).click();
  const stars = page.getByRole("dialog", { name: "Chernobyl" }).getByRole("slider", { name: "Your rating" });
  await stars.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(stars).toHaveAttribute("aria-valuenow", "1");
  await expect(stars).toBeFocused();
});

test("each row has one tab stop for opening the card", async ({ page }) => {
  await page.goto("/#/mood/tense");
  const row = rows(page).first();
  await expect(row.getByRole("button", { name: "Chernobyl", exact: true })).toHaveCount(1);
  await expect(row.locator("button[aria-hidden]")).toHaveAttribute("tabindex", "-1");
  await expect(row.getByRole("heading", { level: 2 })).toHaveAccessibleName("Chernobyl");
});

test("shelf pages: waiting sorts by Added, short by Runtime", async ({ page }) => {
  await page.goto("/#/shelf/waiting");
  await expect(page.locator("h1")).toHaveText("Waiting the longest");
  await expect(page.getByRole("button", { name: "Sort: Added" })).toBeVisible();
  await page.goto("/#/shelf/short");
  await expect(page.locator("h1")).toHaveText("Under 90 minutes");
  await expect(page.getByRole("button", { name: "Sort: Runtime" })).toBeVisible();
});
