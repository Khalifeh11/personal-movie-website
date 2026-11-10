import { isDecade, type Decade } from "./decades";
import { MOODS, type Mood } from "./moods";
import type { Title } from "./types";

/** Lower-case, accents stripped: "Amélie" → "amelie". */
export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const isWordChar = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}]/u.test(c);

/** Index of `q` at the start of a word in `n` ("car" → Carpenter, not Oscar), or -1. Both already folded. */
export function wordStartIndex(n: string, q: string): number {
  if (!q) return -1;
  for (let i = n.indexOf(q); i >= 0; i = n.indexOf(q, i + 1)) if (!isWordChar(n[i - 1])) return i;
  return -1;
}

/** Best match first: title start > title word > anywhere in the title > director name word > exact year > all words across title/director/year > genre/keyword. IMDb rating breaks ties. */
export function rankTitles(titles: Title[], query: string): Title[] {
  const q = fold(query.trim());
  if (!q) return [];
  const words = q.split(/\s+/);
  const scored: { t: Title; s: number }[] = [];
  for (const t of titles) {
    const title = fold(t.title);
    const original = fold(t.originalTitle);
    const dir = fold(t.directors.join(", "));
    let s = 0;
    if (title.startsWith(q) || original.startsWith(q)) s = 100;
    else if (wordStartIndex(title, q) >= 0 || wordStartIndex(original, q) >= 0) s = 80;
    else if (title.includes(q) || original.includes(q)) s = 60;
    else if (wordStartIndex(dir, q) >= 0) s = 50;
    else if (String(t.year) === q) s = 45;
    else if (words.length > 1 && words.every((w) => `${title} ${original} ${dir} ${t.year ?? ""}`.includes(w))) s = 40;
    else if (q.length > 2 && fold([...t.genres, ...t.keywords].join("\n")).includes(q)) s = 20;
    if (s) scored.push({ t, s: s + (t.imdbRating ?? 0) / 10 });
  }
  return scored.sort((a, b) => b.s - a.s).map((x) => x.t);
}

/** "90s", "'90s", "1990s" → 1990; null when it isn't a decade the site has. A bare "1990" is a year, not a decade. */
export function decadeQuery(query: string, now: Date = new Date()): Decade | null {
  const q = query.trim().toLowerCase().replace(/^['’]/, "");
  const short = q.match(/^(\d)0s$/);
  const full = short ? String((Number(short[1]) >= 3 ? 1900 : 2000) + Number(short[1]) * 10) : q.match(/^(\d{3}0)s$/)?.[1];
  return full && isDecade(full, now) ? Number(full) : null;
}

/** Moods whose label or slug starts with the query (2+ letters). */
export function moodQuery(query: string): Mood[] {
  const q = fold(query.trim());
  if (q.length < 2) return [];
  return MOODS.filter((m) => fold(m.label).startsWith(q) || m.slug.startsWith(q));
}

/** Where to underline `query` in `text`: `[start, end]` or null. `wordStart` only accepts the start of a word. */
export function matchRange(text: string, query: string, wordStart = false): [number, number] | null {
  const q = fold(query.trim());
  const n = fold(text);
  // Folding can change the length (rare scripts); then the indexes no longer line up, so skip the underline.
  if (!q || n.length !== text.length) return null;
  const i = wordStart ? wordStartIndex(n, q) : n.indexOf(q);
  return i < 0 ? null : [i, i + q.length];
}
