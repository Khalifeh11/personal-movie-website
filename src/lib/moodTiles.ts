import { inMood } from "./filters";
import { MOODS, moodAccent, moodHero, moodLabel } from "./moods";
import type { MoodFilter, Title } from "./types";

export interface Tile {
  slug: MoodFilter;
  label: string;
  count: number;
  accent: string;
  /** The picked title's small backdrop (full one as fallback); `null` when no title in the mood has one. */
  backdrop: string | null;
}

const num = (n: number | null) => n ?? -Infinity;

/** Best first: rating, then votes, then id (stable across reloads). */
function byRank(a: Title, b: Title): number {
  return num(b.imdbRating) - num(a.imdbRating) || num(b.imdbVotes) - num(a.imdbVotes) || a.id.localeCompare(b.id);
}

/**
 * One tile per mood (MOODS order) then All. Counts come from `deck` (filtered and shuffled);
 * backdrops are picked from `titles` (everything) so a tile keeps its still whatever the filters say.
 * Each still is used at most once; tiles pick greedily in order, a `hero` override first.
 */
export function moodTiles(deck: Title[], titles: Title[], heroOf: (slug: MoodFilter) => string | null = moodHero): Tile[] {
  const slugs: MoodFilter[] = [...MOODS.map((m) => m.slug), "all"];
  const ranked = titles.filter((t) => t.backdrop).sort(byRank);
  const heroFor = (slug: MoodFilter) => {
    const id = heroOf(slug);
    return id ? ranked.find((t) => t.id === id) : undefined;
  };
  // Reserve every hero first so an earlier tile's auto-pick can't take a later tile's hero.
  const used = new Set(slugs.flatMap((s) => heroFor(s)?.id ?? []));
  return slugs.map((slug) => {
    const pick = heroFor(slug) ?? ranked.find((t) => inMood(t, slug) && !used.has(t.id));
    if (pick) used.add(pick.id);
    return {
      slug,
      label: moodLabel(slug),
      count: deck.filter((t) => inMood(t, slug)).length,
      accent: moodAccent(slug),
      backdrop: pick ? (pick.backdropSmall ?? pick.backdrop) : null,
    };
  });
}

export function countLabel(n: number): string {
  return `${n} ${n === 1 ? "title" : "titles"}`;
}
