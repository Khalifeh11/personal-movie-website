import { buildDeck } from "../lib/filters";
import { parseHash } from "../lib/hash";
import type { Filters, Title, UserEntry } from "../lib/types";

export interface DeckState {
  filters: Filters;
  deck: Title[];
  index: number;
  seed: number;
}

export type DeckAction =
  | { type: "setFilters"; filters: Partial<Filters> }
  | { type: "next" }
  | { type: "prev" }
  | { type: "jump"; id: string }
  | { type: "shuffle" }
  | { type: "rebuild"; user: Record<string, UserEntry> };

type User = Record<string, UserEntry>;

export const DEFAULT_FILTERS: Filters = { mood: "all", type: "all", runtime: "any", hideWatched: true };

export function initDeck(titles: Title[], filters: Filters, user: User, seed: number): DeckState {
  return { filters, deck: buildDeck(titles, filters, user, seed), index: 0, seed };
}

/** Rebuild the deck, keeping the current title in view if it survives. */
function rebuild(titles: Title[], s: DeckState, filters: Filters, user: User, seed = s.seed): DeckState {
  const currentId = s.deck[s.index]?.id;
  const deck = buildDeck(titles, filters, user, seed);
  const kept = deck.findIndex((t) => t.id === currentId);
  return { filters, deck, seed, index: kept >= 0 ? kept : 0 };
}

export function deckReducer(titles: Title[], user: User, s: DeckState, a: DeckAction): DeckState {
  const n = s.deck.length;
  switch (a.type) {
    case "next":
      return n ? { ...s, index: (s.index + 1) % n } : s;
    case "prev":
      return n ? { ...s, index: (s.index - 1 + n) % n } : s;
    case "jump": {
      const i = s.deck.findIndex((t) => t.id === a.id);
      return i >= 0 ? { ...s, index: i } : s;
    }
    case "shuffle": {
      const seed = s.seed + 1;
      return { ...s, seed, deck: buildDeck(titles, s.filters, user, seed), index: 0 };
    }
    case "setFilters":
      return rebuild(titles, s, { ...s.filters, ...a.filters }, user);
    case "rebuild":
      return rebuild(titles, s, s.filters, a.user);
  }
}

export function counterText(s: DeckState): string {
  const pad = (x: number) => String(x).padStart(2, "0");
  return s.deck.length ? `${pad(s.index + 1)} / ${pad(s.deck.length)}` : "00 / 00";
}

/** URL hash wins, then what was stored last time, then defaults. Invalid values are dropped. */
export function resolveInitialFilters(hash: string, stored: Partial<Filters> | null): Filters {
  const fromStored = stored
    ? parseHash(
        "#" +
          new URLSearchParams({
            mood: String(stored.mood ?? ""),
            type: String(stored.type ?? ""),
            rt: String(stored.runtime ?? ""),
          }),
      )
    : {};
  const hideWatched =
    typeof stored?.hideWatched === "boolean" ? stored.hideWatched : DEFAULT_FILTERS.hideWatched;
  return { ...DEFAULT_FILTERS, ...fromStored, hideWatched, ...parseHash(hash) };
}
