import { useCallback, useEffect, useState } from "react";
import { parseRoute, serializeRoute, type Route } from "../lib/route";
import type { Filters } from "../lib/types";

/** The hash route. Unknown routes are replaced by home; filters are mirrored into the URL. */
export function useRoute(filters: Filters): { route: Route; navigate: (r: Route) => void } {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash).route);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(location.hash).route);
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
