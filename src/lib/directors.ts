import type { Title } from "./types";

/** "Miloš Forman" → "milos-forman": NFD, strip combining marks, lower-case, non-alphanumeric runs → "-". */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Every director name, unique, in first-seen order. */
export function directorsOf(titles: Title[]): string[] {
  return [...new Set(titles.flatMap((t) => t.directors))];
}

export function titlesBy(titles: Title[], name: string): Title[] {
  return titles.filter((t) => t.directors.includes(name));
}
