import { useCallback, useEffect, useRef, useState } from "react";
import { parseRoute, serializeRoute, type Route } from "../lib/route";
import type { Filters } from "../lib/types";

/** The hash route. Unknown routes are replaced by home; filters are mirrored into the URL. */
export function useRoute(filters: Filters): { route: Route; navigate: (r: Route) => void } {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash).route);
  const latestFilters = useRef(filters);
  useEffect(() => {
    latestFilters.current = filters;
  }, [filters]);

  useEffect(() => {
    const onHash = () => {
      const parsed = parseRoute(location.hash);
      // The route may not change (e.g. home → bad link), so fix the URL here rather than in the effect below.
      if (parsed.redirect) history.replaceState(null, "", serializeRoute(parsed.route, latestFilters.current));
      setRoute(parsed.route);
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
      scrollTo(0, 0);
    },
    [filters],
  );

  return { route, navigate };
}
