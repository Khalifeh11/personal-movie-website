import { decadeLabel, decadeTitles, type Decade } from "./decades";
import { titlesBy } from "./directors";
import { inMood } from "./filters";
import { moodLabel } from "./moods";
import { SHELF_HEADINGS, shelfTitles, type ShelfId } from "./shelves";
import type { MoodFilter, Title, UserEntry } from "./types";

/** What a browse page lists: everything in a mood, everything by a director, a home shelf's set, or a decade's titles. */
export type Scope = { kind: "mood"; mood: MoodFilter } | { kind: "director"; name: string } | { kind: "shelf"; shelf: ShelfId; today: Date } | { kind: "decade"; decade: Decade };

export function scopeTitles(titles: Title[], scope: Scope): Title[] {
  if (scope.kind === "mood") return titles.filter((t) => inMood(t, scope.mood));
  if (scope.kind === "director") return titlesBy(titles, scope.name);
  if (scope.kind === "decade") return decadeTitles(titles, scope.decade);
  return shelfTitles(titles, scope.shelf, scope.today);
}

/** The page's h1. */
export function scopeLabel(scope: Scope): string {
  if (scope.kind === "mood") return moodLabel(scope.mood);
  if (scope.kind === "director") return scope.name;
  if (scope.kind === "decade") return decadeLabel(scope.decade);
  return SHELF_HEADINGS[scope.shelf];
}

/** Stable identity for a scope (React key): `"mood:tense"`, `"director:Billy Wilder"`, `"shelf:short"`. */
export function scopeKey(scope: Scope): string {
  if (scope.kind === "mood") return `mood:${scope.mood}`;
  if (scope.kind === "director") return `director:${scope.name}`;
  if (scope.kind === "decade") return `decade:${scope.decade}`;
  return `shelf:${scope.shelf}`;
}

/** The sort a page starts with when nothing is saved for it: shelves sort by what defines them. */
export function defaultSort(scope: Scope): SortKey {
  if (scope.kind === "decade") return "year";
  if (scope.kind !== "shelf") return "imdb";
  return scope.shelf === "short" ? "runtime" : "added";
}

export type SortKey = "imdb" | "year" | "runtime" | "added" | "title" | "mine";
export type SortDir = "asc" | "desc";

export const SORTS: { key: SortKey; label: string; dir: SortDir }[] = [
  { key: "imdb", label: "IMDb rating", dir: "desc" },
  { key: "year", label: "Year", dir: "desc" },
  { key: "runtime", label: "Runtime", dir: "asc" },
  { key: "added", label: "Added", dir: "asc" },
  { key: "title", label: "Title", dir: "asc" },
  { key: "mine", label: "Your rating", dir: "desc" },
];

/** The direction a key starts in when picked. */
export const defaultDir = (key: SortKey): SortDir => SORTS.find((s) => s.key === key)!.dir;

/** A decade reads oldest-first, so its year sort starts ascending. */
export const defaultDirFor = (scope: Scope, key: SortKey): SortDir =>
  scope.kind === "decade" && key === "year" ? "asc" : defaultDir(key);

type User = Record<string, UserEntry>;

const NUMERIC: Record<Exclude<SortKey, "title">, (t: Title, u: User) => number | null> = {
  imdb: (t) => t.imdbRating,
  year: (t) => t.year,
  runtime: (t) => t.runtime,
  added: (t) => (t.added ? Date.parse(t.added) : null),
  mine: (t, u) => u[t.id]?.rating ?? null,
};

/** Nulls always sort last whatever the direction; ties keep input order. */
export function sortTitles(ts: Title[], key: SortKey, user: User, dir: SortDir = defaultDir(key)): Title[] {
  const sign = dir === "asc" ? 1 : -1;
  if (key === "title") return [...ts].sort((x, y) => x.title.localeCompare(y.title) * sign);
  const get = NUMERIC[key];
  return [...ts].sort((x, y) => {
    const a = get(x, user);
    const b = get(y, user);
    if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1;
    return (a - b) * sign;
  });
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const haystack = (t: Title) =>
  fold([t.title, t.originalTitle, ...t.directors, ...t.genres, ...t.moods.map(moodLabel), ...t.keywords, t.year ?? ""].join("\n"));

/** Every word must appear somewhere: title, director, genre, mood, keyword or year. */
export function searchTitles(ts: Title[], q: string): Title[] {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return ts;
  return ts.filter((t) => {
    const hay = haystack(t);
    return words.every((w) => hay.includes(w));
  });
}
