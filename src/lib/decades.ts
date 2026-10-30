import type { Title } from "./types";

export type Decade = number;

/** Start of the decade axis; a test guards it against the catalogue's oldest title. */
export const FIRST_YEAR = 1930;

export function decadeOf(year: number): Decade {
  return Math.floor(year / 10) * 10;
}

/** FIRST_YEAR's decade up to the current one. */
export function decades(now: Date = new Date()): Decade[] {
  const out: Decade[] = [];
  for (let d = FIRST_YEAR; d <= decadeOf(now.getFullYear()); d += 10) out.push(d);
  return out;
}

/** Titles per year; index 0 is FIRST_YEAR. Callers pass already-filtered titles. */
export function yearCounts(titles: Title[], now: Date = new Date()): number[] {
  const counts = new Array<number>(now.getFullYear() - FIRST_YEAR + 1).fill(0);
  for (const t of titles) {
    if (t.year != null && t.year >= FIRST_YEAR && t.year - FIRST_YEAR < counts.length) counts[t.year - FIRST_YEAR]++;
  }
  return counts;
}

export function decadeTitles(titles: Title[], d: Decade): Title[] {
  return titles
    .filter((t) => t.year != null && t.year >= d && t.year <= d + 9)
    .sort((a, b) => a.year! - b.year! || a.title.localeCompare(b.title));
}

/** Decade with the most titles; ties go to the earlier one. */
export function busiestDecade(titles: Title[]): Decade | null {
  const counts = new Map<Decade, number>();
  for (const t of titles) {
    if (t.year != null) counts.set(decadeOf(t.year), (counts.get(decadeOf(t.year)) ?? 0) + 1);
  }
  let best: Decade | null = null;
  for (const [d, n] of counts) {
    if (best === null || n > counts.get(best)! || (n === counts.get(best)! && d < best)) best = d;
  }
  return best;
}

/** Nearest decade in `dir` that has at least one title. */
export function nextDecade(from: Decade, titles: Title[], dir: 1 | -1, now: Date = new Date()): Decade | null {
  const have = new Set(titles.flatMap((t) => (t.year == null ? [] : [decadeOf(t.year)])));
  const last = decadeOf(now.getFullYear());
  for (let d = from + dir * 10; d >= FIRST_YEAR && d <= last; d += dir * 10) {
    if (have.has(d)) return d;
  }
  return null;
}

export function decadeLabel(d: Decade): string {
  return `${d}s`;
}

export function isDecade(s: string, now: Date = new Date()): s is `${number}` {
  const n = Number(s);
  return /^\d{4}$/.test(s) && n % 10 === 0 && n >= FIRST_YEAR && n <= decadeOf(now.getFullYear());
}
