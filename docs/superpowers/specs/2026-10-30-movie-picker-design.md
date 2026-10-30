# Personal Movie Picker — Design

Date: 2026-10-30
Status: approved pending owner sign-off

## Intent

Karim has a 342-title IMDb watchlist (`imdb_categorized_342.csv`, already
tagged with a category, mood and themes). Picking something to watch currently
means scrolling a long list and, per title, opening IMDb, reading the plot,
maybe watching the trailer, working out the mood. This site collapses that
into one screen: pick a feeling, flip through full-screen films, read the
blurb and watch the trailer without leaving.

Approved look: **"Full-bleed Cinematic"** (direction D). Reference: the
Awwwards "50 ans du Cinéma" site. Clickable prototype that the owner approved:
`.superpowers/brainstorm/84512-1793349918/content/prototype-d.html` — the
builder should treat it as the layout/interaction reference, not as code to
keep.

## Goals

- Answer "what do I watch tonight?" in under a minute.
- Mood-first entry; browse-the-covers as the fallback.
- Visually striking: one film owns the screen, huge condensed type, real
  backdrop stills, in-place trailer.
- Fully static, free to host, no backend.

## Non-goals

- Not a public catalogue; no accounts, no multi-user, no social features.
- No live IMDb/TMDB calls at runtime.
- No recommendation engine beyond the existing CSV tags.

## Anti-goals (what would make it a failure even if it works)

- A generic poster grid / data table as the *first* screen. (Borrowing
  Letterboxd's list and rating UI patterns elsewhere is welcome.)
- Invented plot text, invented images, or empty "lorem" states.
- Slow: a full-bleed still should be on screen within ~1 s on broadband.

## Data

### Source

`imdb_categorized_342.csv` (IMDb export + three added columns). Relevant
columns: `Const` (IMDb id), `Title`, `Original Title`, `Title Type`,
`IMDb Rating`, `Runtime (mins)`, `Year`, `Genres`, `Directors`,
`Primary category`, `Likely mood`, `Broad themes`, `URL`. `Description` is
empty for every row; `Your Rating` exists for 1 row — ignore both.

Title types: 306 Movie, 22 TV Series, 8 TV Mini Series, 4 TV Movie,
1 Music Video, 1 Short. Keep all; treat TV Series + TV Mini Series as
"Series", everything else as "Movie" for the type filter.

### Mood buckets

`Likely mood` has 11 common values and ~20 one-off values. Collapse into
these buckets (owner-facing label → CSV moods):

| Bucket | CSV `Likely mood` values |
|---|---|
| On edge | Tense, gritty · Suspenseful, investigative · Tense, cerebral · Tense, moving |
| Unsettling | Unsettling, intense · Nightmarish, unsettling · Nightmarish, surreal · Psychological, enigmatic |
| Mind-bending | Cerebral, speculative · Cerebral, conversational · Dreamlike, thought-provoking · Lonely, surreal · Surreal, devastating |
| Wry & funny | Wry, character-driven · Funny, energetic · Anxious, absurd · Absurd, cold · Absurd, cynical · Neurotic, inventive · Satirical, uncomfortable |
| Transported | Imaginative, immersive |
| Moved | Serious, dramatic · Reflective, serious · Emotional, reflective · Raw, heartbreaking · Grief-stricken, realistic · Reflective, moving · Melancholic, poetic · Gentle, contemplative · Bittersweet, reflective · Bleak, meditative |
| Real life | Informative, observational |

Mapping lives in one config file so the owner can move titles between
buckets. Any CSV mood not in the map → log a warning at build time and put
it in "Moved" (builder's call; it's the broadest bucket).

Also expose an **All** bucket.

### Enrichment (one-off build script)

Node script `scripts/enrich.mjs`, run manually (`npm run enrich`), reads
the CSV and TMDB, writes `src/data/titles.json` and downloads images to
`public/img/`. Needs `TMDB_API_KEY` from `.env` (gitignored).

Per title, via TMDB `/find/{imdb_id}?external_source=imdb_id` then
`/movie/{id}` or `/tv/{id}` with `append_to_response=videos,images`:

- `overview` (plot blurb)
- backdrop (largest available, saved as `w1280` JPEG; also a `w780` for
  mobile) and poster (`w500`)
- trailer: first YouTube video of type "Trailer" (prefer official); store
  the YouTube key only
- `vote_average` / `vote_count` (TMDB rating)

Not in v1: Rotten Tomatoes / Metacritic (would come via OMDb). Owner chose
IMDb-only for now; keep `rtScore`/`metacritic` as nullable fields so a
later OMDb pass is additive.
- fallback: if no backdrop, use the poster blurred as backdrop; if no
  trailer, hide the Trailer tab for that title; if TMDB has no match, keep
  the title with CSV data only and log it

The script is idempotent and resumable (skips titles already in the JSON
unless `--force`). Output JSON is committed so the site builds without the
key. Images are committed too (est. ~342 × ~250 KB ≈ 85 MB; builder may
compress harder or switch to webp to keep the repo sane — owner has the
`optimize-images` skill available).

Committed JSON schema (per title):

```
{ id, title, originalTitle, year, type: "Movie"|"Series", runtime,
  imdbRating, genres[], directors[], category, mood, moodBucket,
  themes[], imdbUrl, overview, backdrop, backdropSmall, poster,
  trailerKey|null, tmdbRating, tmdbVotes, rtScore|null, metacritic|null }
```

## Experience

### Screen: the deck (home)

Full-viewport. Layered: backdrop still (slow Ken-Burns zoom, crossfade on
change) → dark gradient (heavier at the bottom) → subtle film grain.

- **Top-left**: `MOOD` label + the 7 buckets + All, as a thin uppercase
  tracked-out row. Active one is underlined. Clicking rebuilds the deck.
- **Top-right**: `FILTERS` link (opens drawer) and the counter `07 / 50`
  in a condensed display face.
- **Left edge**, rotated: hint text "Scroll, swipe, or press → for the
  next one". Hidden on mobile.
- **Hero, bottom-left**: year → title (Anton or similar condensed
  display, ~9 vw, uppercase, up to 2 lines) → "A film by DIRECTOR" (or
  "A series" when no director) → facts row: Runtime · IMDb · Genre (max
  3) · Feels (the raw CSV mood pair).
- **Blurb**: TMDB overview, shown under the facts when "The film" tab is
  active. Max ~520 px wide.
- **→ / ← round buttons** mid-right / mid-left.
- **Thumbnail strip**, bottom-right: next 5 posters; click jumps.
- **Bottom nav**, five equal tabs: *The film* · *Trailer* · *Browse this
  mood* · *Shuffle* · *IMDb ↗*.

Navigation: → / ← buttons, arrow keys, mouse wheel (debounced ~700 ms),
touch swipe. Deck wraps around.

Deck order: shuffled once per session with a seeded RNG (seed = date), so
the same mood gives a different first film each night but stays stable
while browsing. *Shuffle* reshuffles immediately.

### Filters drawer

Slides in from the right (≈300 px, blurred dark glass). Two groups of
pills: **Type** (All / Movies / Series) and **Runtime** (Any / Under 100 /
100–140 / 140+ min). Shows "N titles match". Changing a filter rebuilds the
deck. Filters persist in `localStorage`. Also contains the **Hide watched**
toggle (default on).

Series runtime is per-episode; the runtime filter applies to that number
as-is (builder may label it "/ ep" in the facts row, as the prototype does).

### Trailer

Full-screen overlay, YouTube iframe (`youtube-nocookie.com`, autoplay,
16:9, max 1100 px). Close via ✕, Esc, or clicking outside. The backdrop
still shows as a poster frame until the iframe loads.

### Browse this mood

Full-screen overlay over the current deck (current filters applied), with
a **grid / list** switch (persisted).

- **Grid**: poster cards, `auto-fill, minmax(150px, 1fr)`; poster, title,
  `year · runtime · rating`.
- **List**: Letterboxd-style rows — poster thumb, title + year, director,
  runtime, IMDb, mood bucket, watched check, your rating
  stars. Sortable by title / year / runtime / IMDb / your rating; text
  search box filters by title/director.

Watched titles dimmed with a check mark when "hide watched" is off. Click
→ jumps the deck to that title and closes. A header toggle lets the overlay
show **All titles** instead of just the current mood.

### Ratings shown

Facts row shows IMDb rating. RT / Metacritic fields exist but are null and
hidden in v1. TMDB rating is stored but not shown by default (builder
may surface it in the list view).

### Your data: watched, rating, notes

Each title has a **Watched** toggle, a **your rating** control
(Letterboxd-style 0.5–5 stars) and a **note** (free text, textarea in a
small popover). Controls sit near the facts row and on list/browse items.

All of it goes through one `UserData` interface:

```
interface UserDataStore {
  get(id): { watched: boolean, rating: number|null, note: string, updatedAt }
  set(id, patch): Promise<void>
  all(): Promise<Record<id, Entry>>
  export(): Blob; import(blob): Promise<void>
}
```

v1 adapter: `localStorage`. A backend (owner's choice later — e.g.
Supabase or a small API) is a second adapter; the UI must not know which
is in use. Export/import JSON lives in the drawer so data survives a
browser wipe.

Watched titles are excluded from decks when "Hide watched" is on
(default). Counter reflects the filtered deck.

### Empty state

If filters exclude everything: title area reads "Nothing matches", counter
`00 / 00`, a one-line hint to loosen filters.

### Mobile (≤ 760 px)

Same one-film-per-screen. Mood row wraps to two lines under a smaller
header; hero padding 20 px; → button moves above the nav; thumbnail strip,
← button and rotated hint hidden; swipe is the primary gesture. Use the
`w780` backdrop. Verify with playwright-cli at 390 × 844 before calling it
done (owner's standing rule).

## Visual language

- Background `#000`; text `#fff`, secondary `#bbb`, muted `#777`.
- Display: **Anton** (titles), **Bebas Neue** (counter, overlay headings).
  Body/UI: **Space Grotesk**. Loaded from Google Fonts; builder may
  self-host.
- Uppercase, letter-spacing 0.25–0.3 em for all small UI text.
- Transitions: backdrop crossfade 700 ms; title fade/slide 350 ms; hover
  on round buttons inverts to white.
- Film grain: inline SVG `feTurbulence` at ~7 % opacity.
- No colour accents beyond white; the stills supply the colour.

## Build

- **Vite + React + TypeScript + Tailwind v4.** Owner wants a consistent
  design system: all tokens (colours, fonts, tracking, durations, z-index
  layers) live in `@theme`; components use only theme values, no arbitrary
  values except where a token would be absurd (e.g. the 9 vw title).
  Shared primitives in `src/components/ui/`: `Label` (uppercase tracked
  text), `Pill`, `RoundButton`, `NavTab`, `Overlay` (full-screen, Esc/✕/
  click-outside close, focus trap). Screens compose these; no one-off
  styling. Only true one-offs (grain SVG, Ken-Burns keyframes) go in a
  small global CSS file. Ask before adding any dependency beyond
  Vite/React/TS/Tailwind and a CSV parser for the script.
- Routing: single page; mood and filters mirrored into the URL hash
  (`#mood=on-edge&type=movie&rt=mid`) so a state is shareable/bookmarkable.
- Deploy target: any static host (GitHub Pages / Netlify / Vercel). Owner
  decides; builder adds a `base` config note.
- `.env` gitignored; `.superpowers/` gitignored.
- Tests: unit tests for the mood-bucket mapping, filter logic and seeded
  shuffle (Vitest). Enrich script gets a dry-run test against a fixture
  of 3 titles with recorded TMDB responses. Playwright smoke test:
  load → pick mood → next → open trailer overlay → close.
- Attribution: TMDB requires a "This product uses the TMDB API but is not
  endorsed or certified by TMDB" line + logo somewhere; put it in a tiny
  footer in the Browse overlay.

## Left to the builder

- Exact component breakdown and state management (context vs. store).
- Image compression pipeline and whether to commit images or fetch from
  TMDB's CDN at runtime (committing is the default; CDN is acceptable if
  repo size becomes a problem — note it means a TMDB dependency at view time).
- Keyboard focus management for overlays.
- How "Feels" renders when the raw mood is a one-off (just show it).
- Whether to lazy-preload the next 2 backdrops (recommended).

## Calls made after builder review (not owner decisions)

- URL hash vs `localStorage` for filters: hash wins when present, else
  `localStorage`.
- Marking the current hero as Watched while "Hide watched" is on: advance
  to the next card, don't rebuild/jump.
- The one title with no runtime passes "Any" and is excluded from the three
  ranged buckets.
- Music Video / Short may get no TMDB match → CSV-only + log fallback.
- The mood map covers all 32 `Likely mood` values today; the "Moved"
  fallback is only for future CSV re-exports.

## Open questions resolved during brainstorm

- Mood-first vs browse-first → mood-first, browse as a tab.
- Filters that matter → runtime, movie vs series. Nothing else.
- Design → Full-bleed Cinematic (D) over Marquee / Mood Field / Video
  Store / Retro TV.
- Watched tracking → yes, plus your rating + notes, via a swappable
  `UserData` store (localStorage now, backend later).
- A real list view → yes, inside Browse (grid/list switch), Letterboxd
  patterns welcome.
- Secrets → TMDB key in `.env`, never in chat or repo.
