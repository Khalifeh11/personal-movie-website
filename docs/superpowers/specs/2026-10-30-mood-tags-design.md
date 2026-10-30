# Mood tags — design

Amends `2026-10-30-home-and-mood-pages-design.md`. Replaces the 7 mood buckets with 17 mood tags; a film can carry several.

## Why

With all 342 titles in, the buckets are lopsided and coarse: Moved holds 104, and most buckets are one or two CSV labels ("Serious, dramatic" ×49, "Tense, gritty" ×50; Transported and Real life are a single label each). Browsing by mood doesn't narrow anything, and finer filtering (next piece: search/sort) has nothing to work with.

## Goals

- 17 moods, phrased as how you want to feel tonight. Each film gets 1–3.
- Tags grounded in real data: TMDB keywords, the CSV mood, genres, overview.
- Tags survive `enrich --force`.
- TMDB keywords stored on each title for later search.

## Non-goals

- Search/sort improvements (next piece, built on these tags and keywords).
- A review UI or review step — the user explicitly declined one.
- User-editable tags in the browser.

## The vocabulary (fixed, in this order)

| slug | label | feels like |
|---|---|---|
| tense | Tense | edge of your seat, suspense |
| gritty | Gritty | crime, violence, street-level |
| puzzling | Puzzling | mysteries, investigations, whodunits |
| dread | Dread | unsettling, horror-adjacent, nightmarish |
| mind-bending | Mind-bending | surreal, twisty, reality-warping |
| thought-provoking | Thought-provoking | ideas, philosophy, big questions |
| funny | Funny | laugh-out-loud, energetic |
| absurd | Absurd | odd, surreal comedy, deadpan-strange (The Lobster, After Hours) |
| satirical | Satirical | biting, skewering power/class (Death of Stalin, Succession) |
| feel-good | Feel-good | warm, uplifting |
| bittersweet | Bittersweet | tender, melancholic, nostalgic |
| heartbreaking | Heartbreaking | grief, devastating, raw |
| epic | Epic | sweeping, adventure, spectacle |
| dreamy | Dreamy | immersive, lyrical, otherworldly |
| romantic | Romantic | love stories |
| true-story | True story | real events, documentaries |
| slow-and-quiet | Slow & quiet | meditative, contemplative |

Decided with the user: Tense and Dread stay separate; Wry was split into Absurd and Satirical. Claude's calls: gentle/deadpan comedies (Paterson, The Station Agent) go to Bittersweet or Feel-good (+ Funny where it fits); darkly funny crime (The Guard, Filth) gets Funny + Gritty.

## Data

- `enrich` requests TMDB keywords with the details call (`append_to_response` adds `keywords`; movies return `keywords.keywords[]`, TV returns `keywords.results[]`) and stores `keywords: string[]` (names) on each title. Existing titles get them via `npm run enrich -- --force` (images are skipped when the webp exists).
- `data/mood-tags.json`: `{ "<imdb id>": ["tense", "gritty"], ... }`, hand-curated (by Claude for this change). The source of truth for moods.
- `enrich` merges it: each title gets `moods: MoodSlug[]` in vocabulary order. Unknown slug, an empty list, or more than 3 tags for a film → `enrich` throws naming the id. A title with no entry gets `moods: []` and `enrich` logs `Untagged: <ids>`. An entry for an id not in the CSV is ignored with a `Stray tags: <ids>` log line. (Claude's calls.)
- The merge runs over **every** title on **every** run, including titles skipped as already enriched, so editing `mood-tags.json` and running plain `npm run enrich` updates moods without refetching TMDB. (Claude's call.)
- Removed: `src/data/mood-buckets.json`, the `moodBucket` field, `bucketFor` (TS and the copy in `enrich.mjs`). `mood` (the CSV phrase) stays on the title as data.

## Tagging (one-time, this change)

Claude proposes 1–3 moods for every one of the 342 titles from title, year, genres, CSV mood, themes, keywords and overview, and writes `data/mood-tags.json`. No user review. Every title gets at least one mood.

## Site

- **Home tiles:** 17 tiles in vocabulary order, then All. Same collage tile. Count = titles carrying that mood (after global filters); a film counts in each of its moods.
- **Mood page:** `#/mood/<slug>` lists titles whose `moods` include the slug. `all` lists everything, including untagged titles.
- **Nav Moods dropdown:** the 17 labels then "All titles".
- **Feels line** (hero facts and mood-page rows): the film's mood labels joined with ` · `, e.g. `Tense · Gritty`. Hidden when `moods` is empty.
- **Old slugs** (`on-edge`, `unsettling`, `wry-funny`, `transported`, `moved`, `real-life`) are unknown → redirect home like any unknown slug. `mind-bending` survives as a new slug.

## Left to the builder

- Tile grid on desktop/mobile with 18 tiles (keep the current tile design; columns are the builder's call, must look right at 390px).
- How the tagging pass is split up (batches, subagents) as long as the output is one valid `mood-tags.json` covering all 342.
- Test data and e2e expectations, recomputed from the real data.
