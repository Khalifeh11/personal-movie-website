import type { Route } from "./route";
import type { Title } from "./types";

/** The two fixed shelves; the director shelf is derived from tonight's pick. */
export type ShelfId = "short" | "waiting";

export interface Shelf {
  id: ShelfId | "director";
  heading: string;
  /** Full set size (shown after the heading). */
  count: number;
  /** The first `SHELF_LIMIT` of the set. */
  items: Title[];
  /** One caption line under a poster. */
  meta: (t: Title) => string;
  seeAll: Route;
}

export const SHELF_LIMIT = 12;
const SHORT_MAX = 90;

export const SHELF_HEADINGS: Record<ShelfId, string> = { short: "Under 90 minutes", waiting: "Waiting the longest" };

const byTitle = (x: Title, y: Title) => x.title.localeCompare(y.title);
const yearRuntime = (t: Title) => `${t.year ?? "—"} · ${t.runtime == null ? "—" : `${t.runtime} min`}`;
const since = (t: Title) => `since ${t.added?.slice(0, 4) ?? "—"}`;

/** The shelf's full set in shelf order (also the browse scope for `#/shelf/<id>`). */
export function shelfTitles(titles: Title[], id: ShelfId): Title[] {
  if (id === "short") {
    return titles
      .filter((t) => t.type === "Movie" && t.runtime != null && t.runtime < SHORT_MAX)
      .sort((x, y) => x.runtime! - y.runtime! || byTitle(x, y));
  }
  return titles.filter((t) => t.added != null).sort((x, y) => x.added!.localeCompare(y.added!) || byTitle(x, y));
}

function shelf(id: Shelf["id"], heading: string, set: Title[], meta: Shelf["meta"], seeAll: Route): Shelf | null {
  return set.length ? { id, heading, count: set.length, items: set.slice(0, SHELF_LIMIT), meta, seeAll } : null;
}

/** Short, waiting, then more from tonight's first director; empty shelves are left out. */
export function homeShelves(deck: Title[], current: Title | undefined): Shelf[] {
  const out = [
    shelf("short", SHELF_HEADINGS.short, shelfTitles(deck, "short"), yearRuntime, { name: "shelf", shelf: "short" }),
    shelf("waiting", SHELF_HEADINGS.waiting, shelfTitles(deck, "waiting"), since, { name: "shelf", shelf: "waiting" }),
  ];
  const director = current?.directors[0];
  if (current && director) {
    const others = deck
      .filter((t) => t.id !== current.id && t.directors.includes(director))
      .sort((x, y) => (y.year ?? -Infinity) - (x.year ?? -Infinity));
    out.push(shelf("director", `More from ${director}`, others, yearRuntime, { name: "director", director }));
  }
  return out.filter((s): s is Shelf => s != null);
}
