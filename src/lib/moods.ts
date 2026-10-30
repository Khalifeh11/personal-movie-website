import moods from "../data/moods.json";
import type { MoodFilter, MoodSlug } from "./types";

export interface Mood {
  slug: MoodSlug;
  label: string;
  /** Hex colour used as a tint/highlight for this mood. */
  accent: string;
  /** IMDb id whose backdrop fronts the mood tile; `null` = pick automatically. */
  hero: string | null;
}

const ALL_ACCENT = "#FFFFFF";

/** The mood vocabulary, in display order. Shared with scripts/enrich.mjs via moods.json. */
export const MOODS = moods as Mood[];

const find = (slug: MoodFilter) => MOODS.find((m) => m.slug === slug);

export function moodLabel(slug: MoodFilter): string {
  if (slug === "all") return "All";
  return find(slug)?.label ?? slug;
}

export function moodAccent(slug: MoodFilter): string {
  return find(slug)?.accent ?? ALL_ACCENT;
}

export function moodHero(slug: MoodFilter): string | null {
  return find(slug)?.hero ?? null;
}
