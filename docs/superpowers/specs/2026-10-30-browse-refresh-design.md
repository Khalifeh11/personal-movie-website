# Browse refresh (batch 2) — design

Amends `2026-10-30-home-and-mood-pages-design.md` (which said "no per-film detail page" and "no grid/list switch"; both are revisited here) and follows `2026-10-30-visual-refresh-design.md` (batch 1). Second of four batches agreed after the site audit. No data fetching or `enrich` changes; everything here is built from fields already in `titles.json`.

## Why

The user's words: on a mood page "I'm trying to read info about the film. Wanna see more. Clearer." The rows are set in 12–13px type with a 62px poster, so reading a mood page is squinting. There is no way to see everything by a director, which the user named as the thing they'd love most. And rows are the only way to browse; there is no poster wall to scan.

## Goals

1. **Rows you can read**: one size step up in type and poster, same facts.
2. **Grid view** as an alternative to rows, remembered per browser.
3. **Title card**: a click on any poster (grid or list) opens a card with everything the row holds plus the backdrop. This is the "detail page" without a route.
4. **Director pages**: every director name on the site is a link to a page listing their titles, same shape as a mood page.

## Non-goals

- A `#/title/<id>` route. The card covers it. Revisit only if the card gets heavy.
- Keywords and themes on rows or the card. The user is unsure they're wanted; they'd need an expand view. Keyword pages would reuse the director-page mechanism later.
- A "Directors" entry in the nav. Directors are reached only from links on a film (user's decision).
- Cast, longer synopsis, or any field not already in `titles.json`.
- Home sections, stats, shuffle (batch 3). Mobile hero rework (batch 4).
- Global type-scale changes outside the rows, grid, card and director page. Nav, hero, filters drawer stay as they are.

## Anti-goals

- The grid becoming a second list: no title text under posters, no action buttons in cells. Posters and one fact line only.
- The card turning into a page: no scroll-long content, no tabs, no "more like this". It must fit one desktop viewport.
- Rows losing anything they show today while getting bigger.

## Rows (list view)

`FilmRow` keeps its structure (number, poster, title, facts line, genre/feels line, blurb, actions) and goes one step up. Sizes are the chosen mockup ("B"); exact Tailwind classes are the builder's call, targets are:

| | phone | desktop (md+) |
|---|---|---|
| poster | 64×96 | 90×135 |
| row number | 24px | 36px |
| title | 24px | 32px |
| facts line (year · director · runtime · IMDb) | 14px | 15px |
| genre / feels line | 13px | 14px |
| blurb | 15px, clamp 3 lines | 16px, no clamp, max-width 640px |
| action pills | 11px | 12px |

Row padding grows with it (roughly 28–32px vertical on desktop). Watched dimming unchanged.

**Director link.** In the facts line each director name is a link (underline, offset, muted underline colour; full white on hover). Multiple directors stay joined with " & ", each linked separately. Titles with no director (30 series) show no director fact, as today.

**Poster and title are clickable** and open the title card (below). Trailer, IMDb, Watched, stars and Note keep working inline in the row; they are not moved into the card.

## Grid view

On the same page as the list, switched by a segmented control (grid icon | list icon) placed in the header control group, left of Sort. `aria-label`s "Grid view" / "List view", `aria-pressed` on the active one. Default is list. The choice persists in `localStorage` under one key (builder's call on the name) via `usePersistedState` and applies to every mood and director page. The toggle does not appear on the home page.

Layout: `grid-cols-2` on phones, 3 at `sm`, 4 at `md`, 5 at `lg`, gap 12–16px. Each cell:

- the poster at 2:3 via `FadeImg`, `object-cover`, rounded like the row poster; a `bg-white/5` box when there is no poster;
- one caption line under it, 13px, `text-fg-3`: `{year} · {Movie|Series} · IMDb {rating}` (e.g. `2019 · Series · IMDb 9.3`). Use `ratingText` for the rating so a missing rating reads as it does elsewhere. No title text (it's on the poster).
- The cell is a `<button>` with `aria-label` = the title. Watched titles dim exactly as rows do.
- Hover/focus: a slight scale on the poster and the same accent border treatment the mood tiles use, with the page's accent (white on director pages).

Sorting, search, filters and "Hide watched" apply to the grid exactly as to the list; the numbering is simply not shown. The "kept" behaviour (a title marked watched during this visit stays listed, dimmed) carries over, since it lives in the page, not the row.

Empty state is the same component as the list.

## Title card

State lives in the shared browse page (`cardFor: Title | null`), not in App (Claude's call: the card's Watched needs the page's "keep" callback, and a route change unmounts the page so the card closes for free). The trailer stays app-level so it can stack above the card. Opens from: a grid cell click, a row's poster or title click. Closes on Esc, close button, click outside, and on any route change.

Content, top to bottom, per the mockup:

- backdrop (`backdropSmall` as blur-up base, `backdrop` on top via `FadeImg`, same as the hero), ~220px tall on desktop, dark gradient into the card body; no backdrop → body only;
- poster (110px wide) overlapping the backdrop's bottom edge, with the text block to its right;
- title in the display face (~32px), then facts line (year · director links · runtime · IMDb), then genre line + feels (with `MoodDot`s), then the blurb at 16px, unclamped;
- action row: Trailer (if `trailerKey`), IMDb ↗, Watched, stars, Note. These are the same `UserControls` as the rows, so edits in the card and the row never disagree.

Desktop: centred card, 720px wide, `#0a0a0a` body, hairline border. Phone (< md): a bottom sheet, full width, backdrop 180px, poster 84px above the text block; the sheet scrolls if the blurb is long. The user has seen and approved this layout.

Trailer from the card: the trailer overlay opens above the card; closing the trailer returns to the card. Esc with the trailer open closes only the trailer (both overlays listen for keydown today; guard it). Director links in the card navigate to the director page (which closes the card via the route-change rule); clicking the current director's own link on their page, which fires no hash change, closes the card explicitly. Watched in the card uses the same "keep" callback as the row so the grid/list doesn't reflow under the open card.

Desktop card: `max-h-[90vh]` with internal scroll as a fallback. The longest overview is ~900 characters and would overflow a 768px-tall laptop with the 220px backdrop.

Builder's call: whether to extend the existing `ui/Overlay` for the bottom-sheet variant or add a sibling. Prefer extending.

## Director pages

Route: `#/director/<slug>`, with the same optional `?type=…&rt=…` query as mood pages. `slug` = director name lower-cased, diacritics stripped (NFD + strip combining marks), any run of non `[a-z0-9]` → `-`, trimmed. "Bong Joon Ho" → `bong-joon-ho`, "Jean-Pierre Jeunet" → `jean-pierre-jeunet`. `parseRoute` resolves a slug by slugifying every director across `titles` and matching; unknown slug → home with `redirect: true`, like a bad mood slug. `serializeRoute` gains the `director` case. `Route` gains `{ name: "director"; director: string }` holding the original name (the page needs it for the header); the slug is derived when serialising.

The page is the mood page's shape with a different scope:

- header: the director's name as the h1, `countLabel(n)` below, no accent glow (neutral), no `MoodDot`;
- the same control group: view toggle, Sort, direction, search, Hide watched;
- the same list / grid body, same kept logic, same empty state;
- the title pool is `titles.filter(t => t.directors.includes(name))`, then `matches(t, filters, entries)` as on mood pages.

The builder should extract the shared page (header slot + controls + body) so `MoodPage` and the director page are two thin wrappers over one `BrowsePage`, not a copy. Document title / `<h1>` text is the only copy on the page; nothing invented.

Entry points: director links in rows, in the card, and in the hero's "A film by …" line. All three use the same `DirectorLink` (or equivalent): a plain `<a href="#/director/<slug>">` so the existing `hashchange` handling does the navigation with no prop plumbing into `Hero`/`FilmRow`. It takes a style variant: rows and card get the muted underline; the hero keeps its current bold white look. Nav "Moods" behaviour on a director page is as on a mood page (opens the dropdown).

`parseRoute` (and `resolveInitialFilters` in `state/deck.ts`, which also calls it) gain a directors/titles argument for slug resolution. Slug collisions resolve to the first match (none exist in the current 272 names). The grid/list toggle does not reset `kept`. The existing mobile e2e "row blurbs are clamped to two lines" changes to three per the size table. "Document title" above means the `<h1>` text; `document.title` is not set anywhere today and this batch doesn't add it.

## Routing and Back

Hash router stays hand-rolled. Opening the card or trailer does not push history.

**Back restores the view you left** (user's decision). Director links are a detour: scroll deep into a sorted, searched list, click a director, read, press Back. Today `useRoute` scrolls to top on every hash change and the mood page remounts at defaults (IMDb desc, empty search). That is not acceptable for this batch. Required:

- sort, direction and search for each browse route survive leaving and coming back by Back/Forward. Builder's call on the mechanism: a per-route view-state cache above the router keyed by the serialised route, or sort/dir/q in the hash query. Either way a fresh navigation to the same route (tile, nav, typed URL) starts at defaults; only history traversal restores;
- scroll position is restored on Back/Forward (and not on fresh navigation). Standard `popstate` + saved `scrollY` per history entry; set `history.scrollRestoration = "manual"` if the browser's own restoration fights the hash router;
- drawer filters keep working as today (global, mirrored to the hash query).

e2e: from a mood page, change sort, type a search, scroll, click a director link, press Back → same sort, same search, same scroll offset (within a tolerance), same rows.

## Verification

- Unit: slugify (diacritics, hyphens, spacing), `parseRoute`/`serializeRoute` for `director` incl. unknown slug, the grid caption string, the shared page's pool for a director with filters applied.
- e2e desktop: toggle switches to grid and persists across reload; grid cell click opens the card with title, director link, blurb and actions; Esc closes; director link in a row lands on `#/director/<slug>` with the right count; Back returns with filters intact; trailer from card returns to card on close.
- e2e mobile: grid is 2-up with no horizontal scroll; card is a bottom sheet that scrolls; rows at the new size don't overflow at 390px.
- Visual check (playwright-cli) at 1440×900 and 390×844: mood page list, mood page grid, card open, director page. Screenshots to the scratchpad.

## Left to the builder

- Exact Tailwind classes for the size table; icon glyphs for the toggle (inline SVG, no icon dependency).
- The `localStorage` key name and the shared-page component's name and prop shape.
- Whether the card's bottom sheet is an `Overlay` variant or a sibling.
- Where `slugify` lives (`lib/route.ts` or a new `lib/slug.ts`).
