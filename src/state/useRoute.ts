import { useCallback, useEffect, useRef, useState } from "react";
import { parseRoute, serializeRoute, type Route } from "../lib/route";
import type { Filters } from "../lib/types";

/** The hash route. Unknown routes are replaced by home; filters are mirrored into the URL (read from it only on load). */
export function useRoute(filters: Filters): { route: Route; navigate: (r: Route) => void } {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash).route);
  const latestFilters = useRef(filters);
  useEffect(() => {
    latestFilters.current = filters;
  }, [filters]);

  useEffect(() => {
    const onHash = () => {
      const parsed = parseRoute(location.hash);
      // Filters are global: Back/forward only change the page, so re-mirror the current filters
      // over whatever the history entry had. Done here because the route may not change
      // (e.g. home → bad link), in which case the effect below wouldn't run.
      const url = serializeRoute(parsed.route, latestFilters.current);
      if (location.hash !== url) history.replaceState(null, "", url);
      setRoute(parsed.route);
      scrollTo(0, 0);
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

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
