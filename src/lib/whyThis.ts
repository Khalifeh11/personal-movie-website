import { titlesBy } from "./directors";
import { moodLabel } from "./moods";
import type { Title } from "./types";

export interface WhyCtx {
  /** Everything in the list (director counts). */
  titles: Title[];
  /** The current filtered deck (waiting comparisons). */
  deck: Title[];
  today: Date;
}

const WAIT_YEARS = 3;

const parse = (added: string) => new Date(`${added}T00:00:00Z`);
const monthYear = (added: string) => parse(added).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/** ≥ 3 years old and within the oldest quarter of the deck's dated titles. */
function waiting(t: Title, ctx: WhyCtx): string | null {
  if (!t.added) return null;
  const cutoff = new Date(ctx.today);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - WAIT_YEARS);
  const when = parse(t.added);
  if (when > cutoff) return null;
  const dates = ctx.deck.flatMap((d) => (d.added ? [parse(d.added).getTime()] : [])).sort((x, y) => x - y);
  if (dates.length === 0) return null;
  const quartile = dates[Math.floor((dates.length - 1) * 0.25)];
  if (when.getTime() > quartile) return null;
  const tail = when.getTime() === dates[0] ? ", longer than anything else" : "";
  return `It's been waiting on your list since ${monthYear(t.added)}${tail}.`;
}

function length(t: Title): string | null {
  if (t.runtime == null) return null;
  if (t.type === "Series") return `Episodes run ${t.runtime} minutes, so you can try one tonight.`;
  return t.runtime < 100 ? `At ${t.runtime} minutes, a weeknight will do.` : null;
}

function director(t: Title, ctx: WhyCtx): string | null {
  for (const d of t.directors) {
    const n = titlesBy(ctx.titles, d).length - 1;
    if (n > 0) return `${d} is on your list ${n} more ${n === 1 ? "time" : "times"}.`;
  }
  return null;
}

const mood = (t: Title): string | null => (t.moods.length ? `Picked for a ${moodLabel(t.moods[0])} night.` : null);

/** Up to two reasons, in priority order, as one line; null when none apply. */
export function whyThis(t: Title, ctx: WhyCtx): string | null {
  const reasons = [waiting(t, ctx), length(t), director(t, ctx), mood(t)].filter((r): r is string => r != null).slice(0, 2);
  return reasons.length ? reasons.join(" ") : null;
}
