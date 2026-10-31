import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { FiltersDrawer } from "./components/FiltersDrawer";
import { HeroSection } from "./components/HeroSection";
import { HomeShelves } from "./components/HomeShelves";
import { BrowsePage } from "./components/BrowsePage";
import { DecadesPage } from "./components/DecadesPage";
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
import { loadView, routeKey, saveView } from "./state/viewState";
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
  const tiles = useMemo(() => moodTiles(state.deck, titles), [state.deck]);
  // Fixed for the session: "today" gates multi-year thresholds and the "around this day" shelf.
  const [today] = useState(() => new Date());
  const why = current ? whyThis(current, { titles, deck: state.deck, today }) : null;
  const scope: Scope | null =
    route.name === "mood"
      ? { kind: "mood", mood: route.mood }
      : route.name === "director"
        ? { kind: "director", name: route.director }
        : route.name === "shelf"
          ? { kind: "shelf", shelf: route.shelf, today }
          : null;

  return (
    <div className="min-h-dvh bg-bg font-ui text-fg">
      <Nav route={route} onNavigate={navigate} onOpenFilters={() => setFiltersOpen(true)} />
      {route.name === "home" && (
        <Home>
          <HeroSection state={state} current={current} why={why} count={count} dispatch={dispatch}
            active={!trailerFor && !filtersOpen}
            onTrailer={setTrailerFor}
          />
          <section id="moods" className="scroll-mt-20 px-5 py-16 md:px-11 md:py-24">
            <Label as="div" muted className="mb-6 tracking-wide">How do you want to feel?</Label>
            <MoodTiles tiles={tiles} onOpen={(mood) => navigate({ name: "mood", mood })} />
          </section>
          <HomeShelves deck={state.deck} current={current} today={today} onNavigate={navigate} onTrailer={setTrailerFor} />
        </Home>
      )}
      {route.name === "decades" && (
        <DecadesPage
          decade={route.decade}
          titles={titles}
          filters={state.filters}
          onFilters={setFilters}
          onTrailer={setTrailerFor}
          navigate={navigate}
          active={!trailerFor && !filtersOpen}
          today={today}
        />
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

const HOME_KEY = "/";

/** Home restores its scroll on Back/Forward only: `freshNavigate` clears the key, so a fresh visit starts at the top. */
function Home({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    scrollTo(0, loadView(HOME_KEY)?.scrollY ?? 0);
    // Cleanup runs before the next page's layout effect, so scrollY is still home's.
    return () => saveView(HOME_KEY, { scrollY });
  }, []);
  return <>{children}</>;
}
