import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Backdrop } from "./components/Backdrop";
import { BottomNav, type Tab } from "./components/BottomNav";
import { EmptyState } from "./components/EmptyState";
import { FiltersDrawer } from "./components/FiltersDrawer";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { ThumbStrip } from "./components/ThumbStrip";
import { RoundButton } from "./components/ui/RoundButton";
import titlesJson from "./data/titles.json";
import type { Title } from "./lib/types";
import { serializeRoute } from "./lib/route";
import { LocalStorageUserData } from "./lib/userData";
import { useDeck } from "./state/useDeck";
import { UserDataContext, useUserData } from "./state/useUserData";

const titles = titlesJson as Title[];
const WHEEL_DEBOUNCE_MS = 700;
const SWIPE_MIN_PX = 60;

export default function App() {
  const store = useMemo(() => new LocalStorageUserData(localStorage), []);
  return (
    <UserDataContext.Provider value={store}>
      <Deck />
    </UserDataContext.Provider>
  );
}

function Deck() {
  const { store, entries } = useUserData();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);
  const { state, current, count, dispatch, setFilters } = useDeck(titles, entries);
  const [tab, setTab] = useState<Tab>("film");
  // Temporary: keep the URL in sync until useRoute owns it.
  useEffect(() => history.replaceState(null, "", serializeRoute({ name: "home" }, state.filters)), [state.filters]);
  const next = () => dispatch({ type: "next" });
  const prev = () => dispatch({ type: "prev" });

  // Keyboard, wheel and swipe all flip the deck.
  const lastWheel = useRef(0);
  const touchX = useRef<number | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") dispatch({ type: "next" });
      if (e.key === "ArrowLeft") dispatch({ type: "prev" });
    };
    const onWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (Math.abs(e.deltaY) < 20 || now - lastWheel.current < WHEEL_DEBOUNCE_MS) return;
      lastWheel.current = now;
      dispatch({ type: e.deltaY > 0 ? "next" : "prev" });
    };
    const onTouchStart = (e: TouchEvent) => (touchX.current = e.touches[0].clientX);
    const onTouchEnd = (e: TouchEvent) => {
      if (touchX.current == null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      touchX.current = null;
      if (Math.abs(dx) >= SWIPE_MIN_PX) dispatch({ type: dx < 0 ? "next" : "prev" });
    };
    addEventListener("keydown", onKey);
    addEventListener("wheel", onWheel, { passive: true });
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchend", onTouchEnd);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("wheel", onWheel);
      removeEventListener("touchstart", onTouchStart);
      removeEventListener("touchend", onTouchEnd);
    };
  }, [dispatch]);

  const upcoming = useMemo(
    () => (state.deck.length > 1 ? [1, 2].map((k) => state.deck[(state.index + k) % state.deck.length]) : []),
    [state.deck, state.index],
  );

  const onTab = (t: Tab) => {
    if (t === "film") return setTab(tab === "film" ? ("" as Tab) : "film");
    // Trailer and Browse overlays arrive in later tasks.
    setTab(t);
  };

  return (
    <div className="h-dvh overflow-hidden bg-bg font-ui text-fg">
      <Backdrop title={current} upcoming={upcoming} />
      <div className="relative z-(--z-ui) flex h-full flex-col">
        <Header
          onOpenFilters={() => setFiltersOpen(true)}
          count={count}
        />
        <span className="pointer-events-none fixed left-[30px] top-1/2 hidden origin-left -translate-y-1/2 -rotate-90 whitespace-nowrap font-ui text-[10px] uppercase tracking-[0.35em] text-fg-3 md:block">
          Scroll, swipe, or press → for the next one
        </span>
        <main className="relative flex-1">
          {state.deck.length > 0 && (
            <>
              <RoundButton label="Previous" onClick={prev} className="absolute left-11 top-1/2 hidden -translate-y-1/2 md:flex">←</RoundButton>
              <RoundButton label="Next" onClick={next} className="absolute bottom-5 right-5 md:bottom-auto md:right-11 md:top-1/2 md:-translate-y-1/2">→</RoundButton>
            </>
          )}
          <div className="absolute inset-x-5 bottom-[88px] md:bottom-10 md:left-[84px] md:right-[300px]">
            {current ? <Hero title={current} showBlurb={tab === "film"} /> : <EmptyState />}
          </div>
          <div className="absolute bottom-10 right-11">
            <ThumbStrip deck={state.deck} index={state.index} onJump={(id) => dispatch({ type: "jump", id })} />
          </div>
        </main>
        <BottomNav
          active={tab}
          hasTrailer={Boolean(current?.trailerKey)}
          imdbUrl={current?.imdbUrl}
          onSelect={onTab}
        />
      </div>
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
