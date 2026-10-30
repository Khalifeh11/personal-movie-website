# Visual Refresh (batch 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mood tiles that each show one real, distinct backdrop with the mood's accent tint; a per-mood accent colour used on tiles, mood page header, hero "Feels" and nav; blur-up / fade-in image loading.

**Architecture:** `moods.json` gains `accent` and `hero`; `src/lib/moods.ts` exposes them. `moodTiles(deck, titles)` picks one backdrop per tile greedily in vocabulary order without repeats. A `FadeImg` component in `components/ui` handles fade-on-load for tiles, rows and thumbs; `Backdrop` adds a small-image blur-up layer. Accent is applied as CSS custom property `--accent` on the element, never a flat fill.

**Tech Stack:** Vite + React 19 + TS + Tailwind v4, Vitest (lib only, no DOM testing lib), Playwright e2e (desktop 1440×900, mobile 390×844).

**Spec:** `docs/superpowers/specs/2026-10-30-visual-refresh-design.md`

## Global Constraints

- No new dependencies. Don't run `npm run dev`/`build`. Conventional commits, one per task, never push.
- Accent values exactly as the spec table; `all` → `#FFFFFF`.
- Black stays the base; accent is a tint/highlight, never a fill behind text.
- `prefers-reduced-motion`: scale/zoom off (`motion-safe:`), opacity fades allowed.
- Existing e2e must keep passing, notably `smoke` "mood tiles: 18 buttons", `mobile` "tiles sit two per row", "tile mood name and count never overlap", "no horizontal scroll".
- After every UI task: `npm run lint && npm run typecheck && npm test`, and the e2e project(s) named in the task.

## Review Focus

1. A mood whose every title lacks a backdrop → tile must render (accent gradient over black), not a broken `<img>`. (Task 2 test.)
2. `hero` id pointing at a title not in `titles.json` or with `backdrop: null` → fall through to auto, no throw. (Task 2 test.)
3. Cached images: `load` fires before React attaches `onLoad` → `FadeImg` must still become visible. (Task 4 `complete` check; e2e reload assertion.)
4. A title with `backdrop === poster` (portrait fallback) auto-picked as a tile → still looks acceptable at 16:9 (`object-cover`), no layout break. Visual check in Task 3.
5. Mood page header glow must not create horizontal scroll on 390 px (existing mobile test covers it).

---

### Task 1: Accent and hero in the vocabulary

**Files:**
- Modify: `src/data/moods.json`
- Modify: `src/lib/moods.ts`
- Test: `src/lib/moods.test.ts`

**Interfaces:**
- Produces: `moodAccent(slug: MoodFilter): string`, `moodHero(slug: MoodFilter): string | null`, and `MOODS` elements typed `{ slug: MoodSlug; label: string; accent: string; hero: string | null }`.

- [ ] **Step 1: Write the failing tests** (append to `src/lib/moods.test.ts`)

```ts
test("every mood has a hex accent and a hero slot", () => {
  for (const m of MOODS) {
    expect(m.accent).toMatch(/^#[0-9A-F]{6}$/);
    expect(m.hero === null || /^tt\d+$/.test(m.hero)).toBe(true);
  }
});
test("moodAccent / moodHero", () => {
  expect(moodAccent("tense")).toBe("#E04E3A");
  expect(moodAccent("slow-and-quiet")).toBe("#6B9080");
  expect(moodAccent("all")).toBe("#FFFFFF");
  expect(moodHero("tense")).toBeNull();
  expect(moodHero("all")).toBeNull();
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/moods.test.ts` → FAIL (`moodAccent` not exported / `accent` undefined).

- [ ] **Step 3: Add `accent` and `"hero": null` to every entry in `src/data/moods.json`** using the spec table. Keep the one-object-per-line format.

- [ ] **Step 4: Implement in `src/lib/moods.ts`**: widen the `MOODS` cast type; add `moodAccent` (returns `#FFFFFF` for `all`, falls back to `#FFFFFF` for an unknown slug) and `moodHero` (null for `all`/unknown).

- [ ] **Step 5: Run** `npx vitest run src/lib/moods.test.ts` and `npx vitest run scripts` → PASS (enrich's `applyMoods` only reads slugs; confirm it still passes).

- [ ] **Step 6: Commit** `feat: per-mood accent colour and hero slot in vocabulary`

---

### Task 2: Tile backdrop picking

**Files:**
- Modify: `src/lib/moodTiles.ts`
- Modify: `src/App.tsx:44` (call site)
- Test: `src/lib/moodTiles.test.ts`

**Interfaces:**
- Consumes: `moodHero`, `moodAccent` from Task 1; `inMood` from `lib/filters`.
- Produces:
  ```ts
  export interface Tile { slug: MoodFilter; label: string; count: number; accent: string; backdrop: string | null }
  export function moodTiles(deck: Title[], titles: Title[]): Tile[]
  ```
  `backdrop` is the picked title's `backdropSmall ?? backdrop`.

- [ ] **Step 1: Replace the "posters" test** in `src/lib/moodTiles.test.ts` with these (keep the order and count tests; update the fixture so `mk` entries have `backdrop`/`backdropSmall` and ratings):

```ts
const all = [
  mk({ id: "a", moods: ["tense", "gritty"], imdbRating: 9, imdbVotes: 10, backdrop: "/a.jpg", backdropSmall: "/a-sm.jpg" }),
  mk({ id: "b", moods: ["tense"], imdbRating: 8, imdbVotes: 10, backdrop: "/b.jpg", backdropSmall: null }),
  mk({ id: "c", moods: ["gritty"], imdbRating: 9, imdbVotes: 5, backdrop: "/c.jpg", backdropSmall: "/c-sm.jpg" }),
  mk({ id: "d", moods: ["dread"], imdbRating: 9, backdrop: null }),
];
test("picks the best-rated backdrop per mood, from all titles, never reusing one", () => {
  const t = Object.fromEntries(moodTiles([], all).map((x) => [x.slug, x]));
  expect(t.tense.backdrop).toBe("/a-sm.jpg");   // a wins tense (9 > 8)
  expect(t.gritty.backdrop).toBe("/c-sm.jpg");  // a already used → c
  expect(t.dread.backdrop).toBeNull();          // only title has no backdrop
  expect(t.all.backdrop).toBe("/b.jpg");        // a, c used; b has no small → full
  expect(t.tense.count).toBe(0);                // count still from the (empty) deck
  expect(t.tense.accent).toBe("#E04E3A");
});
test("ties break by votes then id", () => {
  const x = mk({ id: "x", moods: ["funny"], imdbRating: 7, imdbVotes: 1, backdrop: "/x.jpg" });
  const y = mk({ id: "y", moods: ["funny"], imdbRating: 7, imdbVotes: 2, backdrop: "/y.jpg" });
  const z = mk({ id: "z", moods: ["funny"], imdbRating: 7, imdbVotes: 2, backdrop: "/z.jpg" });
  expect(moodTiles([], [z, x, y]).find((t) => t.slug === "funny")!.backdrop).toBe("/y.jpg");
});
test("hero override wins and is skipped by later tiles; a bad hero id falls through", () => {
  // Use vi.mock("./moods") or pass a third `heroOf` param — see Step 3.
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/moodTiles.test.ts` → FAIL (arity / `backdrop` undefined).

- [ ] **Step 3: Implement `moodTiles(deck, titles, heroOf = moodHero)`** in `src/lib/moodTiles.ts`. The optional third param is injected for tests (no `vi.mock`). Algorithm: `used = new Set<string>()`; for each slug in `[...MOODS slugs, "all"]`: candidate = `heroOf(slug)` resolved in `titles` if it has a `backdrop`; else the first of `titles.filter(inMood && backdrop && !used.has(id))` sorted by `imdbRating desc, imdbVotes desc, id asc` (null rating/votes sort as `-Infinity`); add its id to `used`; `backdrop = c.backdropSmall ?? c.backdrop`. Count unchanged (`deck.filter(inMood).length`). Fill in Step 1's hero test with `heroOf = (s) => (s === "gritty" ? "a" : s === "dread" ? "nope" : null)` and assert gritty → `/a-sm.jpg`, tense → `/b.jpg`, dread → null.

- [ ] **Step 4: Update `src/App.tsx`**: `moodTiles(state.deck, titles)`, deps `[state.deck]` (titles is module-level).

- [ ] **Step 5: Run** `npx vitest run src/lib/moodTiles.test.ts && npm run typecheck` → PASS. (`MoodTiles.tsx` will fail typecheck on `t.posters`; stub it by reading `t.backdrop` into the existing `<img>` for now, or do Task 3 before typecheck. Prefer: proceed to Task 3 and commit both together only if typecheck is red; otherwise commit now.)

- [ ] **Step 6: Commit** `feat: pick one distinct backdrop per mood tile`

---

### Task 3: Mood tile component

**Files:**
- Modify: `src/components/MoodTiles.tsx`
- Test: `e2e/smoke.spec.ts`, `e2e/mobile.spec.ts`

**Interfaces:**
- Consumes: `Tile` from Task 2. `FadeImg` from Task 4 is **not** required yet; use a plain `<img>` here and swap in Task 4.

- [ ] **Step 1: Add e2e** to `e2e/smoke.spec.ts`:

```ts
test("mood tiles show a backdrop still, distinct per tile", async ({ page }) => {
  const imgs = page.locator("#moods").getByRole("button").locator("img");
  await expect(imgs).toHaveCount(18);
  const srcs = await imgs.evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute("src")));
  expect(new Set(srcs).size).toBe(18);
  expect(srcs.every((s) => s?.startsWith("/img/backdrop"))).toBe(true);
});
```

- [ ] **Step 2: Run** `npx playwright test e2e/smoke.spec.ts -g "backdrop still"` → FAIL.

- [ ] **Step 3: Rewrite the tile markup** in `MoodTiles.tsx` per spec:
  - grid `grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4`
  - button `group relative aspect-video overflow-hidden rounded-sm bg-bg text-left` with `style={{ "--accent": t.accent } as CSSProperties}`; `opacity-40` when count 0; `aria-label` unchanged.
  - `<img src={t.backdrop} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover brightness-60 transition-[filter,transform] duration-500 ease-out group-hover:brightness-80 motion-safe:group-hover:scale-105 group-focus-visible:brightness-80 motion-safe:group-focus-visible:scale-105" />` only when `t.backdrop`; otherwise nothing (gradient alone).
  - overlay `absolute inset-0 bg-[linear-gradient(to_top,rgb(0_0_0/.85),color-mix(in_srgb,var(--accent)_25%,transparent)_55%,transparent)]`.
  - inset border `absolute inset-0 rounded-sm border border-white/10 transition-colors group-hover:border-[color-mix(in_srgb,var(--accent)_60%,transparent)] group-focus-visible:border-[...]`.
  - bottom-left stack: label `font-display text-lg uppercase leading-none md:text-2xl lg:text-3xl`; below it a row with `<span aria-hidden className="size-1.5 rounded-full bg-(--accent)" />` and `<Label className="text-[10px]">{countLabel(t.count)}</Label>`.
  Keep the count text as a separate element from the label (the overlap test locates each).

- [ ] **Step 4: Run** `npm run lint && npm run typecheck && npm test && npx playwright test e2e/smoke.spec.ts e2e/mobile.spec.ts` → PASS.

- [ ] **Step 5: Visual check** with playwright-cli: 1440×900 home scrolled to `#moods`, and 390×844. Screenshots to the scratchpad; confirm 18 distinct stills, tint visible, label legible, phones 2-up with no overlap. Note any tile where `backdrop === poster` (portrait) looks wrong and record its id in the final report for a `hero` override.

- [ ] **Step 6: Commit** `feat: backdrop mood tiles with accent tint`

---

### Task 4: FadeImg and image polish

**Files:**
- Create: `src/components/ui/FadeImg.tsx`
- Modify: `src/components/MoodTiles.tsx` (swap `<img>` → `FadeImg`), `src/components/FilmRow.tsx:656`, `src/components/ThumbStrip.tsx`, `src/components/Backdrop.tsx`
- Test: `e2e/smoke.spec.ts`, `e2e/mood-page.spec.ts`

**Interfaces:**
- Produces: `FadeImg(props: ImgHTMLAttributes<HTMLImageElement>)` — renders `<img>` with `opacity-0 transition-opacity duration-300` until loaded, then `opacity-100`; merges `className`; sets `data-loaded="true"` once loaded.

- [ ] **Step 1: Add e2e** to `e2e/smoke.spec.ts`:

```ts
test("tile stills become visible, also from cache after reload", async ({ page }) => {
  const first = page.locator("#moods img").first();
  await first.scrollIntoViewIfNeeded();
  await expect(first).toHaveAttribute("data-loaded", "true");
  await expect(first).toHaveCSS("opacity", "1");
  await page.reload();
  await page.locator("#moods img").first().scrollIntoViewIfNeeded();
  await expect(page.locator("#moods img").first()).toHaveAttribute("data-loaded", "true");
});
```
and to `e2e/mood-page.spec.ts`:
```ts
test("row posters fade in", async ({ page }) => {
  await page.goto("/#/mood/tense");
  await expect(rows(page).first().locator("img")).toHaveAttribute("data-loaded", "true");
});
```

- [ ] **Step 2: Run** those two → FAIL (no `data-loaded`).

- [ ] **Step 3: Implement `FadeImg`**: `useState(false)` loaded; `ref` callback that sets loaded if `el.complete && el.naturalWidth > 0`; `onLoad` sets loaded (and calls any passed `onLoad`). Reset loaded when `src` changes (derive: key the state on `src` via the adjust-state-on-prop-change pattern used in `Backdrop.tsx`).

- [ ] **Step 4: Swap call sites**: `MoodTiles` img → `FadeImg` (same classes); `FilmRow` poster → `FadeImg`; `ThumbStrip` background-image → `<FadeImg src={t.poster} alt="" className="h-full w-full object-cover" />` inside the existing button (keep `aria-label`, border/opacity classes on the button; render the `bg-white/10` div when no poster).

- [ ] **Step 5: Backdrop blur-up** in `Backdrop.tsx`: inside each layer's `<picture>`, render (when `l.srcSmall`) an `<img src={l.srcSmall} className="absolute inset-0 h-full w-full scale-105 object-cover blur-md">` beneath, and the full `<img>` as `FadeImg` with `duration-(--duration-bg)` on top. Keep `animate-kenburns` on a wrapper so both move together. Drop the `<source media>` swap for the full image (the small image is now always the base; on phones the full `backdrop` still loads, which is acceptable for a 342-title static site). Keep `l.blurred` behaviour.

- [ ] **Step 6: Run** `npm run lint && npm run typecheck && npm test && npx playwright test` (all projects) → PASS. Hero trailer/swipe tests exercise `Backdrop`.

- [ ] **Step 7: Visual check** with playwright-cli at 1440×900 and 390×844: home hero (press → twice, confirm no flash of black between stills), tiles, `#/mood/tense`.

- [ ] **Step 8: Commit** `feat: fade-in images and hero blur-up`

---

### Task 5: Accent on mood page, hero facts and nav

**Files:**
- Modify: `src/components/MoodPage.tsx:497-502`, `src/components/FactsRow.tsx`, `src/components/Nav.tsx:319-333`
- Test: `e2e/mood-page.spec.ts`, `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `moodAccent`, `moodLabel`, `MOODS` from Task 1.

- [ ] **Step 1: Add e2e**. `e2e/mood-page.spec.ts`:

```ts
test("mood page carries its accent", async ({ page }) => {
  await page.goto("/#/mood/tense");
  const dot = page.getByTestId("mood-accent");
  await expect(dot).toBeVisible();
  await expect(dot).toHaveCSS("background-color", "rgb(224, 78, 58)");
});
```
`e2e/smoke.spec.ts`:
```ts
test("hero Feels shows one accent dot per mood", async ({ page }) => {
  const feels = page.locator("section[aria-label=\"Tonight's film\"]").getByTestId("feels");
  const dots = feels.locator("[data-testid=mood-accent]");
  expect(await dots.count()).toBeGreaterThanOrEqual(1);
  expect(await dots.count()).toBeLessThanOrEqual(3);
});
```

- [ ] **Step 2: Run** both → FAIL.

- [ ] **Step 3: Create a tiny `MoodDot`** in `src/components/ui/MoodDot.tsx`: `MoodDot({ slug, className? })` → `<span aria-hidden data-testid="mood-accent" className="inline-block size-1.5 rounded-full" style={{ background: moodAccent(slug) }} />`. Use it in `MoodTiles` too (replace the inline dot from Task 3).

- [ ] **Step 4: MoodPage header**: wrap `<header>` in `relative`; add `<div aria-hidden className="pointer-events-none absolute -inset-x-5 -top-24 bottom-0 md:-inset-x-11" style={{ background: \`radial-gradient(60% 100% at 0% 100%, color-mix(in srgb, ${accent} 22%, transparent), transparent)\` }} />` with `overflow-hidden` on the `<main>` (or `clip-path`) so it can't widen the page. Put `<MoodDot slug={mood} />` before the count text in the `<p>`.

- [ ] **Step 5: FactsRow "Feels"**: build the value as `<span data-testid="feels" className="flex flex-wrap gap-x-3 gap-y-1">{title.moods.map((m) => <span key={m} className="inline-flex items-center gap-1.5"><MoodDot slug={m} />{moodLabel(m)}</span>)}</span>`; include the fact only when `title.moods.length > 0`. `facts` entries become `[string, ReactNode]`.

- [ ] **Step 6: Nav mood menu**: prefix each menu item with `<MoodDot slug={m.slug} className="mr-2" />`.

- [ ] **Step 7: Run** `npm run lint && npm run typecheck && npm test && npx playwright test` → PASS. Check mobile "no horizontal scroll" explicitly passed.

- [ ] **Step 8: Visual check** with playwright-cli: `#/mood/tense`, `#/mood/feel-good`, home hero, nav Moods dropdown; desktop + 390 px.

- [ ] **Step 9: Commit** `feat: mood accent on mood page, hero feels and nav`

---

### Task 6: Final verification

- [ ] **Step 1:** `npm run lint && npm run typecheck && npm test && npx playwright test` → all green; paste the summary lines.
- [ ] **Step 2:** Side-by-side screenshots (scratchpad) of home-tiles, mood page, mobile home vs. the audit shots; report any tile that needs a `hero` override (portrait backdrop, series-heavy picks) as a list of mood → suggested id for the user to decide.
- [ ] **Step 3:** Hand back with the commit list. Do not push.
