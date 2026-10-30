import { seededShuffle } from "./shuffle";
import type { Filters, RuntimeBand, Title, UserEntry } from "./types";

/** short < 100, mid 100–140 inclusive, long > 140; null when runtime unknown. */
export function runtimeBand(runtime: number | null): RuntimeBand | null {
  if (runtime == null) return null;
  if (runtime < 100) return "short";
  if (runtime <= 140) return "mid";
  return "long";
}

export function matches(t: Title, f: Filters, user: Record<string, UserEntry>): boolean {
  if (f.mood !== "all" && t.moodBucket !== f.mood) return false;
  if (f.type !== "all" && t.type !== f.type) return false;
  if (f.runtime !== "any" && runtimeBand(t.runtime) !== f.runtime) return false;
  if (f.hideWatched && user[t.id]?.watched) return false;
  return true;
}

export function buildDeck(
  titles: Title[],
  f: Filters,
  user: Record<string, UserEntry>,
  seed: number,
): Title[] {
  return seededShuffle(titles.filter((t) => matches(t, f, user)), seed);
}

export function formatRuntime(t: Title): string {
  if (t.runtime == null) return "—";
  return t.type === "Series" ? `${t.runtime} min / ep` : `${t.runtime} min`;
}
