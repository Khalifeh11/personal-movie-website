import { moodAccent } from "../../lib/moods";
import type { MoodFilter } from "../../lib/types";

/** The small round colour cue for a mood; the same accent as its tile. */
export function MoodDot({ slug, className = "" }: { slug: MoodFilter; className?: string }) {
  return (
    <span
      aria-hidden
      data-testid="mood-accent"
      className={`inline-block size-1.5 flex-none rounded-full ${className}`}
      style={{ background: moodAccent(slug) }}
    />
  );
}
