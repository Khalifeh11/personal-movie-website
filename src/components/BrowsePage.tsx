import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { defaultDir, defaultSort, scopeLabel, scopeTitles, searchTitles, sortTitles, type Scope, type SortDir, type SortKey } from "../lib/browse";
import { matches } from "../lib/filters";
import { countLabel } from "../lib/moodTiles";
import { moodAccent } from "../lib/moods";
import type { Filters, Title } from "../lib/types";
import { usePersistedState } from "../state/usePersistedState";
import { useUserData } from "../state/useUserData";
import { loadView, saveView } from "../state/viewState";
import { EmptyState } from "./EmptyState";
import { FilmGrid } from "./FilmGrid";
import { FilmRow } from "./FilmRow";
import { SortMenu } from "./SortMenu";
import { TitleCard } from "./TitleCard";
import { UserControls } from "./UserControls";
import { action } from "./ui/actionClass";
import { MoodDot } from "./ui/MoodDot";
import { Pill } from "./ui/Pill";
import { VIEW_KEY, ViewToggle, type View } from "./ui/ViewToggle";

interface BrowsePageProps {
  scope: Scope;
  /** Route path (`routeKey`) under which sort, search and scroll are kept for Back/Forward. */
  viewKey: string;
  titles: Title[];
  filters: Filters;
  onFilters: (f: Partial<Filters>) => void;
  onTrailer: (t: Title) => void;
}

const control =
  "rounded-full border border-white/25 bg-transparent px-3.5 py-2 font-ui text-xs text-fg-2 outline-none focus:border-fg";

/** A mood page or a director page: header, sort/search controls and the rows. Keyed by scope from App. */
export function BrowsePage({ scope, viewKey, titles, filters, onFilters, onTrailer }: BrowsePageProps) {
  const { entries } = useUserData();
  // Arriving by Back/Forward restores the view you left; a fresh navigation cleared it, so defaults.
  const [saved] = useState(() => loadView(viewKey));
  const [sort, setSort] = useState<SortKey>(saved?.sort ?? defaultSort(scope));
  const [dir, setDir] = useState<SortDir>(saved?.dir ?? defaultDir(saved?.sort ?? defaultSort(scope)));
  const [query, setQuery] = useState(saved?.query ?? "");
  const [layout, setLayout] = usePersistedState<View>(VIEW_KEY, "list");
  // The title card: opened from a poster/title click or a grid cell; a route change unmounts the page and so closes it.
  const [cardFor, setCardFor] = useState<Title | null>(null);
  const latest = useRef({ sort, dir, query });
  useLayoutEffect(() => {
    latest.current = { sort, dir, query };
  });
  useLayoutEffect(() => {
    scrollTo(0, loadView(viewKey)?.scrollY ?? 0);
    // Cleanup runs before the next page's layout effect, so scrollY is still this page's.
    return () => saveView(viewKey, { ...latest.current, scrollY });
  }, [viewKey]);
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
          <ViewToggle value={layout} onChange={setLayout} />
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
      ) : layout === "grid" ? (
        <FilmGrid titles={rows} entries={entries} accent={accent} onOpen={setCardFor} />
      ) : (
        rows.map((t, i) => (
          <FilmRow
            key={t.id}
            n={i + 1}
            title={t}
            dimmed={Boolean(entries[t.id]?.watched)}
            onOpen={setCardFor}
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
      <TitleCard title={cardFor} onClose={() => setCardFor(null)} onTrailer={onTrailer} onWatched={(id, w) => w && keep(id)} />
    </main>
  );
}
