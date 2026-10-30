import { moodAccent } from "./moods";
import type { Title } from "./types";

const NEUTRAL = "#8a8a8a";

/**
 * The colour a title glows with: the still's own tint when it has one, else its first mood's
 * accent (black-and-white films still get a hue that fits), else a quiet grey.
 */
export function tintOf(t: Title | undefined): string {
  if (!t) return NEUTRAL;
  if (t.tint) return t.tint;
  if (t.moods[0]) return moodAccent(t.moods[0]);
  return NEUTRAL;
}
