import type { Route } from "./route";
import { shortDate } from "./format";
import type { Title } from "./types";

/** The fixed shelves; the director shelf is derived from tonight's pick. */
export type ShelfId = "short" | "waiting" | "around";

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
/** A one-poster "More from" shelf looks thin; it needs at least this many. */
const DIRECTOR_MIN = 2;
/** "Around this day" reaches this many days either side. */
const AROUND_DAYS = 3;

export const SHELF_HEADINGS: Record<ShelfId, string> = {
  short: "Under 90 minutes",
  waiting: "Waiting the longest",
  around: "This week, years ago",
};

const byTitle = (x: Title, y: Title) => x.title.localeCompare(y.title);
const yearRuntime = (t: Title) => `${t.year ?? "—"} · ${t.runtime == null ? "—" : `${t.runtime} min`}`;
const since = (t: Title) => `since ${t.added?.slice(0, 4) ?? "—"}`;

const DAY_MS = 86_400_000;
const YEAR_DAYS = 365;

/** Day-of-year on a fixed non-leap base (Feb 29 rolls to Mar 1). */
function dayOfYear(month: number, day: number): number {
  return Math.round((Date.UTC(2001, month, day) - Date.UTC(2001, 0, 1)) / DAY_MS);
}

/** Signed days from `today`'s month-day to the ISO date's, wrapping across Jan 1. */
function offsetFrom(today: Date, iso: string): number {
  const d = new Date(iso);
  const diff = dayOfYear(d.getUTCMonth(), d.getUTCDate()) - dayOfYear(today.getUTCMonth(), today.getUTCDate());
  return diff - YEAR_DAYS * Math.round(diff / YEAR_DAYS);
}

/** The shelf's full set in shelf order (also the browse scope for `#/shelf/<id>`). `today` only matters for "around". */
export function shelfTitles(titles: Title[], id: ShelfId, today: Date = new Date()): Title[] {
  if (id === "around") {
    const year = today.getUTCFullYear();
    return titles
      .filter((t) => t.added != null && Number(t.added.slice(0, 4)) < year && Math.abs(offsetFrom(today, t.added)) <= AROUND_DAYS)
      .sort(
        (x, y) =>
          Math.abs(offsetFrom(today, x.added!)) - Math.abs(offsetFrom(today, y.added!)) || x.added!.localeCompare(y.added!) || byTitle(x, y),
      );
  }
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

/** Short, waiting, around this day, then more from tonight's first director; empty shelves are left out. */
export function homeShelves(deck: Title[], current: Title | undefined, today: Date): Shelf[] {
  const out = [
    shelf("short", SHELF_HEADINGS.short, shelfTitles(deck, "short"), yearRuntime, { name: "shelf", shelf: "short" }),
    shelf("waiting", SHELF_HEADINGS.waiting, shelfTitles(deck, "waiting"), since, { name: "shelf", shelf: "waiting" }),
    shelf("around", SHELF_HEADINGS.around, shelfTitles(deck, "around", today), (t) => shortDate(t.added!), { name: "shelf", shelf: "around" }),
  ];
  const director = current?.directors[0];
  if (current && director) {
    const others = deck
      .filter((t) => t.id !== current.id && t.directors.includes(director))
      .sort((x, y) => (y.year ?? -Infinity) - (x.year ?? -Infinity));
    if (others.length >= DIRECTOR_MIN) out.push(shelf("director", `More from ${director}`, others, yearRuntime, { name: "director", director }));
  }
  return out.filter((s): s is Shelf => s != null);
}
