import buckets from "../data/mood-buckets.json";
import type { MoodFilter, MoodSlug } from "./types";

export const BUCKETS: { slug: MoodSlug; label: string }[] = [
  { slug: "on-edge", label: "On edge" },
  { slug: "unsettling", label: "Unsettling" },
  { slug: "mind-bending", label: "Mind-bending" },
  { slug: "wry-funny", label: "Wry & funny" },
  { slug: "transported", label: "Transported" },
  { slug: "moved", label: "Moved" },
  { slug: "real-life", label: "Real life" },
];

const FALLBACK: MoodSlug = "moved";

const lookup = new Map<string, MoodSlug>(
  Object.entries(buckets).flatMap(([slug, moods]) =>
    moods.map((m) => [m, slug as MoodSlug] as const),
  ),
);

export function bucketFor(csvMood: string): MoodSlug {
  const slug = lookup.get(csvMood.trim());
  if (slug) return slug;
  console.warn(`Unmapped mood "${csvMood}" → ${FALLBACK}`);
  return FALLBACK;
}

export function bucketLabel(slug: MoodFilter): string {
  if (slug === "all") return "All";
  return BUCKETS.find((b) => b.slug === slug)?.label ?? slug;
}
