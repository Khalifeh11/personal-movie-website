import { useMemo, useState } from "react";
import { defaultDir, scopeLabel, scopeTitles, searchTitles, sortTitles, type Scope, type SortDir, type SortKey } from "../lib/browse";
import { matches } from "../lib/filters";
import { countLabel } from "../lib/moodTiles";
import { moodAccent } from "../lib/moods";
import type { Filters, Title } from "../lib/types";
import { useUserData } from "../state/useUserData";
import { EmptyState } from "./EmptyState";
import { FilmRow } from "./FilmRow";
import { SortMenu } from "./SortMenu";
import { UserControls } from "./UserControls";
import { MoodDot } from "./ui/MoodDot";
import { Pill } from "./ui/Pill";

interface BrowsePageProps {
  scope: Scope;
  titles: Title[];
  filters: Filters;
  onFilters: (f: Partial<Filters>) => void;
  onTrailer: (t: Title) => void;
}

const action =
  "rounded-full border border-white/25 px-3 py-1.5 font-ui text-[11px] uppercase tracking-ui text-fg-2 transition-colors hover:border-fg hover:text-fg md:text-xs";
const control =
  "rounded-full border border-white/25 bg-transparent px-3.5 py-2 font-ui text-xs text-fg-2 outline-none focus:border-fg";

/** A mood page or a director page: header, sort/search controls and the rows. Keyed by scope from App. */
export function BrowsePage({ scope, titles, filters, onFilters, onTrailer }: BrowsePageProps) {
  const { entries } = useUserData();
  const [sort, setSort] = useState<SortKey>("imdb");
  const [dir, setDir] = useState<SortDir>(defaultDir("imdb"));
  const [query, setQuery] = useState("");
  const mood = scope.kind === "mood" ? scope.mood : null;
  const accent = mood ? moodAccent(mood) : "#FFFFFF";

  // Titles marked watched during this visit stay listed (dimmed) so rows don't jump under the cursor.
  // The page is keyed by scope; a new filter, sort or search starts a fresh view.
  const [kept, setKept] = useState<{ view: unknown[]; ids: Set<string> }>({ view: [filters, sort, dir, query], ids: new Set() });
  const view = [filters, sort, dir, query];
  if (view.some((v, i) => v !== kept.view[i])) setKept({ view, ids: new Set() });
  const keep = (id: string) => setKept((k) => ({ ...k, ids: new Set(k.ids).add(id) }));

  const rows = useMemo(() => {
    const pool = scopeTitles(titles, scope).filter((t) => matches(t, filters, entries) || kept.ids.has(t.id));
    return sortTitles(searchTitles(pool, query), sort, entries, dir);
  }, [titles, scope, filters, entries, query, sort, dir, kept.ids]);

  return (
    <main className="overflow-x-clip px-5 pb-16 pt-24 md:px-11 md:pt-32">
      <header className="relative mb-6 flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        {/* The mood's hue, bleeding in from the page's top-left corner. Director pages stay neutral. */}
        {mood && (
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-5 -top-24 bottom-0 md:-inset-x-11 md:-top-32"
            style={{ background: `radial-gradient(60% 100% at 0% 100%, color-mix(in srgb, ${accent} 22%, transparent), transparent)` }}
          />
        )}
        <div className="relative">
          <h1 className="font-display text-5xl uppercase leading-[0.9] md:text-7xl">{scopeLabel(scope)}</h1>
          <p className="mt-3 flex items-center gap-2 font-ui text-[11px] uppercase tracking-ui text-fg-3">
            {mood && <MoodDot slug={mood} />}
            {countLabel(rows.length)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SortMenu
            value={sort}
            onChange={(key) => {
              setSort(key);
              setDir(defaultDir(key));
            }}
            className={control}
          />
          <button
            type="button"
            aria-label={dir === "asc" ? "Ascending" : "Descending"}
            title={dir === "asc" ? "Ascending" : "Descending"}
            onClick={() => setDir(dir === "asc" ? "desc" : "asc")}
            className={`${control} hover:border-fg hover:text-fg`}
          >
            {dir === "asc" ? "↑" : "↓"}
          </button>
          <input
            type="search"
            aria-label="Search"
            placeholder="Title, director, genre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${control} w-52`}
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
            onOpen={() => {}}
            actions={
              <>
                {t.trailerKey && <button type="button" onClick={() => onTrailer(t)} className={action}>▶ Trailer</button>}
                <a href={t.imdbUrl} target="_blank" rel="noreferrer" className={action}>IMDb ↗</a>
                <UserControls id={t.id} onWatched={(w) => w && keep(t.id)} />
              </>
            }
          />
        ))
      )}
    </main>
  );
}
