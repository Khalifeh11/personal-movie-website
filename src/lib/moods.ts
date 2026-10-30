import moods from "../data/moods.json";
import type { MoodFilter, MoodSlug } from "./types";

/** The mood vocabulary, in display order. Shared with scripts/enrich.mjs via moods.json. */
export const MOODS = moods as { slug: MoodSlug; label: string }[];

export function moodLabel(slug: MoodFilter): string {
  if (slug === "all") return "All";
  return MOODS.find((m) => m.slug === slug)?.label ?? slug;
}
