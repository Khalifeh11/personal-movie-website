import { useEffect, useMemo, useRef } from "react";
import type { Title } from "../lib/types";
import type { DeckAction, DeckState } from "../state/deck";
import { Backdrop } from "./Backdrop";
import { EmptyState } from "./EmptyState";
import { Hero } from "./Hero";
import { ThumbStrip } from "./ThumbStrip";
import { RoundButton } from "./ui/RoundButton";

const SWIPE_MIN_PX = 60;

interface HeroSectionProps {
  state: DeckState;
  current: Title | undefined;
  why: string | null;
  count: string;
  dispatch: (a: DeckAction) => void;
  /** Arrow keys flip only while this is true (home route, nothing modal open). */
  active: boolean;
  onTrailer: (t: Title) => void;
}

export function HeroSection({ state, current, why, count, dispatch, active, onTrailer }: HeroSectionProps) {
  const section = useRef<HTMLElement>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      // defaultPrevented: a focused control (e.g. the rating slider) already used the key.
      if (e.defaultPrevented || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") dispatch({ type: "next" });
      if (e.key === "ArrowLeft") dispatch({ type: "prev" });
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [active, dispatch]);

  // Swipe only on the hero itself, so the rest of the page scrolls normally.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => (touchX.current = e.touches[0].clientX);
    const onTouchEnd = (e: TouchEvent) => {
      if (touchX.current == null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      touchX.current = null;
      if (Math.abs(dx) >= SWIPE_MIN_PX) dispatch({ type: dx < 0 ? "next" : "prev" });
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [dispatch]);

  const upcoming = useMemo(
    () => (state.deck.length > 1 ? [1, 2].map((k) => state.deck[(state.index + k) % state.deck.length]) : []),
    [state.deck, state.index],
  );

  return (
    <section ref={section} aria-label="Tonight's film" className="relative min-h-dvh overflow-hidden">
      <Backdrop title={current} upcoming={upcoming} />
      <span className="pointer-events-none absolute left-[30px] top-1/2 z-(--z-ui) hidden origin-left -translate-y-1/2 -rotate-90 whitespace-nowrap font-ui text-[10px] uppercase tracking-[0.35em] text-fg-3 md:block">
        Swipe or press → for the next one
      </span>
      {state.deck.length > 0 && (
        <>
          <RoundButton label="Previous" onClick={() => dispatch({ type: "prev" })} className="absolute left-11 top-1/2 z-(--z-ui) hidden -translate-y-1/2 md:flex">←</RoundButton>
          <RoundButton label="Next" onClick={() => dispatch({ type: "next" })} className="absolute bottom-5 right-5 z-(--z-ui) md:bottom-auto md:right-11 md:top-1/2 md:-translate-y-1/2">→</RoundButton>
        </>
      )}
      <div className="absolute inset-x-5 bottom-[88px] z-(--z-ui) md:bottom-10 md:left-[84px] md:right-[300px]">
        {current ? <Hero
            title={current}
            why={why}
            onTrailer={() => onTrailer(current)}
            // Advance first so the store's rebuild keeps us on the next film instead of jumping to the start.
            onWatched={(w) => w && state.filters.hideWatched && dispatch({ type: "next" })}
          /> : <EmptyState hint="Loosen the filters." />}
      </div>
      <span
        data-testid="counter"
        className="absolute right-5 top-20 z-(--z-ui) font-counter text-2xl leading-none tracking-[0.06em] md:bottom-[120px] md:right-11 md:top-auto"
      >
        {count}
      </span>
      <div className="absolute bottom-10 right-11 z-(--z-ui)">
        <ThumbStrip deck={state.deck} index={state.index} onJump={(id) => dispatch({ type: "jump", id })} />
      </div>
    </section>
  );
}
