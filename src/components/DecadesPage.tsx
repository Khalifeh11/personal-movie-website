import { useLayoutEffect, useMemo } from "react";
import { scopeKey, type Scope } from "../lib/browse";
import { busiestDecade, decadeTitles, FIRST_YEAR, nextDecade, yearCounts, type Decade } from "../lib/decades";
import { matches } from "../lib/filters";
import type { Route } from "../lib/route";
import { tintOf } from "../lib/tint";
import type { Filters, Title } from "../lib/types";
import { useArrowKeys } from "../lib/useArrowKeys";
import { useUserData } from "../state/useUserData";
import { routeKey } from "../state/viewState";
import { BrowsePage } from "./BrowsePage";
import { DecadeBand } from "./DecadeBand";

interface DecadesPageProps {
  /** null for `#/decades`: resolved to the busiest decade and rewritten into the URL. */
  decade: Decade | null;
  titles: Title[];
  filters: Filters;
  onFilters: (f: Partial<Filters>) => void;
  onTrailer: (t: Title) => void;
  navigate: (r: Route, opts?: { replace?: boolean }) => void;
  /** Page-wide arrow keys are live; false while an overlay or the filters drawer is open. */
  active: boolean;
  today: Date;
}

/** The time machine: a band (still, decade, year chart) over the decade's titles. Band = scope + filters, never search. */
export function DecadesPage({ decade, titles, filters, onFilters, onTrailer, navigate, active, today }: DecadesPageProps) {
  const { entries } = useUserData();
  const filtered = useMemo(() => titles.filter((t) => matches(t, filters, entries)), [titles, filters, entries]);
  // Every decade empty under the filters: fall back to the busiest unfiltered one (the band says "0 films").
  const resolved = decade ?? busiestDecade(filtered) ?? busiestDecade(titles) ?? FIRST_YEAR;
  const counts = useMemo(() => yearCounts(filtered, today), [filtered, today]);
  const inDecade = useMemo(() => decadeTitles(filtered, resolved), [filtered, resolved]);

  // `#/decades` → `#/decades/<d>` in place, so a reload lands on the same decade.
  useLayoutEffect(() => {
    if (decade === null) navigate({ name: "decades", decade: resolved }, { replace: true });
  }, [decade, resolved, navigate]);

  // One history entry per visit: Back leaves the page rather than stepping through decades.
  const select = (d: Decade) => navigate({ name: "decades", decade: d }, { replace: true });
  const step = (dir: 1 | -1) => {
    const d = nextDecade(resolved, filtered, dir, today);
    if (d !== null) select(d);
  };
  useArrowKeys(active, () => step(-1), () => step(1));

  // Nothing until rewritten: the rewrite is a fresh navigation that clears the decade's saved view,
  // and the list's own layout effect (a child's, so it runs first) would otherwise restore it.
  if (decade === null) return null;
  const scope: Scope = { kind: "decade", decade: resolved };
  return (
    <>
      {/* Outside the keyed list so a decade change keeps the band mounted: the still crossfades,
          the glow tweens, and a drag or focus on the chart survives the list's remount. */}
      <DecadeBand
        decade={resolved}
        titles={inDecade}
        allTitles={filtered}
        counts={counts}
        tint={tintOf(inDecade[0])}
        onSelect={select}
        now={today}
      />
      <BrowsePage
        key={scopeKey(scope)}
        scope={scope}
        viewKey={routeKey({ name: "decades", decade: resolved })}
        titles={titles}
        filters={filters}
        onFilters={onFilters}
        onTrailer={onTrailer}
        headless
      />
    </>
  );
}
