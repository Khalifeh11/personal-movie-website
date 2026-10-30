import { inMood } from "./filters";
import { BUCKETS, bucketLabel } from "./moods";
import type { MoodFilter, Title } from "./types";

export interface Tile {
  slug: MoodFilter;
  label: string;
  count: number;
  /** Always four slots; `null` where the mood has no more posters. */
  posters: (string | null)[];
}

const SLOTS = 4;

/** One tile per bucket (BUCKETS order) then All, from a deck that's already filtered and shuffled. */
export function moodTiles(deck: Title[]): Tile[] {
  const slugs: MoodFilter[] = [...BUCKETS.map((b) => b.slug), "all"];
  return slugs.map((slug) => {
    const ts = deck.filter((t) => inMood(t, slug));
    const posters = ts.flatMap((t) => (t.poster ? [t.poster] : [])).slice(0, SLOTS);
    return {
      slug,
      label: bucketLabel(slug),
      count: ts.length,
      posters: [...posters, ...Array<null>(SLOTS - posters.length).fill(null)],
    };
  });
}

export function countLabel(n: number): string {
  return `${n} ${n === 1 ? "title" : "titles"}`;
}
