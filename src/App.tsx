import { useCallback, useMemo, useState } from "react";
import { FiltersDrawer } from "./components/FiltersDrawer";
import { Footer } from "./components/Footer";
import { HeroSection } from "./components/HeroSection";
import { Nav } from "./components/Nav";
import { Label } from "./components/ui/Label";
import titlesJson from "./data/titles.json";
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
  // The deck lives for the whole session so the hero keeps its place across routes.
  const { state, current, count, dispatch, setFilters } = useDeck(titles, entries);
  const { route, navigate } = useRoute(state.filters);

  return (
    <div className="min-h-dvh bg-bg font-ui text-fg">
      <Nav route={route} onNavigate={navigate} onOpenFilters={() => setFiltersOpen(true)} />
      {route.name === "home" && (
        <>
          <HeroSection state={state} current={current} count={count} dispatch={dispatch} active />
          <section id="moods" className="scroll-mt-20 px-5 py-16 md:px-11 md:py-24">
            <Label as="div" muted className="mb-6 tracking-wide">How do you want to feel?</Label>
          </section>
          <Footer />
        </>
      )}
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
