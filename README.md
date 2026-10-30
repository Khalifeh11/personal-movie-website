# Not Tonight

A static site for picking something to watch from a personal IMDb watchlist. The home page shows one film at a time, full screen, with mood tiles below it. Each mood has its own page listing its titles in detail, with trailers, watched/rating/notes and sorting.

## Routes

- `#/`: home (hero film + mood tiles)
- `#/mood/<slug>`: one mood (`on-edge`, `unsettling`, `mind-bending`, `wry-funny`, `transported`, `moved`, `real-life`, or `all`)

Filters ride along as a query: `#/mood/on-edge?type=Movie&rt=mid`. They are also saved in `localStorage`.

## Data

`npm run enrich` reads `data/watchlist.csv`, looks each title up on TMDB and writes `src/data/titles.json` plus images under `public/img/`. It needs a `.env` with `TMDB_API_KEY` (see `.env.example`). Both outputs are committed so the site builds without the key. Pass `--force` to refetch titles already in the JSON.

Watched, ratings and notes live in the browser (`localStorage`). Export/import them from the Filters drawer.

## Checks

```bash
npm test            # unit tests (Vitest)
npm run typecheck
npm run lint
npx playwright test # e2e, desktop (1440×900) and mobile (390×844)
```

## Deploy

Any static host. For GitHub Pages, set `base: "/<repo>/"` in `vite.config.ts`. Leave it as `/` for Netlify or Vercel.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
