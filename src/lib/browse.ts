import { titlesBy } from "./directors";
import { inMood } from "./filters";
import { moodLabel } from "./moods";
import type { MoodFilter, Title, UserEntry } from "./types";

/** What a browse page lists: everything in a mood, or everything by a director. */
export type Scope = { kind: "mood"; mood: MoodFilter } | { kind: "director"; name: string };

export function scopeTitles(titles: Title[], scope: Scope): Title[] {
  return scope.kind === "mood" ? titles.filter((t) => inMood(t, scope.mood)) : titlesBy(titles, scope.name);
}

/** The page's h1. */
export function scopeLabel(scope: Scope): string {
  return scope.kind === "mood" ? moodLabel(scope.mood) : scope.name;
}

/** Stable identity for a scope (React key): `"mood:tense"`, `"director:Billy Wilder"`. */
export function scopeKey(scope: Scope): string {
  return scope.kind === "mood" ? `mood:${scope.mood}` : `director:${scope.name}`;
}

export type SortKey = "imdb" | "year" | "runtime" | "title" | "mine";
export type SortDir = "asc" | "desc";

export const SORTS: { key: SortKey; label: string; dir: SortDir }[] = [
  { key: "imdb", label: "IMDb rating", dir: "desc" },
  { key: "year", label: "Year", dir: "desc" },
  { key: "runtime", label: "Runtime", dir: "asc" },
  { key: "title", label: "Title", dir: "asc" },
  { key: "mine", label: "Your rating", dir: "desc" },
];

/** The direction a key starts in when picked. */
export const defaultDir = (key: SortKey): SortDir => SORTS.find((s) => s.key === key)!.dir;

type User = Record<string, UserEntry>;

const NUMERIC: Record<Exclude<SortKey, "title">, (t: Title, u: User) => number | null> = {
  imdb: (t) => t.imdbRating,
  year: (t) => t.year,
  runtime: (t) => t.runtime,
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
