# Not Tonight: Home + Mood Pages: Design

Date: 2026-10-30
Status: draft, pending owner sign-off
Amends: `2026-10-30-movie-picker-design.md` (the "movie picker" spec). Anything
not mentioned here stays as that spec says.

## Intent

The current home is one locked full-screen deck with the mood picker
squeezed into the header and browsing planned as an overlay. The owner wants
the hero to just be the hero: one film, full-bleed, with its info. Choosing a
mood and browsing get their own space: a mood section below the hero on the
home page, and a dedicated page per mood where every film is laid out as a
detailed row you read and compare.

Site name: **Not Tonight**: a wry nod to a watchlist that's mostly films
you've put off.

Mockups the owner picked (layout reference, not code):
`.superpowers/brainstorm/31693-1793362428/content/mood-section.html` (option C)
and `.../content/mood-page-rows.html` (option B).

## Goals

- Home reads as a page: nav → hero → mood tiles.
- Each mood has its own page with full details per film, scannable at ~50
  films.
- No new runtime dependencies.

## Non-goals

- No per-film detail page.
- No grid/list switch on the mood page (rows only).
- No shuffle control anywhere: the deck is already randomised daily.

## Anti-goals

- The mood page turning into a bare data table: rows keep the poster,
  display type and blurb.
- Mood tiles that look like generic category chips; they're image-led.

## Structure

### Nav bar (all pages)

- **Left:** wordmark "Not Tonight", in the display face. Links home.
- **Right:** **Moods** and **Filters**.
  - *Moods*: on home, smooth-scrolls to the mood section. On a mood page,
    opens a small dropdown listing every mood (+ All) for direct jumps.
  - *Filters*: opens the existing drawer. Filters apply globally (hero deck
    and mood page lists).
- Transparent over the hero; solid (`bg` + subtle border) once scrolled past
  the top. On a mood page it's solid from the start.
- Mobile (≤ 760 px): right side collapses into a menu button that reveals
  Moods / Filters.

### Home

1. **Hero**: full viewport height, unchanged content: backdrop + gradient +
   grain, year, title, byline, facts row, blurb (always shown now; the
   "The film" tab is gone). Prev/next round buttons, thumbnail strip and
   counter stay with the hero. Trailer and IMDb ↗ become buttons in the hero
   next to the facts.
   - Deck = **all titles** after drawer filters (no mood filter on home).
   - Flipping: buttons, ← / → keys, touch swipe. **Mouse wheel no longer
     flips**: it scrolls the page. Remove the rotated "Scroll, swipe…" hint
     or reword it to "Swipe or press →".
2. **Mood section**: label "How do you want to feel?" (owner may change)
   then a grid of **mood tiles**, one per bucket plus **All**.
   - Tile: collage of the first 4 posters of that mood (in deck order), mood
     name in display type bottom-left, "N titles" bottom-right. Count respects
     drawer filters.
   - 2 columns desktop and mobile in the mockup; builder may go 3–4 columns
     on wide screens.
   - Click → that mood's page.
   - Empty mood (filters exclude all): tile still shows, "0 titles", dimmed.
3. **Footer**: TMDB attribution line + logo (moved here from the Browse
   overlay).

### Mood page (`#/mood/<slug>`, `#/mood/all`)

- Nav (solid).
- **Header**: mood name (large display), "N titles", sort control
  (IMDb / year / runtime / title / your rating; default IMDb desc), text
  search (title/director), "Hide watched" toggle mirroring the drawer's.
- **Rows** (catalog style), numbered 01, 02… in current sort:
  - Poster thumb (~62×93 desktop).
  - Title (display face), then `year · director · runtime · IMDb`, then
    `genres (max 3) · Feels: <raw mood>`, then blurb (clamped to ~2 lines on
    mobile, full on desktop).
  - Actions row: **▶ Trailer** (opens the trailer overlay from the movie
    picker spec; hidden if no `trailerKey`), **IMDb ↗**, **Watched** toggle,
    **your rating** stars, **note** (popover, per original spec).
  - Rows are not clickable as a whole.
  - Watched rows, when "Hide watched" is off: dimmed with a check.
- Empty: "Nothing matches" + hint to loosen filters/search.
- Unknown slug → redirect to home.

## Removed vs. the movie picker spec

- Mood picker in the header → replaced by mood tiles + nav dropdown.
- Bottom nav tabs (The film / Trailer / Browse this mood / Shuffle / IMDb) →
  gone.
- Shuffle → gone.
- "Browse this mood" overlay (plan Task 11) → replaced by the mood page.
- Grid/list switch → gone.
- Mouse-wheel flipping → gone.

## Routing

Hand-rolled hash router (no dependency): `#/` home, `#/mood/<slug>`.
Filters move from the old `#mood=…&type=…&rt=…` hash to a query part:
`#/mood/on-edge?type=movie&rt=mid`. `localStorage` remains the fallback, hash
wins when present (as before). `mood` drops out of `Filters` state on home;
the mood page takes it from the route.

On route change: scroll to top. Back/forward work via `hashchange`.

## Tests

- Unit: route parsing (`#/`, `#/mood/x`, unknown slug, query filters,
  malformed hash), tile poster/count selection, mood page sort + search.
- Playwright smoke (update existing): load home → next film → scroll to mood
  section → click a tile → mood page shows rows → open a trailer → close →
  back to home.
- Mobile check at 390 × 844 with playwright-cli (owner's standing rule):
  home, mood section, mood page, nav menu.

## Owner answers after builder review

- **Data:** build on the 20 titles currently in `titles.json`; full enrich
  comes later. With all 342 titles every mood will be well stocked, so sparse
  and empty states are low priority: keep them minimal (don't crash, don't
  look broken), don't polish them. Tile with 1–3 posters: remaining collage
  slots are a dark panel. Mood with 0 titles: dark tile, "0 titles", dimmed.
- **Counts read "N titles"** (not "films"), on tiles and mood page header.
- **Mood section heading:** "How do you want to feel?"
- **Mobile menu button:** icon only (hamburger), `aria-label="Menu"`.

## Calls made after builder review (not owner decisions)

- Empty-state copy (owner: "doesn't really matter"):
  - Mood page: "Nothing matches" + "Clear the search or loosen the filters."
  - Hero: "Nothing matches" + "Loosen the filters."
- Nav dropdown's All entry reads "All titles".

- Ticking Watched on a mood-page row while "Hide watched" is on: the row
  stays (dimmed, checked) until the page is left or re-sorted/searched;
  numbering doesn't shift under the cursor.
- The mood page's "Hide watched" toggle is the same global setting as the
  drawer's (one filter state above the router).
- Hash filter values keep the code's existing casing (`type=Movie`).

## Left to the builder

- Component breakdown (`Nav`, `MoodTiles`, `MoodPage`, `FilmRow`, router
  hook) and where the shared filter state lives.
- Exact tile collage layout (4 vertical strips per the mockup, or 2×2).
- Whether hero height is `100dvh` or slightly less to hint at content below.
- Nav dropdown/menu focus handling.
