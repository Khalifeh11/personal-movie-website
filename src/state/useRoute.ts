import { useCallback, useEffect, useRef, useState } from "react";
import { parseRoute, serializeRoute, type Route } from "../lib/route";
import type { Filters } from "../lib/types";
import { freshNavigate, routeKey } from "./viewState";

/** The hash route. Unknown routes are replaced by home; filters are mirrored into the URL (read from it only on load). */
export function useRoute(filters: Filters, directors: readonly string[]): { route: Route; navigate: (r: Route) => void } {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash, directors).route);
  const latestFilters = useRef(filters);
  useEffect(() => {
    latestFilters.current = filters;
  }, [filters]);

  useEffect(() => {
    // Pages restore their own scroll on Back/Forward; the browser's restoration would fight that.
    history.scrollRestoration = "manual";
    const onHash = () => {
      const parsed = parseRoute(location.hash, directors);
      // Filters are global: Back/forward only change the page, so re-mirror the current filters
      // over whatever the history entry had. Done here because the route may not change
      // (e.g. home → bad link), in which case the effect below wouldn't run.
      const url = serializeRoute(parsed.route, latestFilters.current);
      if (location.hash !== url) history.replaceState(null, "", url);
      setRoute(parsed.route);
    };
    addEventListener("hashchange", onHash);
    onHash(); // the hash may have changed (e.g. Back right after a reload) before this listener existed
    return () => removeEventListener("hashchange", onHash);
  }, [directors]);

  useEffect(() => {
    // The hash may already point at another page (Back before our listener ran): leave it for onHash.
    if (routeKey(parseRoute(location.hash, directors).route) !== routeKey(route)) return;
    const url = serializeRoute(route, filters);
    if (location.hash !== url) history.replaceState(null, "", url);
  }, [route, filters, directors]);

  const navigate = useCallback((r: Route) => freshNavigate(serializeRoute(r, filters)), [filters]);

  return { route, navigate };
}
