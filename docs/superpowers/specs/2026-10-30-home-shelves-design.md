# Not Tonight: "Why this" + Home Shelves (batch 3): Design

Date: 2026-10-30
Status: draft, pending owner sign-off
Amends: `2026-10-30-home-and-mood-pages-design.md`, `2026-10-30-browse-refresh-design.md`.
Anything not mentioned here stays as those specs say.

## Intent

The home page is hero → mood tiles → footer. Two gaps the owner felt:

1. The hero pick looks random. A short, data-built line should say why *this* film,
   tonight, so the pick reads as chosen.
2. Below the mood tiles the page just ends. Three poster shelves give a reason to
   scroll: films you can finish on a weeknight, films that have waited longest, and
   more from tonight's director.

Mockups the owner picked (layout reference, not code):
`.superpowers/brainstorm/11522-1793382585/content/why-this.html` (option B) and
`.../content/home-sections.html` (option A).

## Goals

- "Why this": one italic sentence in the hero, assembled from data, never hand-written per film.
- Three poster shelves on home, each with a "See all" that lands on a browse page.
- Carry the IMDb "added to list" date into the data so both features can use it.
- No new runtime dependencies.

## Non-goals (this batch)

- Stats strip. Dropped by the owner.
- Shuffle. Dropped by the owner; the deck's daily seed stays the only randomness.
- "Recently added" or "Highest rated" shelves. Only the three below.
- Mobile hero restructuring (batch 4).
- Any per-film copy. Headings and the "why this" templates below are the only new text.
- The batch 2 deferred minors (listed in the project memory). Separate follow-up.

## Anti-goals

- The "why this" line becoming a paragraph. Two reasons max, one line on desktop.
- Shelves that duplicate the mood tiles' look. Posters, not backdrops.
- Shelves ignoring the global filters. If a film is hidden from the deck it's hidden
  from the shelves.

## Data: `added`

`Title` gains `added: string | null`: the IMDb export's `Created` column as an ISO
date (`"2013-12-14"`), `null` when the column is empty or unparsable.

Enrich (`scripts/lib/transform.mjs` → `toTitle`) sets it. Because enrich skips rows
already in `titles.json` unless `--force`, `added` would never appear for existing
rows. So enrich gains a **CSV-merge step**, run on every row every time, the way moods
already merge: for every row in the CSV whose title exists in the output, overwrite
`added` from the CSV. No TMDB call, no `--force`. (Builder's call whether this is a
generic "csv-only fields" list or just `added`; `added` is the only one for now.)

The owner regenerates `titles.json` once with `npm run enrich` as part of this batch.
The committed `titles.json` diff should be `added` lines only.

`scripts/__tests__/transform.test.mjs` and `enrich.test.mjs` cover: `added` parsed;
empty `Created` → `null`; an existing row gains `added` without `--force`.

## "Why this"

### Where

In `Hero`, between `FactsRow` and the action buttons (trailer / IMDb / watched).
Italic, `text-sm`, same `max-w` as the overview, coloured with the accent of the
title's **first** mood (`moodAccent(title.moods[0])`). Untagged title → `text-fg-2`.
Prefixed with the words "Why this:" in the same style, not a label.

Renders nothing when there are no reasons. On mobile the line stays (it's one or two
sentences); it is not clamped.

### What it says

Pure function `whyThis(title, ctx): string | null` in `src/lib/whyThis.ts`.
`ctx` = `{ titles: Title[]; deck: Title[]; today: Date }` (`deck` is the current,
filtered deck; `titles` everything). Reasons are tested in priority order and the
**first two** that apply are kept, joined with a space, each a full sentence.

**Movies and series get their own reason tables** (owner's decision: a series'
`runtime` is per episode, so it must never be read as a film length).

Movies:

| # | Applies when | Sentence |
|---|---|---|
| 1 | waiting (see below) | "It's been waiting on your list since {Month YYYY}." If it is the oldest `added` in `deck`: "…since {Month YYYY}, longer than anything else." |
| 2 | `runtime` ≠ null and < 100 | "At {runtime} minutes, a weeknight will do." |
| 3 | a director of the title has ≥ 1 other title in `titles` | "{Director} is on your list {n} more time(s)." (first such director; `n` = other titles by them) |
| 4 | `moods.length > 0` | "Picked for a {Mood label} night." (first mood) |

Series:

| # | Applies when | Sentence |
|---|---|---|
| 1 | waiting (see below) | same as movies |
| 2 | `runtime` ≠ null | "Episodes run {runtime} minutes, so you can try one tonight." |
| 3 | as movies | as movies |
| 4 | as movies | "Picked for a {Mood label} night." |

**Waiting** applies when `added` is ≥ 3 years before `today` (owner raised this from 2)
**and** the title's `added` is within the oldest quarter of `deck` by `added` (my call,
so the line doesn't say the same thing for nearly every film: 289 of 342 titles are
over 2 years old). Oldest quarter = `added` ≤ the 25th-percentile `added` of the deck's
titles that have one; ties included.

Month names in English, e.g. "December 2013". The tables are the whole vocabulary; the
builder adds no reasons. If the owner wants different wording they edit the strings.

Reason 1's "longer than anything else" compares against `deck` so it stays true after
filters hide things. Ties on the oldest date count as oldest.

Unit tests in `whyThis.test.ts`: each reason alone, for a movie and for a series; the
series never gets the weeknight sentence; priority (1 and 2 win over 3 and 4); the
"longer than anything else" variant and its tie; the 3-year and oldest-quarter gates;
null `added` / `runtime`; empty result for an untagged, recent, long,
single-director-once film.

## Home shelves

### Placement

A new `HomeShelves` section between the mood tiles section and `Footer`, same
horizontal padding as the tiles section (`px-5 md:px-11`). Each shelf:

- Heading row: title in `font-display` uppercase (≈ `text-2xl md:text-3xl`), a muted
  count after it ("· 54 films"), and a "See all →" link at the right in the small
  uppercase `Label` style.
- Below it a horizontal rail: poster cells, `overflow-x: auto`, `scroll-snap-type: x
  mandatory`, scrollbar hidden, trailing padding so the last poster isn't flush with
  the edge. Poster width 118 px desktop, 110 px mobile. Posters are `2/3`.
- Poster cell: reuse the `FilmGrid` cell (extract a `PosterCell` component from it so
  grid and shelf share the fade-in, hover scale, dimmed-when-watched and accent border).
  Below the poster: title (one line, ellipsis) and a meta line in muted `Label` style.
  Accent for hover borders: white (as on director pages).
- Clicking a poster opens `TitleCard`. `HomeShelves` owns its own `cardFor` state and
  renders its own `TitleCard`, same as `BrowsePage` does. Marking watched from the card
  updates the store; with `hideWatched` on, the film leaves the deck and therefore the
  shelves on the store's rebuild. That is fine; no "keep until navigation" behaviour here.
- Keyboard: posters are buttons, one tab stop each. At most 12 posters per shelf.

### The three shelves

Pure function `homeShelves(deck, titles, current, today): Shelf[]` in
`src/lib/shelves.ts`. `deck` is the filtered deck (`state.deck`), `current` is the hero
title. `Shelf = { id: ShelfId; heading: string; count: number; items: Title[]; meta:
(t: Title) => string; seeAll: Route }`. `items` is the first 12 of the full set;
`count` is the full set's length. A shelf with zero items is omitted.

| id | Heading | Set (from `deck`) | Order | Meta line | See all |
|---|---|---|---|---|---|
| `short` | Under 90 minutes | `type === "Movie"`, `runtime` ≠ null and < 90 | runtime asc, then title | "1957 · 88 min" | `#/shelf/short` |
| `waiting` | Waiting the longest | `added` ≠ null | added asc, then title | "since 2015" | `#/shelf/waiting` |
| `director` | More from {Director} | other titles in `deck` by `current.directors[0]`, excluding `current` | year desc | "2014 · 165 min" | `#/director/{slug}` |

Order on the page: short, waiting, director. The director shelf uses the first
director only and is omitted when `current` is undefined or has no other films in
the deck. It changes when the hero flips; the other two don't.

Note the shelf threshold is 90 minutes (the owner's words), not the 100 of the
`short` runtime band. Don't unify them. Series are excluded from the short shelf
(owner's decision: episode runtimes are not film runtimes); the waiting and director
shelves include both types. The count after the heading uses the existing
`countLabel` wording ("N titles"), not "films".

Unit tests in `shelves.test.ts`: each set and order; the 12/count split; omission when
empty; director shelf excludes `current` and follows `current`; filtered-out titles
never appear.

### Shelf browse pages

`Route` gains `{ name: "shelf"; shelf: "short" | "waiting" }` at `#/shelf/<id>`;
`Scope` gains `{ kind: "shelf"; shelf: ShelfId }`. `scopeTitles` applies the shelf's
set rule to all titles (filters are applied by `BrowsePage` as today). `scopeLabel`
returns the shelf heading. `scopeKey` → `shelf:short`.

`SortKey` gains `"added"` (label "Added", default `asc`, nulls last as for other keys),
so the sort menu offers it on every browse page. `BrowsePage`'s initial sort, when
nothing is saved for the view, becomes scope-dependent: `shelf:waiting` → `added`,
`shelf:short` → `runtime`, everything else → `imdb` as today.

Nav: a shelf page behaves like a director page (solid nav, Moods dropdown works). The
grid/list toggle and search work unchanged.

### Home scroll on Back

Today home always opens at the top (`App.tsx`, batch 2 decision). With shelves at the
bottom, "See all" → Back would drop the user at the hero. Owner's decision: **home
restores its scroll position on history traversal (Back/Forward) only**; a fresh
navigation to home (wordmark, mood dropdown "All", redirect) still starts at the top.
Implement with the same view-state mechanism browse pages use, keyed by the home
route. Covered by an e2e: scroll to the shelves, click "See all", go Back, expect the
shelf heading in view.

`route.test.ts`, `browse.test.ts`: parse/serialize the shelf route; unknown shelf id →
home with redirect; `added` sort with nulls last; shelf scopes.

## Mobile (≤ 760 px)

- "Why this" sits under the facts row as on desktop; two sentences may wrap to two or
  three lines. The hero's bottom offset already leaves room; if the overview clamp
  (`line-clamp-5`) plus this line crowds the thumb strip, reduce the clamp to 4 on
  mobile. Builder's call after looking at it.
- Shelves scroll by touch; the heading row stacks count under the title if it doesn't
  fit; "See all" stays on the heading line.

## Accessibility

- The "why this" line is plain text inside the hero `section`; no ARIA needed.
- Each shelf is a `section` with `aria-labelledby` its heading. The rail is a plain
  scrolling `div`; no carousel ARIA.
- Poster buttons keep `aria-label={title}` as in `FilmGrid`.

## Testing

- Vitest: everything listed above, plus the enrich tests.
- Playwright (`e2e/smoke.spec.ts` or a new `home-shelves.spec.ts`): home shows the
  "Under 90 minutes" and "Waiting the longest" shelves; "See all" on the waiting shelf
  lands on `#/shelf/waiting` sorted by Added; a poster click opens the title card; the
  hero shows a line starting "Why this:". Mobile project: shelves present and scrollable.
- `npm run lint`, `npm test`, `npm run e2e` green before each commit.

## Left to the builder

- Exact Tailwind classes, spacing, scrollbar hiding technique.
- Whether `PosterCell` takes the caption as children or props.
- How `today` reaches `whyThis` / `homeShelves` (a `new Date()` at the App level is fine; tests pass a fixed date).
- Whether the CSV-merge step in enrich is generic or `added`-only.
