# "Why this" + Home Shelves Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A data-built "Why this" sentence in the hero, and three poster shelves (Under 90 minutes, Waiting the longest, More from tonight's director) below the mood tiles, each with a "See all" browse page.

**Architecture:** Pure functions in `src/lib/` (`whyThis`, `shelves`) compute everything from the filtered deck; components only render. The IMDb "added" date is carried into `titles.json` by the enrich script. Shelf browse pages reuse `BrowsePage` through a new `shelf` scope and route. Home gains Back-only scroll restoration through the existing `viewState` store.

**Tech Stack:** React 19 + TypeScript + Vite, Tailwind v4 tokens (`text-fg-2`, `font-display`, `Label`), Vitest, Playwright (`desktop` + `mobile` projects), oxlint. Node enrich script tested with Vitest.

**Spec:** `docs/superpowers/specs/2026-10-30-home-shelves-design.md`

## Global Constraints

- No new runtime dependencies.
- No new user-facing copy beyond the strings pinned in this plan (they are copied from the spec).
- Series `runtime` is per episode: never show it as a film length, never put a series in the short shelf.
- Shelves and "why this" read from `state.deck` (already filtered); hidden films never appear.
- Run `npm run lint`, `npm test`, `npm run e2e` before every commit. Conventional commit messages. Do not push.
- Hash routing only (`#/…`); filters stay global and mirrored in the query as today.
- Mobile breakpoint: Tailwind `md` (768 px). Verify mobile with the Playwright `mobile` project before calling a UI task done.

## Review Focus

1. **Everything filtered out** (e.g. type=Series + runtime=short): the deck is empty, home shows the empty state and no shelves; nothing throws. Test in Task 5 (`homeShelves` on an empty deck) and Task 8 e2e isn't needed beyond that.
2. **A garbage or empty `Created` cell** in the CSV: `added` is `null`, not `"Invalid Date"`. Test in Task 1.
3. **A series or a director-less title as tonight's pick**: no director shelf, no weeknight sentence. Tests in Tasks 3 and 5.
4. **`added` in the future or `today` before `added`** (clock skew, re-exported CSV): the waiting reason stays off. Test in Task 3.
5. **Back to home after "See all"** when the user scrolled the shelf rail horizontally: page scroll restores, rail position is not promised. Test in Task 9 covers page scroll only.

---

### Task 1: `added` date in the data

**Files:**
- Modify: `src/lib/types.ts` (Title), `src/lib/testUtils.ts` (`mk`)
- Modify: `scripts/lib/transform.mjs` (`toTitle`), `scripts/enrich.mjs` (`main`)
- Test: `scripts/__tests__/transform.test.mjs`, `scripts/__tests__/enrich.test.mjs`
- Regenerate: `src/data/titles.json`

**Interfaces:**
- Produces: `Title.added: string | null` (ISO `YYYY-MM-DD`). `mk()` defaults `added: null`.

- [ ] **Step 1: Failing transform tests.** In `transform.test.mjs`, extend the existing movie assertion with `added: "2017-06-17"` and add:

```js
test("added comes from Created; empty or garbage → null", () => {
  const row = { ...byId.tt0051378, Created: "" };
  expect(toTitle(row, null, null).added).toBeNull();
  expect(toTitle({ ...row, Created: "not a date" }, null, null).added).toBeNull();
  expect(toTitle({ ...row, Created: "2013-12-14" }, null, null).added).toBe("2013-12-14");
});
```

- [ ] **Step 2: Run** `npx vitest run scripts/__tests__/transform.test.mjs` → FAIL (`added` undefined).

- [ ] **Step 3: Implement** in `transform.mjs`: `const isoDate = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s ?? "") ? s : null);` and `added: isoDate(row.Created)` in `toTitle`.

- [ ] **Step 4: Run** the transform tests → PASS.

- [ ] **Step 5: Failing enrich test.** In `enrich.test.mjs`:

```js
test("added merges from the CSV on every run, including skipped titles", async () => {
  const opts = setup();
  await main({ ...opts, tmdb: fakeTmdb() });
  const out = JSON.parse(readFileSync(opts.outPath, "utf8"));
  // Simulate an output written before `added` existed.
  writeFileSync(opts.outPath, JSON.stringify(out.map(({ added, ...t }) => t)));
  const again = fakeTmdb();
  expect(await main({ ...opts, tmdb: again })).toMatchObject({ written: 0, skipped: 3 });
  expect(again.find).not.toHaveBeenCalled();
  const addedOf = Object.fromEntries(JSON.parse(readFileSync(opts.outPath, "utf8")).map((t) => [t.id, t.added]));
  expect(addedOf).toEqual({ tt0051378: "2017-06-17", tt5753856: rows[1].Created, tt6207098: rows[2].Created });
});
```

(Read `rows` via `readWatchlist(fx("rows.csv"))` at the top of the test file, as `transform.test.mjs` does; use the fixture's real `Created` values in the assertion rather than `rows[i]` if clearer.)

- [ ] **Step 6: Run** `npx vitest run scripts/__tests__/enrich.test.mjs` → FAIL.

- [ ] **Step 7: Implement** in `enrich.mjs` `main`, after the loop and before `applyMoods`: for every CSV row with an entry in `byId`, set `entry.added = isoDate(row.Created)` (export `isoDate` from `transform.mjs`). Comment: "CSV-only fields merge on every run, like moods."

- [ ] **Step 8: Run** enrich tests → PASS.

- [ ] **Step 9: Types.** Add `added: string | null;` to `Title` in `types.ts` (after `runtime`), `added: null` to `mk()` in `testUtils.ts`. Run `npx tsc --noEmit` → clean.

- [ ] **Step 10: Regenerate.** Run `npm run enrich`. Expect `written: 0, skipped: 342`. Check `git diff --stat src/data/titles.json` and that `git diff src/data/titles.json | grep '^[+-] ' | grep -v '"added"'` prints nothing (only `added` lines changed). If `.env` lacks a TMDB key and the script refuses to start without one, make the key optional when nothing needs fetching rather than fabricating one.

- [ ] **Step 11: Verify** `npm run lint && npm test` → green.

- [ ] **Step 12: Commit** — `feat: carry IMDb added date into titles`

---

### Task 2: "Added" sort key

**Files:**
- Modify: `src/lib/browse.ts` (`SortKey`, `SORTS`, `NUMERIC`)
- Test: `src/lib/browse.test.ts`

**Interfaces:**
- Produces: `SortKey` includes `"added"`; `SORTS` entry `{ key: "added", label: "Added", dir: "asc" }`. `SortMenu` picks it up from `SORTS` with no change.

- [ ] **Step 1: Failing test** (follow the `runtime: asc, nulls last` test's shape):

```ts
test("added: asc, nulls last", () => {
  const [a, b, c] = [mk({ id: "a", added: "2017-06-17" }), mk({ id: "b", added: null }), mk({ id: "c", added: "2013-12-14" })];
  expect(sortTitles([a, b, c], "added", {}).map((t) => t.id)).toEqual(["c", "a", "b"]);
  expect(defaultDir("added")).toBe("asc");
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/browse.test.ts` → FAIL.

- [ ] **Step 3: Implement.** `NUMERIC.added = (t) => (t.added ? Date.parse(t.added) : null)`. Add the `SORTS` entry after `runtime`.

- [ ] **Step 4: Run** → PASS. `npm run lint`.

- [ ] **Step 5: Commit** — `feat: sort browse pages by date added`

---

### Task 3: `whyThis`

**Files:**
- Create: `src/lib/whyThis.ts`, `src/lib/whyThis.test.ts`

**Interfaces:**
- Consumes: `moodLabel` (`lib/moods`), `titlesBy` (`lib/directors`), `Title.added`.
- Produces: `export interface WhyCtx { titles: Title[]; deck: Title[]; today: Date }` and `export function whyThis(t: Title, ctx: WhyCtx): string | null`.

Exact strings (from the spec):

| Reason | Sentence |
|---|---|
| waiting | `It's been waiting on your list since {Month YYYY}.` / `It's been waiting on your list since {Month YYYY}, longer than anything else.` |
| movie length | `At {runtime} minutes, a weeknight will do.` |
| series length | `Episodes run {runtime} minutes, so you can try one tonight.` |
| director | `{Director} is on your list {n} more time.` / `…{n} more times.` |
| mood | `Picked for a {Mood label} night.` |

Rules: priority waiting → length → director → mood; keep the first two; join with a single space; `null` when none. Waiting applies when `added` is ≥ 3 years before `today` **and** `added` ≤ the 25th-percentile `added` of the deck's titles that have one (percentile = the value at index `floor((n - 1) * 0.25)` of the ascending dates; ties included). "Longer than anything else" when `added` equals the deck's minimum. Movie length: `type === "Movie"`, `runtime != null && runtime < 100`. Series length: `type === "Series"`, `runtime != null`. Director: first director with `titlesBy(titles, d).length > 1`, `n = length - 1`. Month via `toLocaleDateString("en-US", { month: "long", year: "numeric" })` on a UTC-parsed date (`new Date(added + "T00:00:00Z")`, `timeZone: "UTC"`).

- [ ] **Step 1: Failing tests.** Use `today = new Date("2026-10-30")`, deck helper `deckOf(...added: (string|null)[])`:

```ts
test("movie: waiting + weeknight, oldest in deck", () => {
  const t = mk({ id: "x", added: "2013-12-14", runtime: 99 });
  const deck = [t, mk({ id: "y", added: "2015-11-05" }), mk({ id: "z", added: "2017-06-17" }), mk({ id: "w", added: "2024-01-01" })];
  expect(whyThis(t, { titles: deck, deck, today })).toBe(
    "It's been waiting on your list since December 2013, longer than anything else. At 99 minutes, a weeknight will do.",
  );
});
test("waiting needs 3 years and the oldest quarter", () => {
  const recent = mk({ id: "x", added: "2024-06-01", runtime: 120 });
  const deck = [recent, mk({ id: "y", added: "2013-01-01" }), mk({ id: "z", added: "2014-01-01" }), mk({ id: "w", added: "2015-01-01" })];
  expect(whyThis(recent, { titles: deck, deck, today })).toBe("Picked for a Bittersweet night.");
  const oldButNotOldest = mk({ id: "q", added: "2020-01-01", runtime: 120 });
  const deck2 = [oldButNotOldest, mk({ id: "a", added: "2013-01-01" }), mk({ id: "b", added: "2014-01-01" }), mk({ id: "c", added: "2015-01-01" }), mk({ id: "d", added: "2016-01-01" })];
  expect(whyThis(oldButNotOldest, { titles: deck2, deck: deck2, today })).toBe("Picked for a Bittersweet night.");
});
test("series never gets the weeknight line", () => {
  const s = mk({ id: "s", type: "Series", runtime: 60, added: null, directors: [] });
  expect(whyThis(s, { titles: [s], deck: [s], today })).toBe("Episodes run 60 minutes, so you can try one tonight. Picked for a Bittersweet night.");
});
test("director counts the other titles; singular and plural", () => {
  const a = mk({ id: "a", runtime: 120, added: null, directors: ["Billy Wilder"] });
  const b = mk({ id: "b", directors: ["Billy Wilder"] });
  expect(whyThis(a, { titles: [a, b], deck: [a, b], today })).toBe("Billy Wilder is on your list 1 more time. Picked for a Bittersweet night.");
  const c = mk({ id: "c", directors: ["Billy Wilder"] });
  expect(whyThis(a, { titles: [a, b, c], deck: [a], today })).toMatch(/2 more times\./);
});
test("future or missing added, long runtime, lone director, untagged → null", () => {
  const t = mk({ id: "t", added: "2027-01-01", runtime: 150, moods: [] });
  expect(whyThis(t, { titles: [t], deck: [t], today })).toBeNull();
  expect(whyThis(mk({ ...t, added: null }), { titles: [t], deck: [t], today })).toBeNull();
});
test("ties on the oldest date both count as longest", () => {
  const a = mk({ id: "a", added: "2013-01-01", runtime: 150, moods: [] });
  const b = mk({ id: "b", added: "2013-01-01" });
  expect(whyThis(a, { titles: [a, b], deck: [a, b, mk({ id: "c", added: "2020-01-01" }), mk({ id: "d", added: "2021-01-01" })], today })).toMatch(/longer than anything else\.$/);
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/whyThis.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** `whyThis` per the rules above.
- [ ] **Step 4: Run** → PASS. `npm run lint`.
- [ ] **Step 5: Commit** — `feat: why-this sentence builder`

---

### Task 4: "Why this" in the hero

**Files:**
- Modify: `src/components/Hero.tsx`, `src/components/HeroSection.tsx`, `src/App.tsx`
- Test: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `whyThis`, `WhyCtx` (Task 3); `moodAccent` (`lib/moods`).
- Produces: `Hero` prop `why: string | null`; `HeroSection` prop `why: string | null` passed through.

- [ ] **Step 1: Failing e2e** in `smoke.spec.ts`:

```ts
test("hero explains the pick", async ({ page }) => {
  const why = page.getByTestId("why-this");
  // A film with no applicable reason renders no line; flip past it (at most 5 times).
  for (let i = 0; i < 5 && (await why.count()) === 0; i++) await page.keyboard.press("ArrowRight");
  await expect(why).toHaveText(/^Why this: .+\.$/);
});
```

- [ ] **Step 2: Run** `npx playwright test e2e/smoke.spec.ts -g "explains"` → FAIL.
- [ ] **Step 3: Implement.** `Hero` renders, between `<FactsRow/>` and the buttons, when `why`:

```tsx
<p data-testid="why-this" className="mt-4 max-w-[520px] font-serif text-sm italic leading-relaxed" style={{ color: accent }}>
  Why this: {why}
</p>
```

`accent = title.moods[0] ? moodAccent(title.moods[0]) : "var(--color-fg-2)"`. If the project has no `font-serif` token, use the body face; italic is the requirement. In `App.tsx` (`Site`): `const today = useMemo(() => new Date(), []); const why = current ? whyThis(current, { titles, deck: state.deck, today }) : null;` and pass `why` into `HeroSection` → `Hero`.

- [ ] **Step 4: Run** the e2e → PASS. Run `npx playwright test --project=mobile` and look at a mobile screenshot (`page.screenshot`) to confirm the line doesn't collide with the thumb strip; if it does, add `line-clamp-4` to the overview on mobile (`line-clamp-4 md:line-clamp-none`).
- [ ] **Step 5: Verify** `npm run lint && npm test && npm run e2e` → green.
- [ ] **Step 6: Commit** — `feat: hero says why this film`

---

### Task 5: `homeShelves`

**Files:**
- Create: `src/lib/shelves.ts`, `src/lib/shelves.test.ts`

**Interfaces:**
- Consumes: `Route` (`lib/route`, gains `shelf` in Task 6: define `ShelfId` here, Task 6 imports it), `slugify`.
- Produces:

```ts
export type ShelfId = "short" | "waiting";
export interface Shelf {
  id: ShelfId | "director";
  heading: string;              // "Under 90 minutes" | "Waiting the longest" | `More from ${director}`
  count: number;                // full set size
  items: Title[];               // first 12
  meta: (t: Title) => string;   // "1957 · 88 min" | "since 2015" | "2014 · 165 min"
  seeAll: Route;                // { name: "shelf", shelf } | { name: "director", director }
}
export const SHELF_LIMIT = 12;
export function shelfTitles(titles: Title[], id: ShelfId): Title[];   // set rule + order, no limit (used by scopeTitles in Task 6)
export function homeShelves(deck: Title[], current: Title | undefined): Shelf[];
```

Set rules: `short` = `type === "Movie" && runtime != null && runtime < 90`, order runtime asc then `title.localeCompare`; `waiting` = `added != null`, order added asc then title; `director` = other deck titles with `current.directors[0]` in `directors`, excluding `current`, order year desc (nulls last). Meta: `${year ?? "—"} · ${runtime} min` for short and director (`"—"` for null runtime), `since ${added.slice(0, 4)}` for waiting. Shelves with zero items are omitted. Order: short, waiting, director.

- [ ] **Step 1: Failing tests:**

```ts
test("short: movies under 90 only, shortest first, series excluded", ...)   // a 60-min Series is absent; 88 before 89
test("waiting: oldest added first, null added excluded, meta 'since YYYY'", ...)
test("items capped at 12, count is the full size", ...)                      // 15 short films → items 12, count 15
test("director shelf follows the hero and excludes it; omitted without others or for no directors", ...)
test("empty deck → no shelves", () => expect(homeShelves([], undefined)).toEqual([]));
test("seeAll routes", ...)  // short → { name: "shelf", shelf: "short" }; director → { name: "director", director: "Billy Wilder" }
```

Write each with `mk` and exact expected id arrays.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; lint.
- [ ] **Step 5: Commit** — `feat: home shelf builder`

---

### Task 6: Shelf route and browse scope

**Files:**
- Modify: `src/lib/route.ts`, `src/lib/browse.ts`, `src/App.tsx` (scope mapping), `src/components/BrowsePage.tsx` (default sort)
- Test: `src/lib/route.test.ts`, `src/lib/browse.test.ts`, `e2e/mood-page.spec.ts`

**Interfaces:**
- Consumes: `ShelfId`, `shelfTitles` (Task 5).
- Produces: `Route` gains `{ name: "shelf"; shelf: ShelfId }` at `#/shelf/<id>`; `Scope` gains `{ kind: "shelf"; shelf: ShelfId }`; `scopeLabel` → the shelf heading; `scopeKey` → `shelf:<id>`; `export function defaultSort(scope: Scope): SortKey` (`waiting` → `"added"`, `short` → `"runtime"`, else `"imdb"`).

- [ ] **Step 1: Failing tests.** `route.test.ts`: `parseRoute("#/shelf/waiting?type=Movie")` → `{ route: { name: "shelf", shelf: "waiting" }, filters: { type: "Movie" }, redirect: false }`; `"#/shelf/zzz"` → home redirect; `serializeRoute({ name: "shelf", shelf: "short" }, F())` → `"#/shelf/short"`. `browse.test.ts`: `scopeTitles(ts, { kind: "shelf", shelf: "short" })` excludes a series and a 95-min film; `scopeLabel` → `"Under 90 minutes"` / `"Waiting the longest"`; `defaultSort` for the three cases.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** In `BrowsePage`, replace both `"imdb"` literals with `defaultSort(scope)`. In `App.tsx` extend the `scope` ternary with `route.name === "shelf" ? { kind: "shelf", shelf: route.shelf } : …`. `Nav` needs no change (it keys off `route.name === "home"`).
- [ ] **Step 4: Failing e2e** in `mood-page.spec.ts`:

```ts
test("shelf page: waiting sorts by Added, short lists movies under 90", async ({ page }) => {
  await page.goto("/#/shelf/waiting");
  await expect(page.locator("h1")).toHaveText("Waiting the longest");
  await expect(page.getByRole("button", { name: "Sort: Added" })).toBeVisible();
  await page.goto("/#/shelf/short");
  await expect(page.locator("h1")).toHaveText("Under 90 minutes");
  await expect(page.getByRole("button", { name: "Sort: Runtime" })).toBeVisible();
});
```

(Series exclusion is pinned by the unit test; don't assert it through row text.) `ShelfId` lives in `shelves.ts` and `route.ts` imports it with `import type` so the `route` ↔ `shelves` reference stays type-only and no runtime cycle exists.

- [ ] **Step 5: Run** → PASS. `npm run lint && npm test && npm run e2e`.
- [ ] **Step 6: Commit** — `feat: shelf browse pages at #/shelf/<id>`

---

### Task 7: Extract `PosterCell`

**Files:**
- Create: `src/components/ui/PosterCell.tsx`
- Modify: `src/components/FilmGrid.tsx`

**Interfaces:**
- Produces: `PosterCell({ title, dimmed, accent, caption, onOpen, className? })`: the `<button>` from `FilmGrid` (aria-label, data-dimmed, `--accent` style, FadeImg poster with hover scale, edge border, placeholder when no poster) with `caption: ReactNode` rendered below.

- [ ] **Step 1: Move** the cell JSX out of `FilmGrid` into `PosterCell`; `FilmGrid` maps to `<PosterCell … caption={gridCaption(t)} />`. Pure refactor: no class changes.
- [ ] **Step 2: Verify** `npm run lint && npm test && npm run e2e` → green (grid e2e in `mood-page.spec.ts` / `mobile.spec.ts` cover it).
- [ ] **Step 3: Commit** — `refactor: PosterCell shared by grid and shelves`

---

### Task 8: `HomeShelves` on the home page

**Files:**
- Create: `src/components/HomeShelves.tsx`, `src/components/Shelf.tsx`
- Modify: `src/App.tsx`
- Test: `e2e/home-shelves.spec.ts` (new), `e2e/mobile.spec.ts`

**Interfaces:**
- Consumes: `homeShelves`, `Shelf` (Task 5); `PosterCell` (Task 7); `TitleCard`, `useUserData`; `navigate` from `useRoute`.
- Produces: `HomeShelves({ deck, current, onNavigate: (r: Route) => void, onTrailer })` renders one `Shelf` per entry and owns `cardFor` + `<TitleCard>`. `Shelf({ shelf, entries, onOpen, onSeeAll })`.

Markup per shelf: `<section aria-labelledby={id}>`, heading row = `<h2 id className="font-display text-2xl uppercase md:text-3xl">{heading}</h2>` + `<Label muted>· {countLabel(count)}</Label>` + `<button onClick={onSeeAll}>` styled as `Label` with text `See all →`. Rail: `<div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">` with trailing spacer; each `PosterCell` `className="w-[110px] flex-none snap-start md:w-[118px]"`, `accent="#FFFFFF"`, caption = title (one line, `truncate`) + `<Label muted>{shelf.meta(t)}</Label>`. Section wrapper in `App`: `<section className="px-5 pb-16 md:px-11 md:pb-24">` between the moods section and `<Footer/>`.

- [ ] **Step 1: Failing e2e** `e2e/home-shelves.spec.ts` (reuse the `beforeEach` from `smoke.spec.ts`):

```ts
test("home lists the two fixed shelves with posters", async ({ page }) => {
  const short = page.getByRole("region", { name: "Under 90 minutes" });
  await expect(short).toBeVisible();
  await expect(short.getByRole("button", { name: /.+/ }).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Waiting the longest" })).toBeVisible();
});
test("See all opens the shelf page sorted by Added", async ({ page }) => {
  await page.getByRole("region", { name: "Waiting the longest" }).getByRole("button", { name: "See all →" }).click();
  await expect(page).toHaveURL(/#\/shelf\/waiting/);
  await expect(page.locator("h1")).toHaveText("Waiting the longest");
});
test("a shelf poster opens the title card", async ({ page }) => {
  const cell = page.getByRole("region", { name: "Under 90 minutes" }).getByRole("button", { name: /.+/ }).first();
  const name = await cell.getAttribute("aria-label");
  await cell.click();
  await expect(page.getByRole("dialog", { name: name! })).toBeVisible();
});
```

Check `TitleCard`/`Overlay` for the actual role and label (`label={t.title}`); adjust the dialog locator to match.

- [ ] **Step 2: Run** `npx playwright test e2e/home-shelves.spec.ts` → FAIL.
- [ ] **Step 3: Implement** `Shelf`, `HomeShelves`, wire into `App` with `deck={state.deck} current={current} onNavigate={navigate} onTrailer={setTrailerFor}`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Mobile e2e** in `mobile.spec.ts`:

```ts
test("shelves scroll sideways without widening the page", async ({ page }) => {
  const rail = page.getByRole("region", { name: "Under 90 minutes" }).getByTestId("rail");
  await rail.scrollIntoViewIfNeeded();
  expect(await rail.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
```

Add `data-testid="rail"` to the rail div. Run `npx playwright test --project=mobile` → PASS; take a screenshot and eyeball heading wrap.

- [ ] **Step 6: Verify** `npm run lint && npm test && npm run e2e` → green.
- [ ] **Step 7: Commit** — `feat: poster shelves on the home page`

---

### Task 9: Home restores scroll on Back

**Files:**
- Modify: `src/state/viewState.ts` (`ViewState` browse fields optional), `src/App.tsx`
- Test: `src/state/viewState.test.ts` (type-only; existing tests keep passing), `e2e/home-shelves.spec.ts`

**Interfaces:**
- Produces: `interface ViewState { scrollY: number; sort?: SortKey; dir?: SortDir; query?: string }`. Home saves `{ scrollY }` under key `"/"` on unmount and restores on mount; `freshNavigate` already clears the key on fresh navigation.

- [ ] **Step 1: Failing e2e:**

```ts
test("Back from See all returns to the shelf you left", async ({ page }) => {
  const heading = page.getByRole("heading", { name: "Waiting the longest" });
  await heading.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  expect(before).toBeGreaterThan(0);
  await page.getByRole("region", { name: "Waiting the longest" }).getByRole("button", { name: "See all →" }).click();
  await expect(page.locator("h1")).toHaveText("Waiting the longest");
  await page.goBack();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(before);
});
test("the wordmark still opens home at the top", async ({ page }) => {
  await page.evaluate(() => scrollTo(0, 1200));
  await page.getByRole("link", { name: "Not Tonight" }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});
```

(Check `Nav` for the wordmark's role/name and adjust.)

- [ ] **Step 2: Run** → FAIL (home scrolls to top on Back).
- [ ] **Step 3: Implement.** Make the three browse fields optional in `ViewState` (`BrowsePage` already uses `saved?.sort ?? …`). In `App.tsx` remove the `scrollTo(0, 0)` layout effect; move the home JSX into a `Home` component (same file or `components/Home.tsx`) with:

```ts
useLayoutEffect(() => {
  scrollTo(0, loadView("/")?.scrollY ?? 0);
  return () => saveView("/", { scrollY });
}, []);
```

Keep the existing `mood-page.spec.ts` test "following a link to a mood page starts at the top" and "Back from a mood page returns to the same hero film" green.

- [ ] **Step 4: Run** `npm run lint && npm test && npm run e2e` → green.
- [ ] **Step 5: Commit** — `feat: home keeps its scroll position on Back`

---

### Task 10: Wrap-up

- [ ] **Step 1:** Update the spec's `Status:` line to `implemented 2026-10-30` and the memory file's batch 3 entry (done, commit range).
- [ ] **Step 2:** `npm run lint && npm test && npm run e2e` one last time on the full suite; both Playwright projects.
- [ ] **Step 3:** Commit — `docs: batch 3 spec status`
