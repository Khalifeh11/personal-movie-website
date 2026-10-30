import { moodLabel } from "./moods";
import type { Title } from "./types";

/** "A film by Louis Malle" split so the name can be bolded; "A series" when no director. */
export function byline(t: Title): { lead: string; name: string | null } {
  const kind = t.type === "Series" ? "series" : "film";
  if (t.directors.length === 0) return { lead: `A ${kind}`, name: null };
  return { lead: `A ${kind} by`, name: t.directors.join(" & ") };
}

export function genreLine(t: Title): string {
  return t.genres.length ? t.genres.slice(0, 3).join(" · ") : "—";
}

export function ratingText(t: Title): string {
  return t.imdbRating == null ? "—" : t.imdbRating.toFixed(1);
}

/** "Tense · Gritty"; "" for an untagged title. */
export function feelsLine(t: Title): string {
  return t.moods.map(moodLabel).join(" · ");
}

/** The one line under a grid poster: "2019 · Series · IMDb 9.3". */
export function gridCaption(t: Title): string {
  return `${t.year ?? "—"} · ${t.type} · IMDb ${ratingText(t)}`;
}

/** "2013-12-14" → "Dec 14, 2013" (UTC, so the day never shifts with the viewer's zone). */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
