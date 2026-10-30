import { useCallback, useMemo, useState } from "react";
import { FiltersDrawer } from "./components/FiltersDrawer";
import { Footer } from "./components/Footer";
import { HeroSection } from "./components/HeroSection";
import { MoodPage } from "./components/MoodPage";
import { MoodTiles } from "./components/MoodTiles";
import { Nav } from "./components/Nav";
import { TrailerOverlay } from "./components/TrailerOverlay";
import { Label } from "./components/ui/Label";
import titlesJson from "./data/titles.json";
import { moodTiles } from "./lib/moodTiles";
import type { Title } from "./lib/types";
import { LocalStorageUserData } from "./lib/userData";
import { useDeck } from "./state/useDeck";
import { useRoute } from "./state/useRoute";
import { UserDataContext, useUserData } from "./state/useUserData";

const titles = titlesJson as Title[];

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
  const { route, navigate } = useRoute(state.filters, setFilters);
  const tiles = useMemo(() => moodTiles(state.deck), [state.deck]);

  return (
    <div className="min-h-dvh bg-bg font-ui text-fg">
      <Nav route={route} onNavigate={navigate} onOpenFilters={() => setFiltersOpen(true)} />
      {route.name === "home" && (
        <>
          <HeroSection state={state} current={current} count={count} dispatch={dispatch} active onTrailer={setTrailerFor} />
          <section id="moods" className="scroll-mt-20 px-5 py-16 md:px-11 md:py-24">
            <Label as="div" muted className="mb-6 tracking-wide">How do you want to feel?</Label>
            <MoodTiles tiles={tiles} onOpen={(mood) => navigate({ name: "mood", mood })} />
          </section>
          <Footer />
        </>
      )}
      {route.name === "mood" && (
        <MoodPage
          key={route.mood}
          mood={route.mood}
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
