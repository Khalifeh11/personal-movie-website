import { useCallback, useEffect, useRef, useState } from "react";
import { parseRoute, serializeRoute, type Route } from "../lib/route";
import type { Filters } from "../lib/types";

/** The hash route. Unknown routes are replaced by home; filters are mirrored into the URL. */
export function useRoute(
  filters: Filters,
  onFilters: (f: Partial<Filters>) => void,
): { route: Route; navigate: (r: Route) => void } {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash).route);
  const latestFilters = useRef(filters);
  useEffect(() => {
    latestFilters.current = filters;
  }, [filters]);

  useEffect(() => {
    const onHash = () => {
      const parsed = parseRoute(location.hash);
      // A pasted or edited link may carry filters; apply them so the URL rewrite below keeps them.
      const merged = { ...latestFilters.current, ...parsed.filters };
      if (Object.keys(parsed.filters).length) onFilters(parsed.filters);
      // The route may not change (e.g. home → bad link), so fix the URL here rather than in the effect below.
      if (parsed.redirect) history.replaceState(null, "", serializeRoute(parsed.route, merged));
      setRoute(parsed.route);
      scrollTo(0, 0);
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, [onFilters]);

  useEffect(() => {
    const url = serializeRoute(route, filters);
    if (location.hash !== url) history.replaceState(null, "", url);
  }, [route, filters]);

  const navigate = useCallback(
    (r: Route) => {
      location.hash = serializeRoute(r, filters);
      scrollTo(0, 0); // also covers re-selecting the current route, which fires no hashchange
    },
    [filters],
  );

  return { route, navigate };
}
