# Browse Refresh (batch 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bigger, readable rows with director links; a grid view; a title card on poster click; director pages; and Back that restores sort, search and scroll.

**Architecture:** `MoodPage` becomes a generic `BrowsePage` driven by a `Scope` (mood or director) that owns sort/dir/search/view/card state and renders either `FilmRow`s or a `FilmGrid`. Director routes resolve a slug against `titles.json` at parse time. A module-level per-route view-state cache (sort, dir, query, scrollY) is written on page unmount and read on mount; fresh navigations clear it, so only Back/Forward restore.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vite, Vitest, Playwright. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-30-browse-refresh-design.md`

## Global Constraints

- No new dependencies; icons are inline SVG.
- No data fetching or `enrich`/`titles.json` changes.
- No invented copy: the only new page text is the director's name and `countLabel(n)`.
- Nav, hero type scale and filters drawer are not restyled. Only rows, grid, card and director page change size.
- Hash router stays hand-rolled; opening the card or trailer never pushes history.
- `npm run lint && npm run typecheck && npm test && npx playwright test` green after every task. Don't commit or push unless asked; the commit steps below are there for when the user asks.

## Review Focus

1. Director names with diacritics ("Miloš Forman", "Gaspar Noé") → slug `milos-forman`, `gaspar-noe`; the page resolves and lists them. (Task 1 test.)
2. A title with no poster (Pink Floyd: Shine on You Crazy Diamond, in dreamy) in grid view → grey box cell, still clickable, no broken `<img>`. (Task 6 test.)
3. `#/director/<slug>?type=Movie` → director route with the type filter applied, not a redirect. (Task 1 test.)
4. Esc with the trailer open above the card closes only the trailer; the card is still there. (Task 7 test.)
5. Back onto a browse page after a full reload (cache empty) → defaults, top of page, no throw. (Task 5 test.)

---

### Task 1: Director slugs and routes

**Files:**
- Create: `src/lib/directors.ts`, `src/lib/directors.test.ts`
- Modify: `src/lib/route.ts`, `src/lib/route.test.ts`, `src/state/deck.ts` (`resolveInitialFilters`), `src/state/useDeck.ts`, `src/state/useRoute.ts` (pass directors)

**Interfaces:**
- Produces: `slugify(name: string): string`; `directorsOf(titles: Title[]): string[]` (unique, first-seen order); `titlesBy(titles: Title[], name: string): Title[]`; `Route` gains `{ name: "director"; director: string }` (original name); `parseRoute(hash: string, directors: readonly string[] = [])`; `serializeRoute` writes `/director/${slugify(name)}`; `resolveInitialFilters(hash, stored, directors: readonly string[] = [])`.

- [ ] **Step 1: Write the failing tests** in `src/lib/directors.test.ts`:

```ts
test("slugify lower-cases, strips diacritics, collapses non-alphanumerics", () => {
  expect(slugify("Bong Joon Ho")).toBe("bong-joon-ho");
  expect(slugify("Jean-Pierre Jeunet")).toBe("jean-pierre-jeunet");
  expect(slugify("Miloš Forman")).toBe("milos-forman");
  expect(slugify("Gaspar Noé")).toBe("gaspar-noe");
  expect(slugify("  Ridley   Scott! ")).toBe("ridley-scott");
});
test("directorsOf is unique in first-seen order; titlesBy matches exactly", () => {
  const ts = [mk({ id: "a", directors: ["X", "Y"] }), mk({ id: "b", directors: ["Y"] }), mk({ id: "c", directors: [] })];
  expect(directorsOf(ts)).toEqual(["X", "Y"]);
  expect(titlesBy(ts, "Y").map((t) => t.id)).toEqual(["a", "b"]);
  expect(titlesBy(ts, "Z")).toEqual([]);
});
```

And append to `src/lib/route.test.ts`:

```ts
const DIRS = ["Bong Joon Ho", "Miloš Forman"];
test("director route resolves a slug to the name and keeps filters", () => {
  expect(parseRoute("#/director/bong-joon-ho", DIRS)).toEqual({ route: { name: "director", director: "Bong Joon Ho" }, filters: {}, redirect: false });
  expect(parseRoute("#/director/milos-forman?type=Movie", DIRS)).toEqual({ route: { name: "director", director: "Miloš Forman" }, filters: { type: "Movie" }, redirect: false });
});
test("unknown director slug redirects home; no directors list means no director routes", () => {
  expect(parseRoute("#/director/nobody", DIRS)).toEqual({ route: home, filters: {}, redirect: true });
  expect(parseRoute("#/director/bong-joon-ho")).toEqual({ route: home, filters: {}, redirect: true });
});
test("director route round trip", () => {
  const r = { name: "director", director: "Miloš Forman" } as const;
  expect(serializeRoute(r, F({ type: "Series" }))).toBe("#/director/milos-forman?type=Series");
  expect(parseRoute(serializeRoute(r, F()), DIRS).route).toEqual(r);
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/directors.test.ts src/lib/route.test.ts` → FAIL (module missing / director routes redirect).

- [ ] **Step 3: Implement `src/lib/directors.ts`.** `slugify`: `normalize("NFD")`, strip `\p{M}`, lower-case, replace `[^a-z0-9]+` runs with `-`, trim `-`. `directorsOf` via a `Set`. `titlesBy` uses `includes`.

- [ ] **Step 4: Extend `src/lib/route.ts`.** Add the `director` variant to `Route`; `parseRoute(hash, directors = [])` matches `^\/director\/([^/]+)$` and finds the first name in `directors` whose `slugify` equals the slug (first match wins on collision); `serializeRoute` handles the new case. Existing mood/home behaviour unchanged.

- [ ] **Step 5: Thread directors through.** `resolveInitialFilters(hash, stored, directors = [])` passes them to `parseRoute`. `useDeck` computes `directorsOf(titles)` once (`useMemo`) and passes it. `useRoute(filters, directors: readonly string[])` passes them to both `parseRoute` calls. `App` computes `directors` once at module level next to `titles` and passes it to `useRoute`.

- [ ] **Step 6: Run** `npx vitest run && npm run typecheck` → PASS.

- [ ] **Step 7: Commit** `feat: director slugs and #/director/<slug> route`

---

### Task 2: View-state cache and fresh-vs-traversal navigation

**Files:**
- Create: `src/state/viewState.ts`, `src/state/viewState.test.ts`
- Modify: `src/state/useRoute.ts`

**Interfaces:**
- Consumes: `Route`, `serializeRoute` from Task 1.
- Produces: `interface ViewState { sort: SortKey; dir: SortDir; query: string; scrollY: number }`; `keyOf(hash: string): string`; `routeKey(r: Route): string` (the path part only: `"/"`, `"/mood/tense"`, `"/director/bong-joon-ho"`); `saveView(key: string, v: ViewState): void`; `loadView(key: string): ViewState | null`; `clearView(key: string): void`; `freshNavigate(hash: string): void` (clears the target's view state, then sets `location.hash`; if the hash is unchanged, scrolls to top instead). `useRoute.navigate` delegates to `freshNavigate`.

- [ ] **Step 1: Write the failing tests** in `src/state/viewState.test.ts`:

```ts
const v = { sort: "year" as const, dir: "asc" as const, query: "mal", scrollY: 1200 };
test("routeKey is the path without query", () => {
  expect(routeKey({ name: "home" })).toBe("/");
  expect(routeKey({ name: "mood", mood: "tense" })).toBe("/mood/tense");
  expect(routeKey({ name: "director", director: "Bong Joon Ho" })).toBe("/director/bong-joon-ho");
});
test("save, load, clear", () => {
  expect(loadView("/mood/tense")).toBeNull();
  saveView("/mood/tense", v);
  expect(loadView("/mood/tense")).toEqual(v);
  clearView("/mood/tense");
  expect(loadView("/mood/tense")).toBeNull();
});
test("keyOf takes the path between # and ?", () => {
  expect(keyOf("#/mood/dread?type=Movie")).toBe("/mood/dread");
  expect(keyOf("#/")).toBe("/");
  expect(keyOf("#/director/x")).toBe("/director/x");
});
```

Vitest runs in node (no DOM), so `freshNavigate` itself is covered by Task 5's "fresh visit starts at defaults" e2e; export `keyOf(hash: string): string` and test that instead.

- [ ] **Step 2: Run** `npx vitest run src/state/viewState.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/state/viewState.ts`** with a module-level `Map<string, ViewState>`. `keyOf(hash)` = the text between the leading `#` and the first `?`. `routeKey(r)` = `keyOf(serializeRoute(r, { type: "all", runtime: "any", hideWatched: false }))`. `freshNavigate(hash)`: `clearView(keyOf(hash))`; then `if (location.hash === hash) scrollTo(0, 0); else location.hash = hash;`.

- [ ] **Step 4: Update `useRoute`.** `navigate` becomes `freshNavigate(serializeRoute(r, filters))`. Remove the `scrollTo(0, 0)` from `navigate` and from `onHash` (pages own scrolling from Task 5 on; until then add `useLayoutEffect(() => { if (!loadView(routeKey(route))) scrollTo(0, 0); }, [route])` in `useRoute` so behaviour is unchanged for now). Set `history.scrollRestoration = "manual"` once in the mount effect.

- [ ] **Step 5: Run** `npx vitest run && npm run typecheck && npx playwright test` → PASS (existing nav/scroll tests still pass).

- [ ] **Step 6: Commit** `feat: per-route view-state cache and fresh navigation`

---

### Task 3: Rows one step up, director links, clickable poster/title

**Files:**
- Create: `src/components/ui/DirectorLink.tsx`
- Modify: `src/components/FilmRow.tsx`, `src/components/Hero.tsx`, `src/components/MoodPage.tsx` (pass `onOpen`), `e2e/mood-page.spec.ts`, `e2e/mobile.spec.ts`

**Interfaces:**
- Consumes: `slugify` (Task 1), `freshNavigate` (Task 2).
- Produces: `DirectorLink({ name, variant = "muted", onNavigate }: { name: string; variant?: "muted" | "hero"; onNavigate?: () => void })` → `<a href={`#/director/${slugify(name)}`}>`; plain left click → `preventDefault`, `onNavigate?.()`, `freshNavigate(href)`; modified/middle clicks fall through so open-in-new-tab works. `FilmRow` gains `onOpen: (t: Title) => void`; poster and title are `<button type="button">`s with `aria-label={`Open ${t.title}`}` calling it.

- [ ] **Step 1: Add e2e.** `e2e/mood-page.spec.ts`:

```ts
test("director name in a row links to the director page", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await rows(page).filter({ hasText: "Parasite" }).getByRole("link", { name: "Bong Joon Ho" }).click();
  await expect(page).toHaveURL(/#\/director\/bong-joon-ho$/);
});
test("co-directors are linked separately", async ({ page }) => {
  await page.goto("/#/mood/tense");
  const row = rows(page).filter({ hasText: "REC" }).first();
  await expect(row.getByRole("link", { name: "Jaume Balagueró" })).toBeVisible();
  await expect(row.getByRole("link", { name: "Paco Plaza" })).toBeVisible();
});
```

`e2e/mobile.spec.ts`: change "row blurbs are clamped to two lines" to expect `"3"` and rename to "…three lines". Add `e2e/smoke.spec.ts`:

```ts
test("hero byline links the director", async ({ page }) => {
  await page.goto("/");
  const link = page.locator('h1 + * a[href^="#/director/"]');
  // Series have no director; step the hero forward until one has a byline link (deck is seeded daily).
  for (let i = 0; i < 12 && (await link.count()) === 0; i++) await page.keyboard.press("ArrowRight");
  await expect(link.first()).toHaveAttribute("href", /^#\/director\/[a-z0-9-]+$/);
  await link.first().click();
  await expect(page).toHaveURL(/#\/director\//);
});
```

- [ ] **Step 2: Run** `npx playwright test e2e/mood-page.spec.ts -g "director|co-directors"` → FAIL (no link). The director page itself 404s to home until Task 4; the URL assertion alone is enough here.

- [ ] **Step 3: Implement `DirectorLink`.** Variants: `muted` = `underline decoration-white/40 underline-offset-[3px] hover:text-fg hover:decoration-fg`; `hero` = `font-semibold tracking-[0.15em] text-fg hover:underline`.

- [ ] **Step 4: Resize `FilmRow` and link directors.** Targets from the spec table:
  - poster `h-24 w-16 md:h-[135px] md:w-[90px]`; number `text-2xl md:text-4xl` (`w-8 md:w-12`); title `text-2xl md:text-[32px]`; facts `text-sm md:text-[15px] text-fg-2`; genre/feels `text-[13px] md:text-sm text-fg-3`; blurb `text-[15px] md:text-base line-clamp-3 md:line-clamp-none max-w-[640px]`; row `py-7 md:py-8`, gap `gap-4 md:gap-6`.
  - facts line becomes JSX: `[year, directors (each `<DirectorLink>` joined by " & "), runtime, IMDb]` separated by " · "; omit the director part when `t.directors.length === 0`.
  - action pill class in `MoodPage` (`action` const): `text-[11px] md:text-xs`.
  - Poster and title wrapped in buttons calling `onOpen(t)`; `MoodPage` passes `onOpen={() => {}}` for now (Task 7 wires the card).

- [ ] **Step 5: Hero byline.** Replace `by.name` bold with `title.directors.map((d, i) => <Fragment key={d}>{i > 0 && " & "}<DirectorLink name={d} variant="hero" /></Fragment>)`; keep `by.lead`. `byline()` in `lib/format.ts` keeps its signature (still used for `lead`).

- [ ] **Step 6: Run** `npm run lint && npm run typecheck && npm test && npx playwright test` → PASS.

- [ ] **Step 7: Visual check** with playwright-cli: `#/mood/tense` at 1440×900 and 390×844. Confirm the row matches mockup "B" (poster ~90px desktop, blurb 16px), director underlined, no horizontal scroll on phone. Screenshots to the scratchpad.

- [ ] **Step 8: Commit** `feat: bigger film rows with director links`

---

### Task 4: BrowsePage and director pages

**Files:**
- Create: `src/components/BrowsePage.tsx`
- Modify: `src/lib/browse.ts`, `src/lib/browse.test.ts`, `src/App.tsx`, `src/components/Nav.tsx` (treat `director` like `mood` for the Moods button), `e2e/mood-page.spec.ts`
- Delete: `src/components/MoodPage.tsx`

**Interfaces:**
- Consumes: `titlesBy` (Task 1), `inMood`, `matches`, `moodAccent`, `moodLabel`, `countLabel`.
- Produces: `type Scope = { kind: "mood"; mood: MoodFilter } | { kind: "director"; name: string }` in `lib/browse.ts`; `scopeTitles(titles: Title[], scope: Scope): Title[]`; `scopeLabel(scope: Scope): string`; `scopeKey(scope): string` (`"mood:tense"` / `"director:Name"`, used as React key). `BrowsePage({ scope, titles, filters, onFilters, onTrailer })` with the same prop types `MoodPage` had.

- [ ] **Step 1: Write the failing tests** in `src/lib/browse.test.ts`:

```ts
test("scopeTitles narrows by mood or by exact director", () => {
  const ts = [mk({ id: "a", moods: ["tense"], directors: ["X"] }), mk({ id: "b", moods: ["dread"], directors: ["X", "Y"] }), mk({ id: "c", moods: ["tense"], directors: [] })];
  expect(scopeTitles(ts, { kind: "mood", mood: "tense" }).map((t) => t.id)).toEqual(["a", "c"]);
  expect(scopeTitles(ts, { kind: "mood", mood: "all" }).length).toBe(3);
  expect(scopeTitles(ts, { kind: "director", name: "X" }).map((t) => t.id)).toEqual(["a", "b"]);
});
test("scopeLabel", () => {
  expect(scopeLabel({ kind: "mood", mood: "slow-and-quiet" })).toBe("Slow & quiet");
  expect(scopeLabel({ kind: "director", name: "Billy Wilder" })).toBe("Billy Wilder");
});
```

And e2e in `e2e/mood-page.spec.ts`:

```ts
test("director page lists that director's titles, best rated first", async ({ page }) => {
  await page.goto("/#/director/bong-joon-ho");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bong Joon Ho");
  await expect(page.getByText("3 titles", { exact: true })).toBeVisible();
  await expect(rows(page)).toHaveCount(3);
  await expect(rows(page).first()).toContainText("Parasite");
  await expect(page.getByTestId("mood-accent")).toHaveCount(0);
});
test("director page honours the type filter from the URL", async ({ page }) => {
  await page.goto("/#/director/billy-wilder?type=Series");
  await expect(page.getByText("Nothing matches")).toBeVisible();
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/browse.test.ts` → FAIL; the e2e → FAIL (redirects home).

- [ ] **Step 3: Add `Scope`, `scopeTitles`, `scopeLabel`, `scopeKey` to `lib/browse.ts`.**

- [ ] **Step 4: Create `BrowsePage.tsx`** by moving `MoodPage.tsx`'s body over: replace `inMood(t, mood)` with `scopeTitles(titles, scope)`, `moodLabel(mood)` with `scopeLabel(scope)`; render the accent glow and `MoodDot` only when `scope.kind === "mood"`. Everything else (controls, kept, rows, empty state) unchanged. Delete `MoodPage.tsx`.

- [ ] **Step 5: Wire `App.tsx`.** `route.name === "mood"` → `<BrowsePage key={scopeKey(scope)} scope={{ kind: "mood", mood: route.mood }} …/>`; `route.name === "director"` → `scope={{ kind: "director", name: route.director }}`. `Nav` already keys off `route.name === "home"`, so a director route gets the dropdown for free; only the menu-item highlight (`route.name === "mood" && route.mood === m.slug`) needs to still typecheck against the widened `Route`.

- [ ] **Step 6: Run** `npm run lint && npm run typecheck && npm test && npx playwright test` → PASS.

- [ ] **Step 7: Commit** `feat: director pages via a shared BrowsePage`

---

### Task 5: Back restores sort, search and scroll

**Files:**
- Modify: `src/components/BrowsePage.tsx`, `src/state/useRoute.ts`, `e2e/mood-page.spec.ts`

**Interfaces:**
- Consumes: `saveView`, `loadView`, `routeKey` (Task 2). `BrowsePage` gains a `viewKey: string` prop (= `routeKey(route)`, passed from `App`).

- [ ] **Step 1: Add e2e** to `e2e/mood-page.spec.ts`:

```ts
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
```

(Tense sorted by year with search "a" must have > 16 rows; if not, pick a search letter that does.)

- [ ] **Step 2: Run** `npx playwright test e2e/mood-page.spec.ts -g "Back|fresh visit"` → first test FAILS (sort reset).

- [ ] **Step 3: Restore in `BrowsePage`.** Initial `sort`/`dir`/`query` come from `loadView(viewKey)` when present, else defaults. Keep latest `sort/dir/query` in a ref. `useLayoutEffect(() => { scrollTo(0, loadView(viewKey)?.scrollY ?? 0); return () => saveView(viewKey, { ...latest.current, scrollY }); }, [viewKey])`. The cleanup runs before the next page's layout effect, so `scrollY` is still the departing page's.

- [ ] **Step 4: Finish `useRoute`.** Remove the interim `useLayoutEffect` from Task 2 Step 4; instead `App` adds `useLayoutEffect(() => { if (route.name === "home") scrollTo(0, 0); }, [route])` (home always starts at the top; browse pages scroll themselves).

- [ ] **Step 5: Run** `npm run lint && npm run typecheck && npm test && npx playwright test` → PASS. Check the existing "Back keeps a filter changed on a mood page" and trailer-Back tests still pass.

- [ ] **Step 6: Commit** `feat: Back restores browse sort, search and scroll`

---

### Task 6: Grid view and toggle

**Files:**
- Create: `src/components/FilmGrid.tsx`, `src/components/ui/ViewToggle.tsx`
- Modify: `src/lib/format.ts`, `src/lib/format.test.ts`, `src/components/BrowsePage.tsx`, `e2e/mood-page.spec.ts`, `e2e/mobile.spec.ts`

**Interfaces:**
- Consumes: `FadeImg`, `ratingText`, `usePersistedState`, `moodAccent`.
- Produces: `gridCaption(t: Title): string`; `type View = "list" | "grid"`; `VIEW_KEY = "tonight.view.v1"`; `ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void })` → two `<button aria-pressed>`s labelled "Grid view" / "List view"; `FilmGrid({ titles, entries, accent, onOpen }: { titles: Title[]; entries: Record<string, UserEntry>; accent: string; onOpen: (t: Title) => void })`.

- [ ] **Step 1: Write the failing tests.** `src/lib/format.test.ts`:

```ts
test("gridCaption", () => {
  expect(gridCaption(mk({ year: 2019, type: "Series", imdbRating: 9.3 }))).toBe("2019 · Series · IMDb 9.3");
  expect(gridCaption(mk({ year: null, type: "Movie", imdbRating: null }))).toBe("— · Movie · IMDb —");
});
```

`e2e/mood-page.spec.ts`:

```ts
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
test("grid cell without a poster renders a placeholder box", async ({ page }) => {
  await page.goto("/#/mood/dreamy");
  await page.getByRole("button", { name: "Grid view" }).click();
  const cell = page.getByTestId("grid").getByRole("button", { name: "Pink Floyd: Shine on You Crazy Diamond" });
  await expect(cell).toBeVisible();
  await expect(cell.locator("img")).toHaveCount(0);
});
```

`e2e/mobile.spec.ts`:

```ts
test("grid is two-up with no horizontal scroll", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("button", { name: "Grid view" }).click();
  const cols = await page.getByTestId("grid").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(cols).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
```

- [ ] **Step 2: Run** them → FAIL.

- [ ] **Step 3: Implement `gridCaption`** in `lib/format.ts`: `${t.year ?? "—"} · ${t.type} · IMDb ${ratingText(t)}`.

- [ ] **Step 4: Implement `ViewToggle`** as a segmented control: `inline-flex overflow-hidden rounded-full border border-white/25`; each button `px-3 py-2`, active = `bg-fg text-bg`, inactive = `text-fg-2 hover:text-fg`; inline SVG grid (4 squares) and list (3 lines) icons, 14px, `aria-hidden`.

- [ ] **Step 5: Implement `FilmGrid`.** `<div data-testid="grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">`; each cell a `<button type="button" aria-label={t.title} onClick={() => onOpen(t)} style={{ "--accent": accent }}>` with `data-dimmed` + `opacity-45` when `entries[t.id]?.watched`; poster `FadeImg` at `aspect-[2/3] w-full rounded-sm object-cover` inside a `group relative overflow-hidden` wrapper reusing the mood-tile `edge` border treatment and `motion-safe:group-hover:scale-105`; no poster → `<div className="aspect-[2/3] w-full rounded-sm bg-white/5" />`; caption `<p className="mt-2 text-[13px] text-fg-3">{gridCaption(t)}</p>`.

- [ ] **Step 6: Wire `BrowsePage`.** `const [view, setView] = usePersistedState<View>(VIEW_KEY, "list")`; `<ViewToggle>` first in the control group; body renders `FilmGrid` when `view === "grid"` (same `rows`, same empty state, `accent` = `moodAccent(mood)` or `#FFFFFF`), else the existing rows. `onOpen` is still a no-op until Task 7.

- [ ] **Step 7: Run** `npm run lint && npm run typecheck && npm test && npx playwright test` → PASS.

- [ ] **Step 8: Visual check** with playwright-cli: `#/mood/tense` grid at 1440×900 (5-up) and 390×844 (2-up). Screenshots to the scratchpad.

- [ ] **Step 9: Commit** `feat: grid view with persisted toggle`

---

### Task 7: Title card

**Files:**
- Create: `src/components/TitleCard.tsx`
- Modify: `src/components/ui/Overlay.tsx` (topmost-only Esc), `src/components/BrowsePage.tsx`, `e2e/mood-page.spec.ts`, `e2e/mobile.spec.ts`

**Interfaces:**
- Consumes: `Overlay`, `FadeImg`, `DirectorLink`, `MoodDot`, `UserControls`, `genreLine`, `ratingText`, `formatRuntime`, `moodLabel`.
- Produces: `TitleCard({ title, onClose, onTrailer, onWatched }: { title: Title | null; onClose: () => void; onTrailer: (t: Title) => void; onWatched: (id: string, watched: boolean) => void })`. `Overlay` gains an internal open-stack so only the topmost dialog handles Esc.

- [ ] **Step 1: Add e2e.** `e2e/mood-page.spec.ts`:

```ts
test("poster click opens the title card; Esc closes it", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await rows(page).first().getByRole("button", { name: "Open Chernobyl" }).first().click();
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
  await rows(page).filter({ hasText: "Parasite" }).getByRole("button", { name: "Open Parasite" }).first().click();
  await page.getByRole("dialog", { name: "Parasite" }).getByRole("link", { name: "Bong Joon Ho" }).click();
  await expect(page).toHaveURL(/#\/director\/bong-joon-ho$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
```

`e2e/mobile.spec.ts`:

```ts
test("title card is a scrollable bottom sheet", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await page.getByRole("article").first().getByRole("button", { name: /^Open / }).first().tap();
  const sheet = page.getByRole("dialog").getByTestId("card");
  const box = (await sheet.boundingBox())!;
  const vh = await page.evaluate(() => innerHeight);
  expect(Math.round(box.y + box.height)).toBe(vh);
  expect(box.width).toBe(390);
  expect(await sheet.evaluate((el) => getComputedStyle(el).overflowY)).toBe("auto");
});
```

- [ ] **Step 2: Run** them → FAIL.

- [ ] **Step 3: Overlay Esc stack.** Module-level `const stack: symbol[] = []`; each `Overlay` gets a `useRef(Symbol())`; on open push, on cleanup remove; `onKey` acts only when `stack.at(-1) === id`.

- [ ] **Step 4: Implement `TitleCard`.** `<Overlay open={Boolean(title)} onClose={onClose} label={title?.title ?? ""}>` containing `<div data-testid="card" className="fixed inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto border-t border-white/10 bg-[#0a0a0a] md:static md:w-[720px] md:rounded-md md:border">`. Inside: backdrop block (`h-[180px] md:h-[220px]`, blur-up `backdropSmall` under `FadeImg backdrop`, gradient `to top, #0a0a0a, transparent` overlay; omitted when no backdrop); content `flex gap-5 px-5 pb-6 -mt-[60px] md:-mt-[70px] md:px-6` with poster `w-[84px] md:w-[110px] aspect-[2/3]`; text column: `<h2 className="font-display text-[30px] uppercase leading-none md:text-[32px]">`, facts line (year · `DirectorLink`s with `onNavigate={onClose}` · runtime · IMDb) at `text-[15px] text-fg-2`, genre + feels with `MoodDot`s at `text-sm text-fg-3`, overview `text-base leading-relaxed text-fg-2`, action row: Trailer (if `trailerKey`, calls `onTrailer(title)`), IMDb ↗, `<UserControls id={title.id} onWatched={(w) => onWatched(title.id, w)} />`. Reuse the `action` pill classes from `BrowsePage` (export them from a small `ui/actionClass.ts` or pass as a prop; builder's call).

- [ ] **Step 5: Wire `BrowsePage`.** `const [cardFor, setCardFor] = useState<Title | null>(null)`; `onOpen={setCardFor}` on `FilmRow` and `FilmGrid`; render `<TitleCard title={cardFor} onClose={() => setCardFor(null)} onTrailer={onTrailer} onWatched={(id, w) => w && keep(id)} />` after the body. Route change unmounts the page, closing the card.

- [ ] **Step 6: Run** `npm run lint && npm run typecheck && npm test && npx playwright test` → PASS.

- [ ] **Step 7: Visual check** with playwright-cli: card open on `#/mood/tense` at 1440×900 and 390×844 (list and grid). Compare to the approved mockup. Screenshots to the scratchpad.

- [ ] **Step 8: Commit** `feat: title card overlay from rows and grid`

---

### Task 8: Final verification

- [ ] **Step 1:** `npm run lint && npm run typecheck && npm test && npx playwright test` → all green; paste the summary lines.
- [ ] **Step 2:** Screenshots (scratchpad): mood page list, mood page grid, card open desktop + phone, director page. Confirm against the spec's size table and the approved mockups.
- [ ] **Step 3:** Hand back with the commit list. Do not push.
