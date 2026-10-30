import { useSyncExternalStore } from "react";

/** True while `query` matches; re-renders on change. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}
