import type { Title, UserEntry } from "./types";

export type SortKey = "imdb" | "year" | "runtime" | "title" | "mine";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "imdb", label: "IMDb" },
  { key: "year", label: "Year" },
  { key: "runtime", label: "Runtime" },
  { key: "title", label: "Title" },
  { key: "mine", label: "Your rating" },
];

type User = Record<string, UserEntry>;

/** Each key has one natural direction; nulls always sort last; ties keep input order. */
const NUMERIC: Record<Exclude<SortKey, "title">, { get: (t: Title, u: User) => number | null; dir: 1 | -1 }> = {
  imdb: { get: (t) => t.imdbRating, dir: -1 },
  year: { get: (t) => t.year, dir: -1 },
  runtime: { get: (t) => t.runtime, dir: 1 },
  mine: { get: (t, u) => u[t.id]?.rating ?? null, dir: -1 },
};

export function sortTitles(ts: Title[], key: SortKey, user: User): Title[] {
  if (key === "title") return [...ts].sort((x, y) => x.title.localeCompare(y.title));
  const { get, dir } = NUMERIC[key];
  return [...ts].sort((x, y) => {
    const a = get(x, user);
    const b = get(y, user);
    if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1;
    return (a - b) * dir;
  });
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function searchTitles(ts: Title[], q: string): Title[] {
  const needle = fold(q.trim());
  if (!needle) return ts;
  return ts.filter((t) => [t.title, t.originalTitle, ...t.directors].some((s) => fold(s).includes(needle)));
}
