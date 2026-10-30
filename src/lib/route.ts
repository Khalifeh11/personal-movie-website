import { slugify } from "./directors";
import { parseQuery, serializeQuery, type QueryFilters } from "./hash";
import { MOODS } from "./moods";
import type { Filters, MoodFilter } from "./types";

export type Route = { name: "home" } | { name: "mood"; mood: MoodFilter } | { name: "director"; director: string };

const SLUGS = new Set<string>(["all", ...MOODS.map((m) => m.slug)]);
const HOME: Route = { name: "home" };

/**
 * `#/`, `#/mood/<slug>`, `#/director/<slug>`, each with an optional `?type=…&rt=…`. Anything else is
 * home with `redirect: true`; a legacy query-only hash (`#mood=x&type=Movie`) keeps its valid filters.
 * Director slugs resolve against `directors` (original names); the first match wins on collision.
 */
export function parseRoute(
  hash: string,
  directors: readonly string[] = [],
): { route: Route; filters: QueryFilters; redirect: boolean } {
  const raw = hash.replace(/^#/, "");
  if (raw && !raw.startsWith("/")) return { route: HOME, filters: parseQuery(raw), redirect: true };
  const q = raw.indexOf("?");
  const path = q >= 0 ? raw.slice(0, q) : raw;
  const filters = parseQuery(q >= 0 ? raw.slice(q + 1) : "");
  if (path === "" || path === "/") return { route: HOME, filters, redirect: false };
  const m = path.match(/^\/mood\/([^/]+)$/);
  if (m && SLUGS.has(m[1])) return { route: { name: "mood", mood: m[1] as MoodFilter }, filters, redirect: false };
  const d = path.match(/^\/director\/([^/]+)$/);
  if (d) {
    const director = directors.find((name) => slugify(name) === d[1]);
    if (director) return { route: { name: "director", director }, filters, redirect: false };
  }
  return { route: HOME, filters: {}, redirect: true };
}

export function serializeRoute(route: Route, f: Filters): string {
  const path =
    route.name === "mood" ? `/mood/${route.mood}` : route.name === "director" ? `/director/${slugify(route.director)}` : "/";
  const query = serializeQuery(f);
  return `#${path}${query ? `?${query}` : ""}`;
}
