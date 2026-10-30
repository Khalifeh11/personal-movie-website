import { useCallback, useEffect, useMemo, useReducer } from "react";
import { directorsOf } from "../lib/directors";
import { daySeed } from "../lib/shuffle";
import type { Filters, Title, UserEntry } from "../lib/types";
import { counterText, deckReducer, initDeck, resolveInitialFilters, type DeckAction, type DeckState } from "./deck";
import { readStored } from "./usePersistedState";

export const FILTERS_KEY = "tonight.filters.v1";

export function useDeck(titles: Title[], user: Record<string, UserEntry>) {
  const directors = useMemo(() => directorsOf(titles), [titles]);
  // The latest user entries ride along in reducer state so the reducer stays pure.
  const [state, dispatch] = useReducer(
    (s: DeckState & { user: Record<string, UserEntry> }, a: DeckAction) => {
      const nextUser = a.type === "rebuild" ? a.user : s.user;
      return { ...deckReducer(titles, nextUser, s, a), user: nextUser };
    },
    null,
    () => ({
      ...initDeck(
        titles,
        resolveInitialFilters(location.hash, readStored<Partial<Filters>>(FILTERS_KEY), directors),
        user,
        daySeed(),
      ),
      user,
    }),
  );

  // Watched state arrives async / changes → rebuild, keeping the current film if it survives.
  useEffect(() => dispatch({ type: "rebuild", user }), [user]);

  // Persist filters; the URL is mirrored by useRoute.
  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify(state.filters));
    } catch {
      /* ignore */
    }
  }, [state.filters]);

  const setFilters = useCallback((filters: Partial<Filters>) => dispatch({ type: "setFilters", filters }), []);

  return {
    state,
    current: state.deck[state.index] as Title | undefined,
    count: counterText(state),
    dispatch,
    setFilters,
  };
}
