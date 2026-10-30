import { useMemo, useState } from "react";
import { searchTitles, SORTS, sortTitles, type SortKey } from "../lib/browse";
import { inMood, matches } from "../lib/filters";
import { countLabel } from "../lib/moodTiles";
import { bucketLabel } from "../lib/moods";
import type { Filters, MoodFilter, Title } from "../lib/types";
import { useUserData } from "../state/useUserData";
import { EmptyState } from "./EmptyState";
import { FilmRow } from "./FilmRow";
import { Pill } from "./ui/Pill";

interface MoodPageProps {
  mood: MoodFilter;
  titles: Title[];
  filters: Filters;
  onFilters: (f: Partial<Filters>) => void;
  onTrailer: (t: Title) => void;
}

const action =
  "rounded-full border border-white/25 px-3 py-1.5 font-ui text-[10px] uppercase tracking-ui text-fg-2 transition-colors hover:border-fg hover:text-fg";
const control =
  "rounded-full border border-white/25 bg-transparent px-3.5 py-2 font-ui text-xs text-fg-2 outline-none focus:border-fg";

export function MoodPage({ mood, titles, filters, onFilters }: MoodPageProps) {
  const { entries } = useUserData();
  const [sort, setSort] = useState<SortKey>("imdb");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const pool = titles.filter((t) => inMood(t, mood) && matches(t, filters, entries));
    return sortTitles(searchTitles(pool, query), sort, entries);
  }, [titles, mood, filters, entries, query, sort]);

  return (
    <main className="px-5 pb-16 pt-24 md:px-11 md:pt-32">
      <header className="mb-6 flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-5xl uppercase leading-[0.9] md:text-7xl">{bucketLabel(mood)}</h1>
          <p className="mt-3 font-ui text-[11px] uppercase tracking-ui text-fg-3">{countLabel(rows.length)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={control}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key} className="bg-bg">{s.label}</option>
            ))}
          </select>
          <input
            type="search"
            aria-label="Search"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${control} w-44`}
          />
          <Pill active={filters.hideWatched} onClick={() => onFilters({ hideWatched: !filters.hideWatched })}>
            Hide watched
          </Pill>
        </div>
      </header>
      {rows.length === 0 ? (
        <EmptyState hint="Clear the search or loosen the filters." />
      ) : (
        rows.map((t, i) => (
          <FilmRow
            key={t.id}
            n={i + 1}
            title={t}
            dimmed={Boolean(entries[t.id]?.watched)}
            actions={<a href={t.imdbUrl} target="_blank" rel="noreferrer" className={action}>IMDb ↗</a>}
          />
        ))
      )}
    </main>
  );
}
