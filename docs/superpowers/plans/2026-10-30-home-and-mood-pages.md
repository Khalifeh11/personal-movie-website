# Home + Mood Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the locked full-screen deck into a scrolling home (nav → hero → mood tiles → footer) plus a page per mood with detailed, sortable, searchable film rows; brand it "Not Tonight".

**Architecture:** A hand-rolled hash router (`#/`, `#/mood/<slug>?type=…&rt=…`) parsed by pure functions in `src/lib/route.ts`. `useDeck` stays mounted in `App` for the whole session (so the hero keeps its place across routes) and owns the global filters; `useRoute` owns the URL. Mood is no longer a filter: home's hero deck is all titles, the mood page takes its mood from the route. Pure helpers (`moodTiles`, `sortTitles`, `searchTitles`) are unit-tested; components only render.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind v4, Vitest, Playwright. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-30-home-and-mood-pages-design.md` (amends `docs/superpowers/specs/2026-10-30-movie-picker-design.md`). This plan replaces Tasks 10–13 of `docs/superpowers/plans/2026-10-30-movie-picker.md`; Tasks 1–9 are done.

## Global Constraints

- No new dependencies (runtime or dev). Ask the owner first if one seems needed.
- Tailwind v4 tokens in `@theme` (`src/index.css`); reuse `Label`, `Pill`, `RoundButton`; no arbitrary values except where a token would be absurd.
- Fonts/colours as before: Anton (`font-display`), Bebas Neue (`font-counter`), Space Grotesk (`font-ui`); `#000/#fff/#bbb/#777`, no accents.
- Exact copy (no other invented copy):
  - Wordmark: `Not Tonight`
  - Nav items: `Moods`, `Filters`; mobile menu button is an icon with `aria-label="Menu"`
  - Mood section heading: `How do you want to feel?`
  - Counts: `N titles` (`1 title` singular)
  - Dropdown/tile for all: dropdown `All titles`, tile `All`
  - Hero empty: `Nothing matches` + `Loosen the filters.`
  - Mood page empty: `Nothing matches` + `Clear the search or loosen the filters.`
  - TMDB line verbatim: `This product uses the TMDB API but is not endorsed or certified by TMDB.`
- Mood slugs/labels unchanged (`BUCKETS` in `src/lib/moods.ts`, plus `all`/`All`).
- Hash filter values keep current casing: `type=Movie|Series`, `rt=short|mid|long`.
- Removed entirely: mood picker in header, `BottomNav`/`NavTab`, Shuffle (UI + reducer action), "The film" tab, Browse overlay, grid/list switch, mouse-wheel flipping.
- Breakpoint: mobile ≤ 760 px (`md:` = 768 is the existing convention; keep it).
- Sparse/empty moods: minimal handling only (don't crash, don't look broken). Current data has 20 titles; `unsettling` has 0, one title has no poster/trailer.
- Commands: `npm test`, `npm run lint`, `npm run typecheck`, `npx playwright test`. Never run `npm run dev`/`build`. Conventional commits, no push.

## Review Focus

1. Legacy or malformed hashes (`#mood=on-edge`, `#/mood/zzz`, `#/mood/`, `#/nope?type=Bogus`) → treated as home (unknown mood redirects to `#/`), valid filters still apply, nothing throws. Pinned in Task 1 (unit) and Task 4 (e2e).
2. A title with `poster: null` (Pink Floyd) → tile collage shows a dark panel in that slot; mood-page row shows a dark poster box, no broken `<img>`. Pinned in Task 3 (unit) and Task 4 (unit/e2e).
3. A title with `trailerKey: null` → no Trailer button in hero or its row. Pinned in Task 5.
4. Ticking Watched on a mood-page row with Hide watched on → row stays (dimmed, checked); after navigating away and back it's gone. Pinned in Task 6.
5. Browser Back from a mood page → home shows the same hero film and counter as before leaving; filters still in the URL. Pinned in Task 4.

---

## File Structure

```
src/lib/route.ts (+ .test.ts)        # Route type, parseRoute, serializeRoute
src/lib/hash.ts (+ .test.ts)         # query-string <-> filters (mood removed)
src/lib/filters.ts (+ .test.ts)      # matches() without mood; inMood()
src/lib/moodTiles.ts (+ .test.ts)    # deck → tile data
src/lib/browse.ts (+ .test.ts)       # sortTitles, searchTitles
src/lib/types.ts                     # Filters loses `mood`
src/state/deck.ts (+ .test.ts)       # no shuffle; resolveInitialFilters via parseRoute
src/state/useDeck.ts                 # persists filters to localStorage only
src/state/useRoute.ts                # hashchange listener, navigate, URL mirroring
src/components/Nav.tsx               # wordmark, Moods (scroll / dropdown), Filters, mobile menu
src/components/HeroSection.tsx       # full-height hero: Backdrop, Hero, arrows, counter, ThumbStrip, swipe
src/components/MoodTiles.tsx
src/components/MoodPage.tsx
src/components/FilmRow.tsx
src/components/Footer.tsx
src/components/ui/Overlay.tsx        # full-screen modal primitive
src/components/TrailerOverlay.tsx
src/components/UserControls.tsx      # Watched, StarRating, Note
src/components/EmptyState.tsx        # takes the hint line as a prop
deleted: Header.tsx, BottomNav.tsx, ui/NavTab.tsx
e2e/smoke.spec.ts, e2e/filters.spec.ts, e2e/mood-page.spec.ts
```

---

### Task 1: Route parsing, mood out of filters, no shuffle

**Files:**
- Create: `src/lib/route.ts`, `src/lib/route.test.ts`
- Modify: `src/lib/types.ts`, `src/lib/hash.ts`, `src/lib/hash.test.ts`, `src/lib/filters.ts`, `src/lib/filters.test.ts`, `src/lib/testUtils.ts`, `src/state/deck.ts`, `src/state/deck.test.ts`, `src/state/useDeck.ts`, `src/App.tsx`, `src/components/Header.tsx`, `e2e/smoke.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  // types.ts
  export interface Filters { type: TypeFilter; runtime: RuntimeBand; hideWatched: boolean }   // `mood` removed
  // hash.ts — now operates on a bare query string (no "#", no path)
  export type QueryFilters = Partial<Pick<Filters, "type" | "runtime">>;
  export function parseQuery(query: string): QueryFilters
  export function serializeQuery(f: Filters): string        // "type=Movie&rt=mid", "" when defaults
  // route.ts
  export type Route = { name: "home" } | { name: "mood"; mood: MoodFilter };
  export function parseRoute(hash: string): { route: Route; filters: QueryFilters; redirect: boolean }
  export function serializeRoute(route: Route, f: Filters): string   // "#/", "#/?rt=mid", "#/mood/on-edge?type=Movie"
  // filters.ts
  export function matches(t: Title, f: Filters, user: Record<string, UserEntry>): boolean   // no mood check
  export function inMood(t: Title, mood: MoodFilter): boolean
  // deck.ts — DeckAction loses "shuffle"; resolveInitialFilters(hash, stored) reads filters via parseRoute(hash).filters
  ```
- `parseRoute` rules: strip `#`; split at first `?`. Path `""`, `/` → home. `/mood/<slug>` with a known slug or `all` → mood. Any other path, including `/mood/` and unknown slugs → home with `redirect: true`. A hash with no leading `/` (legacy `#mood=x&type=Movie`) → home, `redirect: true`, and its `type`/`rt` still parsed from the whole string. Never throws.

- [ ] **Step 1: Write failing tests** in `route.test.ts`:
  - `parseRoute("")`, `("#")`, `("#/")` → `{ route: {name:"home"}, filters: {}, redirect: false }`
  - `parseRoute("#/mood/on-edge?type=Movie&rt=mid")` → mood `on-edge`, filters `{type:"Movie", runtime:"mid"}`, `redirect: false`
  - `parseRoute("#/mood/all")` → mood `all`
  - `parseRoute("#/mood/zzz")`, `("#/mood/")`, `("#/nope?type=Bogus")` → home, `redirect: true`, filters `{}`
  - `parseRoute("#mood=on-edge&type=Series")` → home, `redirect: true`, filters `{type:"Series"}`
  - `serializeRoute({name:"home"}, F())` → `"#/"`; `serializeRoute({name:"mood",mood:"moved"}, F({runtime:"long"}))` → `"#/mood/moved?rt=long"`; round-trip through `parseRoute`.
  Update `hash.test.ts` to `parseQuery`/`serializeQuery` (no mood); `filters.test.ts`: replace the "mood all vs bucket" case with `inMood` cases (`all` matches everything, bucket matches only itself); `deck.test.ts`: delete the shuffle test and the mood part of "setFilters keeps current title…" (use `runtime` instead); `F()` in `testUtils.ts` drops `mood`.
- [ ] **Step 2: Run** `npm test` → FAIL (`route.ts` missing, type errors).
- [ ] **Step 3: Implement.** `useDeck` stops writing the hash (keeps writing `localStorage` under `FILTERS_KEY`; stored `mood` key is just ignored). Make the app still compile: `Header` loses the mood row (`mood`/`onMood` props removed), `App` drops `setFilters({ mood })` and the `shuffle` tab branch. In `e2e/smoke.spec.ts` delete "picking a mood updates hash…".
- [ ] **Step 4: Run** `npm test && npm run typecheck && npm run lint` → PASS.
- [ ] **Step 5: Commit** — `refactor: hash routes; mood leaves filters; drop shuffle`

---

### Task 2: Router hook, nav, scrolling home with hero section and footer

**Files:**
- Create: `src/state/useRoute.ts`, `src/components/Nav.tsx`, `src/components/HeroSection.tsx`, `src/components/Footer.tsx`, `public/tmdb.svg`
- Modify: `src/App.tsx`, `src/components/Hero.tsx`, `src/components/Backdrop.tsx`, `src/components/EmptyState.tsx`, `index.html`, `e2e/smoke.spec.ts`, `e2e/filters.spec.ts`
- Delete: `src/components/Header.tsx`, `src/components/BottomNav.tsx`, `src/components/ui/NavTab.tsx`

**Interfaces:**
- Consumes: `parseRoute`, `serializeRoute`, `Route` (Task 1); `useDeck` (existing).
- Produces:
  ```ts
  // useRoute.ts
  export function useRoute(filters: Filters): { route: Route; navigate: (r: Route) => void }
  // Nav.tsx
  export function Nav(props: { route: Route; onNavigate: (r: Route) => void; onOpenFilters: () => void }): JSX.Element
  // HeroSection.tsx — owns the full-height hero; flipping handlers live here
  export function HeroSection(props: { state: DeckState; current: Title | undefined; count: string; dispatch: (a: DeckAction) => void; active: boolean }): JSX.Element
  // EmptyState.tsx
  export function EmptyState(props: { hint: string }): JSX.Element
  ```
- `useRoute`: initial route from `parseRoute(location.hash)`; on `redirect` replace the URL with `serializeRoute(home, filters)`. Listens to `hashchange`. `navigate(r)` sets `location.hash` (new history entry) and `scrollTo(0, 0)`. Effect on `[route, filters]`: `history.replaceState(null, "", serializeRoute(route, filters))`.
- `App`: `<Nav>` fixed on top; route `home` renders `<HeroSection>` + `<section id="moods">` (heading `How do you want to feel?` in `Label`; tiles come in Task 3) + `<Footer>`; route `mood` renders nothing below the nav yet (Task 4). `FiltersDrawer` unchanged. The root drops `h-dvh overflow-hidden`; the page scrolls.
- `Backdrop` becomes `absolute inset-0` inside the hero (scrolls away with it), not `fixed`.
- `HeroSection`: `min-h-dvh` relative section; contains Backdrop, `Hero` (now always shows the blurb; `showBlurb` prop removed) or `EmptyState hint="Loosen the filters."`, ←/→ `RoundButton`s, counter (`data-testid="counter"`, `font-counter`, placed near the ThumbStrip), `ThumbStrip`. Arrow keys flip only while `active` (route is home). Touch swipe listeners attach to the section element, not `window`. **No wheel handler.** Rotated hint text becomes `Swipe or press → for the next one`.
- `Nav`: wordmark `Not Tonight` (`font-display`, link → `navigate(home)`); right side `Moods` (on home: `document.getElementById("moods")?.scrollIntoView({ behavior: "smooth" })`; mood-page dropdown arrives in Task 4) and `Filters`. Transparent while `scrollY < 40` on home, else solid `bg-bg/90 backdrop-blur border-b border-white/10`. ≤ 760 px: right side replaced by an icon button (`aria-label="Menu"`, `aria-expanded`) toggling a panel with the same two items.
- `Footer`: TMDB logo (`public/tmdb.svg`, the official logo from TMDB's logos page; if it can't be fetched, leave a `TODO: tmdb logo` comment and ship the text only) + the verbatim attribution line in `Label muted`.
- `index.html` `<title>`: `Not Tonight`.

- [ ] **Step 1: Write failing e2e** in `e2e/smoke.spec.ts`:
  - "home shows a film and arrows move" (existing) still passes.
  - "wheel scrolls the page instead of flipping": record h1 text, `page.mouse.wheel(0, 800)`, expect `window.scrollY > 0` and h1 text unchanged.
  - "nav goes solid after scrolling": nav element has no `bg-bg/90` class at top; after `window.scrollTo(0, 600)` it does (assert via a `data-solid="true"` attribute rather than class names).
  - "Moods scrolls to the mood section": click `Moods` → `#moods` is in the viewport.
  - "legacy hash redirects home": `goto("/#mood=on-edge&type=Series")` → URL matches `/#\/\?type=Series$/`.
  - "footer shows TMDB attribution": text visible after scrolling to the bottom.
  Update `filters.spec.ts` URL assertions from `/type=Series/` style (still valid) — confirm they pass unchanged.
- [ ] **Step 2: Run** `npx playwright test` → new tests FAIL.
- [ ] **Step 3: Implement** the above; delete Header/BottomNav/NavTab.
- [ ] **Step 4: Run** `npm test && npm run typecheck && npm run lint && npx playwright test` → PASS.
- [ ] **Step 5: Commit** — `feat: Not Tonight nav, scrolling home, hero section and footer`

---

### Task 3: Mood tiles

**Files:**
- Create: `src/lib/moodTiles.ts`, `src/lib/moodTiles.test.ts`, `src/components/MoodTiles.tsx`
- Modify: `src/App.tsx`, `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `state.deck` (already filtered by global filters, all moods, in daily-shuffle order); `BUCKETS`, `bucketLabel`.
- Produces:
  ```ts
  export interface Tile { slug: MoodFilter; label: string; count: number; posters: (string | null)[] }  // posters.length === 4 always
  export function moodTiles(deck: Title[]): Tile[]   // BUCKETS order, then { slug: "all", label: "All" }
  export function countLabel(n: number): string      // "1 title" / "N titles"
  // MoodTiles.tsx
  export function MoodTiles(props: { tiles: Tile[]; onOpen: (mood: MoodFilter) => void }): JSX.Element
  ```
- `posters`: the first 4 non-null posters of that mood in deck order, padded with `null` to length 4.

- [ ] **Step 1: Write failing tests** in `moodTiles.test.ts`:
  - returns 8 tiles; slugs equal `[...BUCKETS.map(b => b.slug), "all"]`
  - counts per bucket and `all` = deck length
  - posters skip `null` posters and keep deck order; a mood with 2 posters → `[p1, p2, null, null]`; a mood with 0 titles → count 0, four `null`s
  - `countLabel(1) === "1 title"`, `countLabel(0) === "0 titles"`, `countLabel(5) === "5 titles"`
- [ ] **Step 2: Run** `npm test -- moodTiles` → FAIL.
- [ ] **Step 3: Implement** `moodTiles`, `countLabel`, and `MoodTiles`: grid `grid-cols-2` (≥ 1024 px: `grid-cols-4`); each tile is a `<button>` with `aria-label="<label>, <countLabel>"`, four vertical poster strips (`object-cover`, dimmed), a `null` slot is a plain dark panel; label bottom-left in `font-display` uppercase; count bottom-right in `Label`; `count === 0` → `opacity-40`. Click → `onOpen(slug)` → `navigate({ name: "mood", mood: slug })`. Mount under the heading in `#moods`.
- [ ] **Step 4: Run** unit → PASS; add e2e: home shows 8 tiles; the `Unsettling` tile reads `0 titles`; clicking `On edge` → URL `#/mood/on-edge`.
- [ ] **Step 5: Run** full checks → PASS. **Commit** — `feat: mood tiles on home`

---

### Task 4: Mood page with catalog rows, sort, search, nav dropdown

**Files:**
- Create: `src/lib/browse.ts`, `src/lib/browse.test.ts`, `src/components/MoodPage.tsx`, `src/components/FilmRow.tsx`, `e2e/mood-page.spec.ts`
- Modify: `src/App.tsx`, `src/components/Nav.tsx`

**Interfaces:**
- Consumes: `inMood`, `matches`, `countLabel`, `formatRuntime`, `genreLine`, `ratingText`, `byline`, `EmptyState`, `useUserData`.
- Produces:
  ```ts
  // browse.ts
  export type SortKey = "imdb" | "year" | "runtime" | "title" | "mine";
  export const SORTS: { key: SortKey; label: string }[]   // IMDb, Year, Runtime, Title, Your rating
  export function sortTitles(ts: Title[], key: SortKey, user: Record<string, UserEntry>): Title[]
  export function searchTitles(ts: Title[], q: string): Title[]
  // MoodPage.tsx
  export function MoodPage(props: { mood: MoodFilter; titles: Title[]; filters: Filters; onFilters: (f: Partial<Filters>) => void; onTrailer: (t: Title) => void }): JSX.Element
  // FilmRow.tsx
  export function FilmRow(props: { n: number; title: Title; dimmed: boolean; actions: ReactNode }): JSX.Element
  ```
- Sort directions are fixed per key (no direction toggle): imdb desc, year desc, runtime asc, title asc (locale compare), mine desc; nulls always last; stable for ties. Default `imdb`.
- `searchTitles`: case- and diacritic-insensitive (`normalize("NFD")` + strip marks) substring over `title`, `originalTitle`, `directors`; blank query returns input.
- `MoodPage`: header = mood label (`bucketLabel`, large `font-display`), `countLabel(rows.length)`, sort `<select aria-label="Sort">`, search `<input type="search" aria-label="Search">`, `Pill` `Hide watched` bound to the global `filters.hideWatched` via `onFilters`. Rows = `titles` → `inMood` → `matches(filters, entries)` → search → sort. `rows.length === 0` → `EmptyState hint="Clear the search or loosen the filters."`. Numbering `01`, `02`… (two-digit pad).
- `FilmRow`: number (`font-display`, muted), poster ~62×93 (`null` → dark box), title (`font-display` uppercase), line `year · director(s) · runtime · IMDb x.x`, line `genres · Feels: <mood>`, blurb (`line-clamp-2` on mobile, full on desktop), then `actions`. Whole row is not clickable. In this task `actions` = `IMDb ↗` link only (Trailer in Task 5, user controls in Task 6).
- Nav on a mood page: solid from the start; `Moods` opens a dropdown (`aria-expanded`, Esc/click-outside closes) listing every bucket label plus `All titles`, each → `navigate({ name: "mood", mood })`. Mobile menu shows the same list inline.

- [ ] **Step 1: Write failing tests** in `browse.test.ts`:
  - imdb sort desc with a `null` rating last; year desc; runtime asc with `null` last; title asc; `mine` uses `user[id].rating` desc, unrated last
  - `searchTitles(ts, "samour")` matches "Le Samouraï"; `"MALLE"` matches by director "Louis Malle"; `""` returns all
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** lib, `FilmRow`, `MoodPage`, nav dropdown; App renders `<MoodPage>` for mood routes.
- [ ] **Step 4: e2e** in `mood-page.spec.ts`:
  - `goto("/#/mood/on-edge")` → heading `On edge`, `5 titles`, 5 rows, first row number `01`; sort `IMDb` puts "Anatomy of a Murder" (8.0) first
  - search `malle` → 1 row, "Elevator to the Gallows"; search `zzzz` → `Nothing matches` and `Clear the search or loosen the filters.`
  - `goto("/#/mood/zzz")` → URL becomes `#/`
  - Back keeps hero: on home press → twice, read h1 + counter, click `On edge` tile, `page.goBack()` → same h1 and counter
  - nav dropdown: on a mood page open `Moods`, click `Moved` → URL `#/mood/moved`, heading `Moved`
  - row for the title with no poster (`goto("/#/mood/transported")`, "Pink Floyd…") renders without an `<img>` in its poster slot
- [ ] **Step 5: Run** full checks → PASS. **Commit** — `feat: mood page with sortable, searchable film rows`

---

### Task 5: Trailer overlay (hero + rows)

**Files:**
- Create: `src/components/ui/Overlay.tsx`, `src/components/TrailerOverlay.tsx`
- Modify: `src/App.tsx`, `src/components/Hero.tsx`, `src/components/MoodPage.tsx`, `e2e/smoke.spec.ts`, `e2e/mood-page.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export function Overlay(props: { open: boolean; onClose: () => void; label: string; children: ReactNode }): JSX.Element | null
  export function TrailerOverlay(props: { title: Title | null; onClose: () => void }): JSX.Element | null   // open when title != null
  ```
- `Overlay`: `role="dialog" aria-modal aria-label`, fixed full-screen `bg-black/90`, `z-(--z-overlay)`, close on ✕ (`aria-label="Close"`), Esc, click on the backdrop; focus moves into it and returns to the opener on close; body scroll locked while open.
- `TrailerOverlay`: frame `aspect-video w-[min(1100px,86vw)]`; `title.backdrop` shown as poster frame until iframe `onLoad`; iframe `src=https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`, `allow="autoplay; fullscreen"`, `title={`${title.title} trailer`}`.
- One `trailerFor: Title | null` state in `App`; Hero's `▶ Trailer` and each row's `▶ Trailer` set it. Hero gets `▶ Trailer` and `IMDb ↗` as pill-style buttons/links next to the facts. Both hidden when `trailerKey` is null.

- [ ] **Step 1: e2e (failing)**: on home press → until a `▶ Trailer` button is visible (≤ 20 presses), click it → `iframe[src*="youtube-nocookie.com/embed/"]` visible → Esc → iframe gone. On `#/mood/on-edge`, click the first row's `▶ Trailer` → iframe visible → click `Close` → gone. On `#/mood/transported`, the Pink Floyd row has no `▶ Trailer` button.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** full checks → PASS.
- [ ] **Step 5: Commit** — `feat: in-place trailer overlay from hero and mood rows`

---

### Task 6: Watched / rating / note controls

**Files:**
- Create: `src/components/UserControls.tsx`
- Modify: `src/components/Hero.tsx`, `src/components/MoodPage.tsx`, `src/components/HeroSection.tsx`, `e2e/mood-page.spec.ts`, `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `useUserData()` → `{ store, entries }`; `store.set(id, patch)`.
- Produces:
  ```ts
  export function UserControls(props: { id: string; onWatched?: (watched: boolean) => void }): JSX.Element
  ```
- Elements: `Pill` `Watched` / `✓ Watched` (`aria-pressed`); star rating (`role="slider"`, `aria-label="Your rating"`, `aria-valuemin=0.5`, `aria-valuemax=5`, `aria-valuenow`; 10 half-star hit areas; clicking the current value clears to null; ←/→ step 0.5); `Pill` `Note` / `Note •` opening a small popover `textarea` (max 500 chars, saves on blur, Esc closes).
- Hero: marking the current film watched while `hideWatched` → `dispatch({ type: "next" })` before the store write lands, so the deck advances instead of jumping (spec call from the movie-picker spec).
- Mood page keep-row rule: `MoodPage` keeps a `keptIds: Set<string>` of titles marked watched during this visit (via `onWatched(true)`). A row is shown if it passes the filter chain **or** its id is in `keptIds`. `keptIds` resets when `mood`, `filters`, sort or query change. Kept/watched rows render `dimmed` with the check.

- [ ] **Step 1: e2e (failing)** in `mood-page.spec.ts`:
  - on `#/mood/on-edge` (Hide watched on), click `Watched` on row 1 → still 5 rows, row 1 dimmed (`data-dimmed="true"`) and `✓ Watched`; click `Moods` → `Moved` → back to `On edge` via dropdown → 4 rows
  - set 4.5 stars on row 1, reload → `aria-valuenow="4.5"`
  - home: note h1, click hero `Watched` → h1 changes
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** full checks → PASS.
- [ ] **Step 5: Commit** — `feat: watched, rating and note controls on hero and mood rows`

---

### Task 7: Mobile pass, README, final verification

**Files:**
- Modify: `playwright.config.ts`, `e2e/smoke.spec.ts`, `e2e/mood-page.spec.ts`, any component needing responsive fixes
- Create: `README.md`

- [ ] **Step 1: Playwright mobile project**: `{ name: "mobile", use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } }`. Tag desktop-only tests (hover, ThumbStrip) to skip on mobile.
- [ ] **Step 2: Mobile tests**: on `/` and `/#/mood/on-edge`, `document.documentElement.scrollWidth <= 390`; `Menu` button visible, `Moods`/`Filters` hidden until it's tapped; swipe left on the hero (touch drag ≥ 60 px) changes h1; tiles are 2 per row (first two tiles share a `top`); row blurb is clamped (`-webkit-line-clamp: 2` computed).
- [ ] **Step 3: Responsive fixes** until green: hero padding 20 px, → button above the safe area, ThumbStrip/← button/rotated hint hidden, row poster ~48×72, sort/search stack under the mood heading.
- [ ] **Step 4: Visual check with playwright-cli** (owner rule) at 390×844 and 1440×900: home top, mood section, mood page, open mobile menu, trailer overlay. Save screenshots to `test-results/` and look at each one.
- [ ] **Step 5: README**: what Not Tonight is, `npm run enrich` (needs `.env` with `TMDB_API_KEY`), `npm test`, `npx playwright test`, routes (`#/`, `#/mood/<slug>`), static deploy note (`base` in `vite.config.ts` for GitHub Pages), TMDB attribution.
- [ ] **Step 6: Full verification**: `npm test && npm run lint && npm run typecheck && npx playwright test`, all green across both projects; paste summary lines in the handoff.
- [ ] **Step 7: Commit** — `feat: mobile layout, readme, e2e coverage`

---

## Self-review notes

- Spec coverage: nav (T2, dropdown T4, mobile menu T2/T7), hero changes: always blurb, Trailer/IMDb buttons, no wheel, all-titles deck (T1, T2, T5); mood tiles + counts + sparse handling (T3); mood page header/sort/search/hide watched/rows/empty/unknown slug (T4); trailer overlay (T5); watched/rating/note + keep-row call (T6); removals (T1, T2); routing + filters in query (T1, T2); footer attribution (T2); tests + mobile check (all, T7).
- Names consistent: `Route`, `parseRoute`, `serializeRoute`, `parseQuery`, `serializeQuery`, `inMood`, `moodTiles`, `countLabel`, `sortTitles`, `searchTitles`, `SORTS`, `useRoute`, `navigate`, `HeroSection`, `MoodPage`, `FilmRow`, `Overlay`, `TrailerOverlay`, `UserControls`, `EmptyState({hint})`.
- Review Focus pinned: 1→T1 + T2/T4 e2e, 2→T3 unit + T4 e2e, 3→T5 e2e, 4→T6 e2e, 5→T4 e2e.
