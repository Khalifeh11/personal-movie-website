import type { Filters, RuntimeBand, TypeFilter } from "./types";

const TYPES = new Set<string>(["all", "Movie", "Series"]);
const BANDS = new Set<string>(["any", "short", "mid", "long"]);

export type QueryFilters = Partial<Pick<Filters, "type" | "runtime">>;

/** Bare query string (no "#", no path). Only valid values come back; unknown keys/values are dropped. */
export function parseQuery(query: string): QueryFilters {
  const params = new URLSearchParams(query);
  const out: QueryFilters = {};
  const type = params.get("type");
  const rt = params.get("rt");
  if (type && TYPES.has(type)) out.type = type as TypeFilter;
  if (rt && BANDS.has(rt)) out.runtime = rt as RuntimeBand;
  return out;
}

/** `type=Movie&rt=mid`; defaults omitted; "" when nothing to write. */
export function serializeQuery(f: Filters): string {
  const params = new URLSearchParams();
  if (f.type !== "all") params.set("type", f.type);
  if (f.runtime !== "any") params.set("rt", f.runtime);
  return params.toString();
}
