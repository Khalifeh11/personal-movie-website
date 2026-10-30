import { BUCKETS } from "./moods";
import type { Filters, MoodFilter, RuntimeBand, TypeFilter } from "./types";

const MOODS = new Set<string>(["all", ...BUCKETS.map((b) => b.slug)]);
const TYPES = new Set<string>(["all", "Movie", "Series"]);
const BANDS = new Set<string>(["any", "short", "mid", "long"]);

export type HashFilters = Partial<Pick<Filters, "mood" | "type" | "runtime">>;

/** Only valid values come back; unknown keys/values are dropped silently. */
export function parseHash(hash: string): HashFilters {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const out: HashFilters = {};
  const mood = params.get("mood");
  const type = params.get("type");
  const rt = params.get("rt");
  if (mood && MOODS.has(mood)) out.mood = mood as MoodFilter;
  if (type && TYPES.has(type)) out.type = type as TypeFilter;
  if (rt && BANDS.has(rt)) out.runtime = rt as RuntimeBand;
  return out;
}

/** `#mood=on-edge&type=Movie&rt=mid`; defaults omitted; "" when nothing to write. */
export function serializeHash(f: Filters): string {
  const params = new URLSearchParams();
  if (f.mood !== "all") params.set("mood", f.mood);
  if (f.type !== "all") params.set("type", f.type);
  if (f.runtime !== "any") params.set("rt", f.runtime);
  const s = params.toString();
  return s ? `#${s}` : "";
}
