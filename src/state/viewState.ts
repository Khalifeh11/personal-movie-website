import type { SortDir, SortKey } from "../lib/browse";
import { serializeRoute, type Route } from "../lib/route";

export interface ViewState {
  sort: SortKey;
  dir: SortDir;
  query: string;
  scrollY: number;
}

/**
 * Per-route view state (sort, direction, search, scroll) so Back/Forward land where you left.
 * Pages save on unmount and load on mount; a fresh navigation clears the target first so only
 * history traversal restores. Module-level: lost on reload, which is the intended "defaults" case.
 */
const views = new Map<string, ViewState>();

/** The path between the leading `#` and the first `?`: `"#/mood/x?type=Movie"` → `"/mood/x"`. */
export function keyOf(hash: string): string {
  const raw = hash.replace(/^#/, "");
  const q = raw.indexOf("?");
  return q >= 0 ? raw.slice(0, q) : raw;
}

export function routeKey(r: Route): string {
  return keyOf(serializeRoute(r, { type: "all", runtime: "any", hideWatched: false }));
}

export function saveView(key: string, v: ViewState): void {
  views.set(key, v);
}

export function loadView(key: string): ViewState | null {
  return views.get(key) ?? null;
}

export function clearView(key: string): void {
  views.delete(key);
}

/** Navigate as a fresh visit: the target starts at defaults. Same hash → just scroll to the top. */
export function freshNavigate(hash: string): void {
  clearView(keyOf(hash));
  if (location.hash === hash) scrollTo(0, 0);
  else location.hash = hash;
}
