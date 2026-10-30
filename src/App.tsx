import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { FiltersDrawer } from "./components/FiltersDrawer";
import { Footer } from "./components/Footer";
import { HeroSection } from "./components/HeroSection";
import { BrowsePage } from "./components/BrowsePage";
import { MoodTiles } from "./components/MoodTiles";
import { Nav } from "./components/Nav";
import { TrailerOverlay } from "./components/TrailerOverlay";
import { Label } from "./components/ui/Label";
import titlesJson from "./data/titles.json";
import { scopeKey, type Scope } from "./lib/browse";
import { directorsOf } from "./lib/directors";
import { moodTiles } from "./lib/moodTiles";
import type { Title } from "./lib/types";
import { LocalStorageUserData } from "./lib/userData";
import { whyThis } from "./lib/whyThis";
import { useDeck } from "./state/useDeck";
import { useRoute } from "./state/useRoute";
import { routeKey } from "./state/viewState";
import { UserDataContext, useUserData } from "./state/useUserData";

const titles = titlesJson as Title[];
const directors = directorsOf(titles);

export default function App() {
  const store = useMemo(() => new LocalStorageUserData(localStorage), []);
  return (
    <UserDataContext.Provider value={store}>
      <Site />
    </UserDataContext.Provider>
  );
}

function Site() {
  const { store, entries } = useUserData();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);
  const [trailerFor, setTrailerFor] = useState<Title | null>(null);
  const closeTrailer = useCallback(() => setTrailerFor(null), []);
  // The deck lives for the whole session so the hero keeps its place across routes.
  const { state, current, count, dispatch, setFilters } = useDeck(titles, entries);
  const { route, navigate } = useRoute(state.filters, directors);
  // A route change (incl. browser Back) closes the trailer rather than playing it over another page.
  const [trailerRoute, setTrailerRoute] = useState(route);
  if (trailerRoute !== route) {
    setTrailerRoute(route);
    setTrailerFor(null);
  }
  // Home always starts at the top; browse pages restore their own scroll (see BrowsePage).
  useLayoutEffect(() => {
    if (route.name === "home") scrollTo(0, 0);
  }, [route]);
  const tiles = useMemo(() => moodTiles(state.deck, titles), [state.deck]);
  // Fixed for the session: "today" only gates multi-year thresholds.
  const [today] = useState(() => new Date());
  const why = current ? whyThis(current, { titles, deck: state.deck, today }) : null;
  const scope: Scope | null =
    route.name === "mood" ? { kind: "mood", mood: route.mood } : route.name === "director" ? { kind: "director", name: route.director } : null;

  return (
    <div className="min-h-dvh bg-bg font-ui text-fg">
      <Nav route={route} onNavigate={navigate} onOpenFilters={() => setFiltersOpen(true)} />
      {route.name === "home" && (
        <>
          <HeroSection state={state} current={current} why={why} count={count} dispatch={dispatch}
            active={!trailerFor && !filtersOpen}
            onTrailer={setTrailerFor}
          />
          <section id="moods" className="scroll-mt-20 px-5 py-16 md:px-11 md:py-24">
            <Label as="div" muted className="mb-6 tracking-wide">How do you want to feel?</Label>
            <MoodTiles tiles={tiles} onOpen={(mood) => navigate({ name: "mood", mood })} />
          </section>
          <Footer />
        </>
      )}
      {scope && (
        <BrowsePage
          key={scopeKey(scope)}
          scope={scope}
          viewKey={routeKey(route)}
          titles={titles}
          filters={state.filters}
          onFilters={setFilters}
          onTrailer={setTrailerFor}
        />
      )}
      <TrailerOverlay title={trailerFor} onClose={closeTrailer} />
      <FiltersDrawer
        open={filtersOpen}
        onClose={closeFilters}
        filters={state.filters}
        onChange={setFilters}
        matchCount={state.deck.length}
        store={store}
      />
    </div>
  );
}
