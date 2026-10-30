# Visual refresh (batch 1) — design

Amends `2026-10-30-home-and-mood-pages-design.md` and `2026-10-30-mood-tags-design.md`. First of four batches agreed with the user after a site audit; this one is purely visual, no new routes or data fetching.

## Why

The hero is strong; everything after it is flat. The mood tiles are four random poster slivers each, so neighbouring tiles show the same posters and none reads as its mood. The whole site is black/white/grey, so Feel-good looks exactly like Dread. Image loads pop in with no transition. The user's words: "it looks lacking".

## Goals

1. **Mood tiles that read as their mood**: one full-bleed backdrop per tile, chosen deterministically, with the mood's accent tint.
2. **One accent colour per mood**, applied consistently: tiles, mood page header, mood references in the hero and nav.
3. **Image polish**: blur-up for the hero backdrop, fade-in on load for tiles and posters, tile hover zoom.

## Non-goals

- Title detail route, keyword/director links, grid/list toggle (batch 2).
- Home sections, stats, "why this", shuffle (batch 3).
- Mobile hero restructuring (batch 4). Mobile must still look right; it's just not reworked.
- Mood descriptions / taglines. These are copy the user hasn't written; not invented here.
- Any change to data fetching, `enrich`, or `titles.json`.

## Anti-goals

- Colour taking over. The accent is a tint and a highlight, never a flat fill behind text. Black stays the base.
- Tiles that change on every reload. Users should recognise "the Dread tile" by its still.

## Moods data

`src/data/moods.json` gains two fields per mood:

```json
{ "slug": "tense", "label": "Tense", "accent": "#E04E3A", "hero": null }
```

- `accent`: hex colour. Values below (Claude's call; the user can retune).
- `hero`: optional IMDb id to force a tile's backdrop. `null` = auto.

`src/lib/moods.ts` exports `moodAccent(slug: MoodFilter): string` (`all` → `#FFFFFF`) and `moodHero(slug): string | null`. `scripts/enrich.mjs` reads `moods.json` for slugs only and must ignore the new fields.

| slug | accent |
|---|---|
| tense | #E04E3A |
| gritty | #B8862E |
| puzzling | #5B8DEF |
| dread | #7A2A8C |
| mind-bending | #2EC4B6 |
| thought-provoking | #C9A227 |
| funny | #FFB400 |
| absurd | #FF6EC7 |
| satirical | #9ACD32 |
| feel-good | #FF8C42 |
| bittersweet | #D4A5A5 |
| heartbreaking | #4F6BED |
| epic | #C0392B |
| dreamy | #A78BFA |
| romantic | #E63978 |
| true-story | #7F8C8D |
| slow-and-quiet | #6B9080 |
| all | #FFFFFF |

## Mood tiles

**Image choice** (`src/lib/moodTiles.ts`): the `Tile` type replaces `posters: (string|null)[]` with `backdrop: string | null` and `accent: string`. For each mood:

1. If `moods.json` has a `hero` id and that title has a backdrop → use it, even if it's filtered out of the deck.
2. Else, among titles in that mood **from the full `titles` list** (not the filtered deck, so the tile doesn't change when the user toggles Hide watched), pick the highest `imdbRating` that has a `backdrop` **and hasn't already been picked by an earlier tile**; ties by `imdbVotes` desc, then id. Tiles are picked greedily in vocabulary order, All last. Use `backdropSmall` as the src (w780 is plenty at tile size).
3. Else `null` → tile shows the accent as a dim gradient over black.

The dedupe is Claude's call: without it the naive rule yields only 10 distinct stills across 18 tiles (Chernobyl wins Tense, Dread, True story and All). A `hero` override wins even if that title was auto-picked elsewhere; the auto pass then skips it for later tiles. Note the top picks skew to high-rated series; if that looks wrong in practice, set `hero` ids rather than changing the rule.

The count still comes from the filtered deck as today. `moodTiles(deck, titles)` therefore takes both.

**Layout** (`src/components/MoodTiles.tsx`):

- Grid: 2 cols by default (phones included; the mobile e2e "tiles sit two per row" test stays), 3 cols md, 4 cols lg. 18 tiles → 5 rows on desktop (last row 2 wide, left-aligned). Aspect ratio 16:9 via `aspect-video`; no fixed heights. On phones the label drops to `text-lg` so label + dot + count fit in a ~95 px-tall tile without overlapping (the existing "name and count never overlap" test must pass).
- Each tile: `<img>` full bleed `object-cover`, `brightness-60`, `scale-100`; on hover/focus-visible `brightness-80 scale-105`, 500 ms ease. `loading="lazy"`, and the image is `opacity-0` until its `onLoad` fires then transitions to `opacity-100` (300 ms). Reduced motion: no scale.
- One overlay: `linear-gradient(to top, rgb(0 0 0/.85), color-mix(in srgb, <accent> 25%, transparent) 55%, transparent)`. Builder may tune the stops; the goal is label legible, tint visible, backdrop still the dominant thing.
- Bottom-left: label in `font-display` 2xl (md: 3xl) white; under it a 6 px round dot in the accent followed by the count label in `Label` style. The dot is the colour cue that carries over to the mood page and hero.
- A 1 px inset border `border-white/10`, becoming `<accent>/60` on hover/focus-visible.
- `count === 0` tiles: `opacity-40` as today, still clickable.
- `aria-label` unchanged: `"${label}, ${count} titles"`. The e2e count of 18 buttons in `#moods` must keep passing.

## Accent elsewhere

- **Mood page header** (`MoodPage.tsx`): behind the `<header>`, an absolutely positioned radial glow `radial-gradient(60% 100% at 0% 100%, color-mix(in srgb, <accent> 22%, transparent), transparent)` clipped to the header area, so the top-left of the page carries the mood's hue. The count line gets the same accent dot as the tile. `h1` stays white.
- **Hero facts** (`FactsRow.tsx`): the "Feels" value is rendered as the mood labels each preceded by its accent dot, instead of the plain `·`-joined string. `feelsLine` stays for FilmRow and tests; FactsRow builds the dot list from `title.moods`.
- **Nav moods menu** (`Nav.tsx`): each menu item gets a leading accent dot (4 px). The "All titles" item's dot is white.
- Everything else stays monochrome.

## Image polish

- **Hero backdrop blur-up** (`Backdrop.tsx`): when a new layer is pushed, render `backdropSmall` immediately at `blur-md scale-105` and the full `backdrop` on top at `opacity-0`; when the full image's `onLoad` fires, fade it to `opacity-100` over `--duration-bg`. The existing fade-in over the previous layer and the Ken-Burns zoom stay. If `backdropSmall` is null, behave as today. The upcoming-image warm-up stays.
- **Mood page posters** (`FilmRow.tsx`): `opacity-0` until `onLoad`, then 300 ms fade. Same for the `ThumbStrip` thumbnails (they're background images today; switch to `<img>` so `onLoad` works, keeping the button's `aria-label`).
- A tiny shared hook `useLoaded()` returning `{ loaded, onLoad }` or a `<FadeImg>` component in `components/ui/` so the three call sites don't each reimplement it. Builder's choice; `FadeImg` is suggested. Cached images: the browser may fire `load` before React attaches the handler. `FadeImg` must check `img.complete` on mount (ref) and mark loaded, or the image stays invisible.
- `prefers-reduced-motion`: fades still happen (they're opacity only); scale/zoom effects are disabled via Tailwind's `motion-safe:` variant.

## Verification

- Unit: `moodTiles` tests updated for `backdrop`/`accent` and the pick rule (hero override, rating tiebreak, filtered-out title still used, none → null). `moodAccent`/`moodHero` tests. `FactsRow` renders one dot per mood.
- e2e: existing `smoke` tile test (18 buttons, click opens mood page) passes unchanged. Add: the Tense tile's `img` has a non-empty `src`; the mood page header has a visible accent dot. Mobile spec keeps no horizontal scroll.
- Visual: playwright-cli screenshots at 1440×900 and 390×844 of home (scrolled to tiles), `#/mood/tense`, `#/mood/feel-good`, compared by eye against the audit screenshots. `npm run lint`, `npm run typecheck`, `npm test`, `npx playwright test` all green.

## Left to the builder

- Exact gradient stops and alpha values; the brief is "tint, not fill".
- Whether `FadeImg` or a hook.
- Tile border radius (keep `rounded-sm` unless it fights the backdrop).
- How the radial glow is clipped on the mood page (overflow-hidden wrapper vs. `mask`).
