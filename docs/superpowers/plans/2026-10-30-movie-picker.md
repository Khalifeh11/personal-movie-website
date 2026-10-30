# Movie Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static, mood-first "what do I watch tonight" site over Karim's 342-title IMDb watchlist, with full-bleed one-film-at-a-time browsing, in-place trailers, a Letterboxd-style list, and local watched/rating/notes.

**Architecture:** A one-off Node enrich script turns `data/watchlist.csv` + TMDB into committed `src/data/titles.json` and images under `public/img/`. The Vite/React app is a single page: pure functions in `src/lib/` (moods, filters, seeded shuffle, URL hash, user-data store) are unit-tested with Vitest; a `useDeck` hook composes them; components under `src/components/` only render. Overlays (Trailer, Browse) and the Filters drawer sit over the deck.

**Tech Stack:** Vite 6, React 19, TypeScript 5, Tailwind v4 (`@tailwindcss/vite`), Vitest, `@playwright/test`, `csv-parse` (script only). Node ≥ 20 (uses `node --env-file`). No other runtime deps without asking the owner.

**Spec:** `docs/superpowers/specs/2026-10-30-movie-picker-design.md`

## Global Constraints

- Tailwind v4 only; all tokens in `@theme` in `src/index.css`; no arbitrary values except the hero title size (`clamp(56px,9vw,124px)`).
- Fonts: Anton (titles), Bebas Neue (counter, overlay headings), Space Grotesk (UI). Google Fonts `<link>` in `index.html`.
- Colours: bg `#000`, text `#fff`, secondary `#bbb`, muted `#777`. No other accents.
- Small UI text: uppercase, `letter-spacing` 0.25–0.3 em.
- Durations: backdrop crossfade 700 ms, title 350 ms, wheel debounce 700 ms.
- Mood buckets and their exact labels: `On edge`, `Unsettling`, `Mind-bending`, `Wry & funny`, `Transported`, `Moved`, `Real life`, plus `All`. Slugs: `on-edge`, `unsettling`, `mind-bending`, `wry-funny`, `transported`, `moved`, `real-life`, `all`.
- Runtime bands: `any`, `short` (< 100), `mid` (100–140 inclusive), `long` (> 140). Type: `all` | `Movie` | `Series`.
- Secrets only in `.env` (`TMDB_API_KEY`); `.env`, `.superpowers/` gitignored.
- No invented copy. Empty-state copy is fixed below. TMDB attribution line verbatim: "This product uses the TMDB API but is not endorsed or certified by TMDB."
- Never run `npm run dev`/`npm run build` for the owner's sake; tests, lint, `tsc`, and Playwright (which starts its own server) are fine.
- Conventional commits. Don't push.

## Review Focus

1. A title with no runtime (1 CSV row) — passes `any`, excluded from `short/mid/long`, facts row shows `—` not `NaN min`. Pinned in Task 3.
2. A title TMDB can't match (Music Video / Short) — CSV-only record with `overview: ""`, null images/trailer; hero renders on black, Trailer tab hidden, no crash. Pinned in Tasks 6 and 8.
3. All titles in a mood marked watched with "Hide watched" on — deck empty, counter `00 / 00`, empty-state copy shown, no index out of range. Pinned in Tasks 3 and 8.
4. A URL hash with an unknown mood or band (`#mood=zzz&rt=huge`) — falls back to `all`/`any` without throwing. Pinned in Task 4.
5. Importing a malformed or wrong-shaped JSON file — rejected with a message, existing data untouched. Pinned in Task 5.

---

## File Structure

```
.gitignore  .env.example  index.html  package.json  vite.config.ts
tsconfig.json  tsconfig.node.json  playwright.config.ts  README.md
data/watchlist.csv                     # copy of imdb_categorized_342.csv
scripts/enrich.mjs                     # CLI entry: node --env-file=.env scripts/enrich.mjs [--force]
scripts/lib/csv.mjs                    # readWatchlist(path) → CsvRow[]
scripts/lib/tmdb.mjs                   # makeTmdb({apiKey, fetch}) → {find, details, download}
scripts/lib/transform.mjs              # toTitle(row, tmdbDetails|null, bucketFor) → Title
scripts/__tests__/fixtures/*.json      # 3 recorded TMDB responses + 3-row CSV
scripts/__tests__/transform.test.mjs
scripts/__tests__/enrich.test.mjs      # dry-run with fake fetch
src/main.tsx  src/App.tsx  src/index.css
src/data/mood-buckets.json             # bucket → CSV moods (shared by script + app)
src/data/titles.json                   # enrich output (committed)
src/lib/types.ts  src/lib/moods.ts  src/lib/filters.ts  src/lib/shuffle.ts
src/lib/hash.ts  src/lib/userData.ts  (+ *.test.ts beside each)
src/state/useDeck.ts  src/state/useUserData.ts  src/state/usePersistedState.ts
src/components/ui/{Label,Pill,RoundButton,NavTab,Overlay}.tsx
src/components/{Backdrop,Header,Hero,FactsRow,ThumbStrip,BottomNav,EmptyState,
  FiltersDrawer,TrailerOverlay,BrowseOverlay,BrowseGrid,BrowseList,UserControls}.tsx
public/img/{backdrop,backdrop-sm,poster}/<imdbId>.jpg
e2e/smoke.spec.ts
```

---

### Task 1: Scaffold, theme tokens, shared types, mood buckets

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `.env.example`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/lib/types.ts`, `src/data/mood-buckets.json`, `src/lib/moods.ts`, `src/lib/moods.test.ts`, `data/watchlist.csv`
- Modify: none (greenfield)

**Interfaces:**
- Produces `src/lib/types.ts`:
  ```ts
  export type TitleType = "Movie" | "Series";
  export type MoodSlug = "on-edge"|"unsettling"|"mind-bending"|"wry-funny"|"transported"|"moved"|"real-life";
  export type MoodFilter = MoodSlug | "all";
  export type RuntimeBand = "any"|"short"|"mid"|"long";
  export type TypeFilter = "all"|TitleType;
  export interface Title { id: string; title: string; originalTitle: string; year: number|null; type: TitleType;
    runtime: number|null; imdbRating: number|null; imdbVotes: number|null; genres: string[]; directors: string[];
    category: string; mood: string; moodBucket: MoodSlug; themes: string[]; imdbUrl: string; overview: string;
    backdrop: string|null; backdropSmall: string|null; poster: string|null; trailerKey: string|null;
    tmdbRating: number|null; tmdbVotes: number|null; rtScore: number|null; metacritic: number|null }
  export interface Filters { mood: MoodFilter; type: TypeFilter; runtime: RuntimeBand; hideWatched: boolean }
  export interface UserEntry { watched: boolean; rating: number|null; note: string; updatedAt: string }
  ```
- Produces `src/lib/moods.ts`: `export const BUCKETS: {slug: MoodSlug; label: string}[]` (order as Global Constraints), `export function bucketFor(csvMood: string): MoodSlug` (unknown → `"moved"` + `console.warn`), `export function bucketLabel(slug: MoodFilter): string` (`"all"` → `"All"`).
- Produces `src/data/mood-buckets.json`: `{ "on-edge": ["Tense, gritty", ...], ... }` exactly the spec table.

- [ ] **Step 1: Scaffold** — `npm create vite@latest . -- --template react-ts`, then `npm i -D tailwindcss @tailwindcss/vite vitest`. Add `@tailwindcss/vite` plugin to `vite.config.ts`; add `test: { include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"] }`. Scripts: `"test": "vitest run"`, `"lint": "eslint ."`, `"typecheck": "tsc -b"`.
- [ ] **Step 2: `.gitignore`** — add `node_modules`, `dist`, `.env`, `.superpowers/`, `test-results/`, `playwright-report/`. `.env.example` contains `TMDB_API_KEY=`.
- [ ] **Step 3: Copy CSV** — `cp ~/Downloads/imdb_categorized_342.csv data/watchlist.csv`.
- [ ] **Step 4: `src/index.css`** — `@import "tailwindcss";` then `@theme` with: `--color-bg:#000; --color-fg:#fff; --color-fg-2:#bbb; --color-fg-3:#777; --font-display:"Anton"; --font-counter:"Bebas Neue"; --font-ui:"Space Grotesk"; --tracking-ui:0.26em; --tracking-wide:0.3em; --duration-bg:700ms; --duration-title:350ms; --z-shade:1; --z-ui:2; --z-overlay:5; --z-drawer:9`. Global one-offs: `@keyframes kenburns` (scale 1.04→1.12 over 8 s), `.grain` (inline SVG `feTurbulence` data-URL, opacity .07). `index.html` gets the Google Fonts link for the three families and `<title>Tonight</title>` (owner may rename).
- [ ] **Step 5: Write `src/lib/moods.test.ts`**
  ```ts
  test("maps every spec mood to its bucket", () => {
    expect(bucketFor("Tense, gritty")).toBe("on-edge");
    expect(bucketFor("Melancholic, poetic")).toBe("moved");
    expect(bucketFor("Informative, observational")).toBe("real-life");
  });
  test("unknown mood falls back to moved and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(bucketFor("Zany, unknown")).toBe("moved");
    expect(warn).toHaveBeenCalledOnce();
  });
  test("every Likely mood in the CSV is mapped", () => {
    const csv = readFileSync("data/watchlist.csv", "utf8");
    const moods = new Set([...csv.matchAll(/"([^"]+)","[^"]+"\r?\n/g)].map(m => m[1])); // Likely mood is 2nd-to-last column
    const known = new Set(Object.values(buckets).flat());
    for (const m of moods) expect(known.has(m), m).toBe(true);
  });
  test("BUCKETS order and labels", () => {
    expect(BUCKETS.map(b => b.label)).toEqual(["On edge","Unsettling","Mind-bending","Wry & funny","Transported","Moved","Real life"]);
    expect(bucketLabel("all")).toBe("All");
  });
  ```
  (If the regex proves brittle, parse with `csv-parse/sync` instead — it is a devDependency from Task 6; move its install here.)
- [ ] **Step 6: Run** `npx vitest run src/lib/moods.test.ts` — expect FAIL (module missing).
- [ ] **Step 7: Implement** `src/data/mood-buckets.json` and `src/lib/moods.ts` per Interfaces.
- [ ] **Step 8: Run** tests — PASS. Run `npm run typecheck && npm run lint` — clean.
- [ ] **Step 9: Commit** — `chore: scaffold vite+react+tailwind, theme tokens, mood buckets`

---

### Task 2: Seeded shuffle and daily seed

**Files:**
- Create: `src/lib/shuffle.ts`, `src/lib/shuffle.test.ts`

**Interfaces:**
- Produces: `export function daySeed(date?: Date): number` (YYYYMMDD as int, local time); `export function seededShuffle<T>(items: readonly T[], seed: number): T[]` (pure, Fisher–Yates with mulberry32, input untouched).

- [ ] **Step 1: Test**
  ```ts
  test("same seed same order; different seed different order", () => {
    const a = [1,2,3,4,5,6,7,8,9,10];
    expect(seededShuffle(a, 42)).toEqual(seededShuffle(a, 42));
    expect(seededShuffle(a, 42)).not.toEqual(seededShuffle(a, 43));
    expect(seededShuffle(a, 42).slice().sort((x,y)=>x-y)).toEqual(a);
    expect(a).toEqual([1,2,3,4,5,6,7,8,9,10]);
  });
  test("daySeed is YYYYMMDD", () => expect(daySeed(new Date(2026, 9, 30))).toBe(20261030));
  ```
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `feat: seeded shuffle with daily seed`

---

### Task 3: Filter logic and deck building

**Files:**
- Create: `src/lib/filters.ts`, `src/lib/filters.test.ts`

**Interfaces:**
- Consumes: `Title`, `Filters`, `UserEntry` from Task 1; `seededShuffle` from Task 2.
- Produces:
  ```ts
  export function runtimeBand(runtime: number|null): RuntimeBand|null  // null when runtime null
  export function matches(t: Title, f: Filters, user: Record<string, UserEntry>): boolean
  export function buildDeck(titles: Title[], f: Filters, user: Record<string,UserEntry>, seed: number): Title[]
  export function formatRuntime(t: Title): string  // "91 min", "60 min / ep" for Series, "—" when null
  ```

- [ ] **Step 1: Test** (use a `mk(partial)` helper that returns a full `Title` with defaults)
  ```ts
  test("runtime bands", () => {
    expect(runtimeBand(99)).toBe("short"); expect(runtimeBand(100)).toBe("mid");
    expect(runtimeBand(140)).toBe("mid"); expect(runtimeBand(141)).toBe("long"); expect(runtimeBand(null)).toBeNull();
  });
  test("null runtime passes any, fails ranged bands", () => {
    const t = mk({ runtime: null });
    expect(matches(t, F({ runtime: "any" }), {})).toBe(true);
    for (const r of ["short","mid","long"] as const) expect(matches(t, F({ runtime: r }), {})).toBe(false);
  });
  test("mood all vs bucket; type filter; hideWatched", () => {
    const t = mk({ id: "tt1", moodBucket: "on-edge", type: "Series" });
    expect(matches(t, F({ mood: "all" }), {})).toBe(true);
    expect(matches(t, F({ mood: "moved" }), {})).toBe(false);
    expect(matches(t, F({ type: "Movie" }), {})).toBe(false);
    expect(matches(t, F({ hideWatched: true }), { tt1: U({ watched: true }) })).toBe(false);
    expect(matches(t, F({ hideWatched: false }), { tt1: U({ watched: true }) })).toBe(true);
  });
  test("buildDeck is seeded and can be empty", () => {
    const ts = [mk({id:"a"}), mk({id:"b"}), mk({id:"c"})];
    expect(buildDeck(ts, F({}), {}, 1)).toEqual(buildDeck(ts, F({}), {}, 1));
    expect(buildDeck(ts, F({}), Object.fromEntries(ts.map(t=>[t.id,U({watched:true})])), 1)).toEqual([]);
  });
  test("formatRuntime", () => {
    expect(formatRuntime(mk({runtime:91}))).toBe("91 min");
    expect(formatRuntime(mk({runtime:60,type:"Series"}))).toBe("60 min / ep");
    expect(formatRuntime(mk({runtime:null}))).toBe("—");
  });
  ```
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `feat: filter matching and seeded deck builder`

---

### Task 4: URL hash ↔ filters

**Files:**
- Create: `src/lib/hash.ts`, `src/lib/hash.test.ts`

**Interfaces:**
- Produces: `export function parseHash(hash: string): Partial<Pick<Filters,"mood"|"type"|"runtime">>` (only valid values returned; invalid keys dropped); `export function serializeHash(f: Filters): string` → `#mood=on-edge&type=Movie&rt=mid`, omitting `all`/`any` values; empty string when nothing to write.

- [ ] **Step 1: Test**
  ```ts
  test("round trip", () => {
    const f: Filters = { mood:"on-edge", type:"Movie", runtime:"mid", hideWatched:true };
    expect(serializeHash(f)).toBe("#mood=on-edge&type=Movie&rt=mid");
    expect(parseHash("#mood=on-edge&type=Movie&rt=mid")).toEqual({ mood:"on-edge", type:"Movie", runtime:"mid" });
  });
  test("defaults omitted; invalid values dropped", () => {
    expect(serializeHash({ mood:"all", type:"all", runtime:"any", hideWatched:true })).toBe("");
    expect(parseHash("#mood=zzz&rt=huge&type=Movie")).toEqual({ type:"Movie" });
    expect(parseHash("")).toEqual({});
  });
  ```
- [ ] **Step 2–4:** FAIL → implement (`URLSearchParams`) → PASS.
- [ ] **Step 5: Commit** — `feat: mirror filters into URL hash`

---

### Task 5: UserData store (localStorage adapter)

**Files:**
- Create: `src/lib/userData.ts`, `src/lib/userData.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface UserDataStore {
    get(id: string): UserEntry;                       // default {watched:false,rating:null,note:"",updatedAt:""}
    set(id: string, patch: Partial<Omit<UserEntry,"updatedAt">>): Promise<void>;  // stamps updatedAt ISO
    all(): Promise<Record<string, UserEntry>>;
    exportJson(): string;                             // {"version":1,"entries":{...}}
    importJson(json: string): Promise<void>;          // throws Error("Invalid user data file") on bad shape; merges by newer updatedAt
    subscribe(cb: () => void): () => void;
  }
  export const STORAGE_KEY = "tonight.userData.v1";
  export class LocalStorageUserData implements UserDataStore { constructor(storage: Pick<Storage,"getItem"|"setItem">, now?: () => Date) }
  ```
- Tests inject an in-memory `{getItem,setItem}` fake — no jsdom.

- [ ] **Step 1: Test**
  ```ts
  test("get default, set stamps updatedAt and persists", async () => {
    const s = fakeStorage(); const d = new LocalStorageUserData(s, () => new Date("2026-10-30T20:00:00Z"));
    expect(d.get("tt1")).toEqual({ watched:false, rating:null, note:"", updatedAt:"" });
    await d.set("tt1", { watched:true, rating:4.5 });
    expect(new LocalStorageUserData(s).get("tt1")).toMatchObject({ watched:true, rating:4.5, updatedAt:"2026-10-30T20:00:00.000Z" });
  });
  test("rating must be 0.5 steps in [0.5,5] or null", async () => {
    const d = new LocalStorageUserData(fakeStorage());
    await expect(d.set("tt1", { rating: 4.3 })).rejects.toThrow();
    await expect(d.set("tt1", { rating: 6 })).rejects.toThrow();
  });
  test("import rejects bad shape and keeps data; merges newer", async () => {
    const d = new LocalStorageUserData(fakeStorage());
    await d.set("tt1", { note:"keep" });
    await expect(d.importJson("not json")).rejects.toThrow("Invalid user data file");
    await expect(d.importJson('{"foo":1}')).rejects.toThrow("Invalid user data file");
    expect(d.get("tt1").note).toBe("keep");
    await d.importJson(JSON.stringify({ version:1, entries:{ tt1:{ watched:true, rating:null, note:"newer", updatedAt:"2999-01-01T00:00:00.000Z" } } }));
    expect(d.get("tt1").note).toBe("newer");
  });
  test("subscribe fires on set", async () => { /* cb called once after set */ });
  ```
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** — `feat: localStorage user data store with export/import`

---

### Task 6: Enrich script (CSV → TMDB → titles.json + images)

**Files:**
- Create: `scripts/enrich.mjs`, `scripts/lib/csv.mjs`, `scripts/lib/tmdb.mjs`, `scripts/lib/transform.mjs`, `scripts/__tests__/fixtures/{rows.csv,find-tt0051378.json,movie-details.json,tv-details.json}`, `scripts/__tests__/transform.test.mjs`, `scripts/__tests__/enrich.test.mjs`
- Modify: `package.json` (add `"enrich": "node --env-file=.env scripts/enrich.mjs"`, `npm i -D csv-parse`)

**Interfaces:**
- Consumes: `src/data/mood-buckets.json`.
- Produces:
  ```js
  // csv.mjs
  export function readWatchlist(path) // → CsvRow[] (objects keyed by CSV header)
  // tmdb.mjs
  export function makeTmdb({ apiKey, fetch = globalThis.fetch, imageBase = "https://image.tmdb.org/t/p" })
  // → { find(imdbId) → {media:"movie"|"tv", id}|null,
  //     details(media, id) → raw json (append_to_response=videos,images),
  //     download(sizePath, destFile) → Promise<void> }   // sizePath like "/w1280/abc.jpg"
  // transform.mjs
  export function toTitle(row, found, details, bucketFor) // → Title (spec schema); found/details may be null
  export function pickTrailer(videos)   // first YouTube type "Trailer", official first; → key|null
  // enrich.mjs: main({ csvPath, outPath, imgDir, tmdb, force, log }) → { written, skipped, unmatched: string[] }
  ```
- Image files: `public/img/backdrop/<id>.jpg` (w1280), `public/img/backdrop-sm/<id>.jpg` (w780), `public/img/poster/<id>.jpg` (w500). JSON stores the public path (`/img/backdrop/tt1.jpg`) or null.
- Fallback when no backdrop but poster: `backdrop` = poster path; app blurs it (Task 8 handles the `backdrop === poster` case).

- [ ] **Step 1: Fixtures** — `rows.csv`: header + 3 rows copied verbatim from `data/watchlist.csv` (Elevator to the Gallows `tt0051378`, Dark `tt5753856`, and the Music Video `tt6207098`). `find-*.json` / details: record real responses once with `curl` using the owner's key, or hand-write minimal valid shapes (`overview`, `backdrop_path`, `poster_path`, `vote_average`, `vote_count`, `videos.results[]`). Never commit the key.
- [ ] **Step 2: Test `transform.test.mjs`**
  ```js
  test("movie row + details → Title", () => {
    const t = toTitle(rows[0], { media:"movie", id:1 }, movieDetails, bucketFor);
    expect(t).toMatchObject({ id:"tt0051378", type:"Movie", runtime:91, year:1958, imdbRating:7.9,
      genres:["Crime","Drama","Thriller"], directors:["Louis Malle"], moodBucket:"on-edge",
      backdrop:"/img/backdrop/tt0051378.jpg", backdropSmall:"/img/backdrop-sm/tt0051378.jpg", poster:"/img/poster/tt0051378.jpg",
      rtScore:null, metacritic:null });
    expect(t.trailerKey).toBe(movieDetails.videos.results.find(v=>v.type==="Trailer").key);
  });
  test("tv series row maps to Series; no director ok", () => {
    expect(toTitle(rows[1], { media:"tv", id:2 }, tvDetails, bucketFor)).toMatchObject({ type:"Series", directors:[] });
  });
  test("unmatched row keeps CSV data only", () => {
    expect(toTitle(rows[2], null, null, bucketFor)).toMatchObject({ overview:"", backdrop:null, poster:null, trailerKey:null, tmdbRating:null });
  });
  test("pickTrailer prefers official Trailer, ignores non-YouTube", () => { /* 3 videos: Teaser, unofficial Trailer, official Trailer → official key */ });
  ```
- [ ] **Step 3: Test `enrich.test.mjs`** — `main()` with a fake `tmdb` (returns fixtures; `download` records calls, writes nothing) and a temp `outPath`: writes 3 titles, returns `unmatched: ["tt6207098"]`; second run without `force` → `skipped: 3`, no tmdb calls; with `force` → re-fetches.
- [ ] **Step 4: Run** — FAIL. **Step 5: Implement** the four modules. Rate-limit with 50 ms between TMDB calls; retry once on 429. Log each unmatched id at the end.
- [ ] **Step 6: Run** script tests — PASS.
- [ ] **Step 7: Real run** — requires owner's `.env`. `npm run enrich`. Expect `written: ~340`, a short unmatched list. Check `du -sh public/img` (target < 120 MB; if larger, run the `optimize-images` skill or lower sizes to w1280-only + w500 and note it in README).
- [ ] **Step 8: Commit** — `feat: tmdb enrich script and generated titles data` (JSON + images in one commit; if images exceed comfort, a second commit `chore: add title images`).

---

### Task 7: UI primitives

**Files:**
- Create: `src/components/ui/Label.tsx`, `Pill.tsx`, `RoundButton.tsx`, `NavTab.tsx`, `Overlay.tsx`

**Interfaces:**
- `Label({ as?: "span"|"div", muted?: boolean, children })` — `font-ui text-[11px] uppercase tracking-ui`, colour `fg-2` / `fg-3` when muted.
- `Pill({ active, onClick, children })` — rounded-full, border `fg-3`, active: border `fg`, bg white/8.
- `RoundButton({ onClick, label, children })` — 54 px circle, border white/60, hover inverts to white bg/black text, `aria-label={label}`.
- `NavTab({ active, onClick, children, hidden? })` — flex-1, centered Label, 2 px white underline when active.
- `Overlay({ open, onClose, title?, children })` — fixed inset-0 `z-overlay` bg black; ✕ button top-right (`Label` "✕ Close"); closes on Esc and on click of the backdrop element (not children); traps focus (first focusable on open, restore on close); renders nothing when `!open`.

- [ ] **Step 1: Implement** all five using only theme tokens.
- [ ] **Step 2: Verify** `npm run typecheck && npm run lint` clean. (Behaviour is exercised by Playwright in Task 9/12.)
- [ ] **Step 3: Commit** — `feat: ui primitives (Label, Pill, RoundButton, NavTab, Overlay)`

---

### Task 8: Deck state hook and home screen

**Files:**
- Create: `src/state/usePersistedState.ts`, `src/state/useUserData.ts`, `src/state/useDeck.ts`, `src/components/Backdrop.tsx`, `Header.tsx`, `Hero.tsx`, `FactsRow.tsx`, `ThumbStrip.tsx`, `BottomNav.tsx`, `EmptyState.tsx`
- Modify: `src/App.tsx`
- Test: `src/state/useDeck.test.ts` (pure reducer part), `e2e/smoke.spec.ts` (first half)

**Interfaces:**
- Consumes: Tasks 1–5, 7; `src/data/titles.json`.
- Produces:
  ```ts
  // usePersistedState.ts
  export function usePersistedState<T>(key: string, initial: T): [T, (v: T) => void]   // localStorage JSON
  // useUserData.ts
  export const UserDataContext: React.Context<UserDataStore>;  export function useUserData(): { store: UserDataStore; entries: Record<string,UserEntry> }  // re-renders on store.subscribe
  // useDeck.ts
  export interface DeckState { filters: Filters; deck: Title[]; index: number; seed: number }
  export type DeckAction = {type:"setFilters";filters:Partial<Filters>} | {type:"next"} | {type:"prev"} | {type:"jump";id:string} | {type:"shuffle"} | {type:"rebuild";user:Record<string,UserEntry>}
  export function deckReducer(titles: Title[], user: Record<string,UserEntry>, s: DeckState, a: DeckAction): DeckState
  export function useDeck(titles: Title[]): { state: DeckState; current: Title|undefined; dispatch: (a: DeckAction) => void; count: string }  // count "07 / 50"
  ```
- Filter init order: `parseHash(location.hash)` wins, else `localStorage["tonight.filters.v1"]`, else `{mood:"all", type:"all", runtime:"any", hideWatched:true}`. Every filter change writes both hash and localStorage.
- After `rebuild`/`setFilters`: keep the current title's position if it is still in the deck, else `index = 0`. `next`/`prev` wrap. Empty deck → `index = 0`, `current = undefined`.

- [ ] **Step 1: Test `useDeck.test.ts`** (reducer only, 5 fake titles)
  ```ts
  test("next/prev wrap", ...);                        // index 4 → next → 0; 0 → prev → 4
  test("setFilters keeps current title if still present else resets", ...);
  test("jump sets index to that id", ...);
  test("shuffle changes seed and resets index", ...);
  test("rebuild with all watched + hideWatched → empty deck, index 0", ...);
  ```
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** reducer, hook, and components:
  - `Backdrop({ src, srcSmall, blurred })`: two stacked divs crossfading (`duration-bg`), `animate-kenburns`, `<picture>`-style media switch at 760 px, `blur-xl` when `blurred` (used when `backdrop === poster`), then shade gradient and `.grain` layers. `src` null → plain black.
  - `Header`: `Label` "Mood" + BUCKETS + All as clickable Labels (active underlined); right side `Label` "Filters" button (calls `onOpenFilters`) and counter in `font-counter text-2xl`.
  - `Hero({ title, showBlurb })`: year, `<h1 class="font-display uppercase leading-[.9]" style="font-size:clamp(56px,9vw,124px)">`, by-line ("A film by **X**" / "A series by **X**" / "A series" when no director), `FactsRow`, blurb when `showBlurb && overview`.
  - `FactsRow({ title })`: Runtime (`formatRuntime`) · IMDb (`imdbRating ?? "—"`) · Genre (first 3 joined by " · ") · Feels (`title.mood`).
  - `ThumbStrip({ deck, index, onJump })`: next 5 posters (wrapping), first highlighted; hidden ≤ 760 px.
  - `BottomNav({ hasTrailer, active, onSelect })`: tabs `The film`, `Trailer` (hidden when `!hasTrailer`), `Browse this mood`, `Shuffle`, `IMDb ↗` (anchor, `target=_blank`).
  - `EmptyState`: h1 "Nothing matches", counter `00 / 00`, line "Loosen the filters or pick another mood."
  - `App`: provides `UserDataContext` (`new LocalStorageUserData(localStorage)`), wires keyboard (←/→, Esc), wheel (700 ms debounce, |ΔY| ≥ 20), touch swipe (≥ 60 px), rotated left-edge hint "Scroll, swipe, or press → for the next one", `RoundButton`s. Preload next 2 backdrops via `new Image()`.
- [ ] **Step 4: Run** unit tests — PASS; `typecheck`/`lint` clean.
- [ ] **Step 5: Playwright setup** — `npm i -D @playwright/test && npx playwright install chromium`; `playwright.config.ts` with `webServer: { command: "npx vite --port 4173", url: "http://localhost:4173" }`. Write `e2e/smoke.spec.ts` part 1:
  ```ts
  test("home shows a film and arrows move", async ({ page }) => {
    await page.goto("/"); const h1 = page.locator("h1");
    await expect(h1).not.toHaveText("");
    const first = await h1.textContent();
    await page.keyboard.press("ArrowRight");
    await expect(h1).not.toHaveText(first!);
    await expect(page.getByText(/\d\d \/ \d\d/)).toBeVisible();
  });
  test("picking a mood updates hash and deck", async ({ page }) => {
    await page.goto("/"); await page.getByText("On edge", { exact: true }).click();
    await expect(page).toHaveURL(/#mood=on-edge/);
  });
  ```
- [ ] **Step 6: Run** `npx playwright test` — PASS.
- [ ] **Step 7: Commit** — `feat: deck state and full-bleed home screen`

---

### Task 9: Filters drawer

**Files:**
- Create: `src/components/FiltersDrawer.tsx`
- Modify: `src/App.tsx`, `e2e/smoke.spec.ts`

**Interfaces:**
- `FiltersDrawer({ open, onClose, filters, onChange, matchCount, store })` — right-anchored 300 px panel, `bg-black/90 backdrop-blur-md border-l border-white/10`, `z-drawer`, slides in 350 ms. Groups: Type (All/Movies/Series), Runtime (Any/Under 100 min/100 – 140/140+), toggle "Hide watched" (Pill), line "N titles match". Bottom: "Export watched & ratings" (downloads `tonight-user-data.json` from `store.exportJson()`) and "Import" (`<input type=file accept=.json>` → `store.importJson`; on error show the thrown message in a `Label`). Esc closes.

- [ ] **Step 1: Implement** and wire the Header "Filters" link.
- [ ] **Step 2: e2e** — add: open Filters → click "Series" → hash contains `type=Series` → reload → "Series" pill still active (persistence); click "Under 100 min" → counter total decreases.
- [ ] **Step 3: Run** Playwright + lint/typecheck — PASS.
- [ ] **Step 4: Commit** — `feat: filters drawer with persistence and user-data export/import`

---

### Task 10: Trailer overlay

**Files:**
- Create: `src/components/TrailerOverlay.tsx`
- Modify: `src/App.tsx`, `e2e/smoke.spec.ts`

**Interfaces:**
- `TrailerOverlay({ title, open, onClose })` — uses `Overlay`; centered frame `aspect-video w-[min(1100px,86vw)]`; shows `title.backdrop` as poster frame until iframe `onLoad`; iframe `src=https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`, `allow="autoplay; fullscreen"`, `title={`${title.title} trailer`}`. Below: `Label` "{title} — official trailer".

- [ ] **Step 1: Implement**; `BottomNav` "Trailer" opens it.
- [ ] **Step 2: e2e** — navigate until a title with a trailer (or `page.goto("/#mood=on-edge")` and press → up to 5 times until the "Trailer" tab is visible), click it, expect an `iframe[src*="youtube-nocookie.com/embed/"]`, press Esc, expect iframe gone.
- [ ] **Step 3: Run** — PASS. **Step 4: Commit** — `feat: in-place trailer overlay`

---

### Task 11: Browse overlay (grid + list)

**Files:**
- Create: `src/components/BrowseOverlay.tsx`, `BrowseGrid.tsx`, `BrowseList.tsx`, `src/lib/browse.ts`, `src/lib/browse.test.ts`
- Modify: `src/App.tsx`, `e2e/smoke.spec.ts`

**Interfaces:**
- `src/lib/browse.ts`:
  ```ts
  export type SortKey = "title"|"year"|"runtime"|"imdb"|"mine";
  export function sortTitles(ts: Title[], key: SortKey, dir: "asc"|"desc", user: Record<string,UserEntry>): Title[]  // nulls last
  export function searchTitles(ts: Title[], q: string): Title[]  // case/diacritic-insensitive on title, originalTitle, directors
  ```
- `BrowseOverlay({ open, onClose, deck, allTitles, filters, onJump })` — header: `font-counter` heading = `bucketLabel(filters.mood)` + "N titles"; controls: Pill "Grid"/"List" (persisted `tonight.browseView`), Pill "This mood"/"All titles", search input, sort select (list only). Footer `Label` muted with the TMDB attribution line and the TMDB logo (`public/tmdb.svg`, downloaded from TMDB's brand page). "All titles" applies type/runtime/hideWatched but ignores mood.
- `BrowseGrid({ titles, user, onJump })` — `grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4`; card: poster (2:3, `saturate-70` → hover full, translate-y -1), title, `year · runtime · imdb`. Watched: `opacity-50` + ✓ badge.
- `BrowseList({ titles, user, onJump, onUser })` — rows: 40 px poster thumb, title + year, director, runtime, IMDb, bucket label, ✓ watched toggle, `UserControls` stars (Task 12 — render a placeholder `—` until then). Row click (outside controls) → `onJump(id)`.

- [ ] **Step 1: Test `browse.test.ts`** — sort by imdb desc puts nulls last; sort by `mine` uses `user[id].rating`; search "samour" matches "Le Samouraï"; search "malle" matches by director.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** lib + components; wire "Browse this mood" tab.
- [ ] **Step 4: Run** unit — PASS. **Step 5: e2e** — open Browse → expect ≥ 1 card → click "List" → expect a row containing "Louis Malle" when mood is on-edge → type "samour" in search → exactly 1 row → click it → overlay closes, h1 is "Le Samouraï".
- [ ] **Step 6: Run** Playwright — PASS. **Step 7: Commit** — `feat: browse overlay with poster grid and sortable list`

---

### Task 12: Watched / rating / notes controls

**Files:**
- Create: `src/components/UserControls.tsx`
- Modify: `src/components/Hero.tsx`, `BrowseList.tsx`, `BrowseGrid.tsx`, `src/App.tsx`, `e2e/smoke.spec.ts`

**Interfaces:**
- `UserControls({ id, compact?: boolean })` — reads/writes via `useUserData()`. Elements: Watched toggle (Pill "Watched" / "✓ Watched"); `StarRating` (10 half-star hit areas, 0.5–5, click same value clears to null, `aria-label="Your rating"`, keyboard ←/→ in 0.5 steps); Note button (Pill "Note" / "Note •") opening a small popover `textarea` (saves on blur, 500 chars max). `compact` hides the note button (list rows).
- App behaviour: marking the current hero watched while `hideWatched` → dispatch `next` then `rebuild` (spec call), so the deck advances instead of jumping.

- [ ] **Step 1: Implement** and mount in `Hero` (under FactsRow) and `BrowseList`; `BrowseGrid` shows ✓ and stars read-only.
- [ ] **Step 2: e2e** — note the h1, click "Watched", expect h1 changes; open Filters, turn "Hide watched" off, open Browse, expect a ✓ card; set 4.5 stars via clicks on the hero, reload, expect `aria-valuenow=4.5` (or equivalent) persisted.
- [ ] **Step 3: Run** Playwright + unit + lint/typecheck — PASS.
- [ ] **Step 4: Commit** — `feat: watched, rating and notes controls`

---

### Task 13: Mobile pass, README, final verification

**Files:**
- Modify: `src/App.tsx`, `Header.tsx`, `Hero.tsx`, `ThumbStrip.tsx`, `BottomNav.tsx`, `playwright.config.ts`, `e2e/smoke.spec.ts`
- Create: `README.md`

- [ ] **Step 1: Responsive rules (≤ 760 px)** — header stacks (mood row wraps, gap 14 px, padding 18/20 px); hero `left/right 20px, bottom 30px`; facts wrap (gap 16 px); hide ThumbStrip, ← button, rotated hint; → button fixed bottom-right above the nav; nav labels 9 px / tracking 0.15 em; `Backdrop` uses `backdropSmall`.
- [ ] **Step 2: Playwright mobile project** — add `{ name: "mobile", use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } }`; add test: on mobile, swipe left (touchscreen drag ≥ 60 px) changes h1; no horizontal scroll (`document.documentElement.scrollWidth <= 390`); nav is visible.
- [ ] **Step 3: Run** `npx playwright test` across both projects — PASS. Save a screenshot each to `test-results/` for the owner.
- [ ] **Step 4: README** — what it is, `npm run enrich` (needs `.env`), `npm test`, `npx playwright test`, deploy note: set `base` in `vite.config.ts` to `"/<repo>/"` for GitHub Pages or leave `/` for Netlify/Vercel; image size note; TMDB attribution.
- [ ] **Step 5: Full verification** — `npm test && npm run lint && npm run typecheck && npx playwright test` all green; paste the summary lines in the handoff.
- [ ] **Step 6: Commit** — `feat: mobile layout, readme, e2e coverage`

---

## Self-review notes

- Spec coverage: data (T1, T6), deck/home (T8), filters + hash + persistence (T3, T4, T9), trailer (T10), browse grid/list/search/sort/All-titles/attribution (T11), user data + export/import (T5, T9, T12), empty state (T8), mobile (T13), design system/primitives (T1, T7), tests listed in spec (T1–T6, T8–T13). "Feels" one-offs: rendered raw (T8). Preload next 2 backdrops (T8).
- Names used consistently: `bucketFor`, `bucketLabel`, `BUCKETS`, `buildDeck`, `matches`, `formatRuntime`, `seededShuffle`, `daySeed`, `parseHash`, `serializeHash`, `LocalStorageUserData`, `exportJson`/`importJson`, `deckReducer`, `useDeck`, `useUserData`, `UserControls`.
- Review Focus items pinned: 1→T3 (+T8 FactsRow), 2→T6 + T8 (`hasTrailer`, null backdrop), 3→T3 + T8 reducer test, 4→T4, 5→T5.
