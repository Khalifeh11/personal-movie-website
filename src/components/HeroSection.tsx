import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { tintOf } from "../lib/tint";
import type { Title } from "../lib/types";
import { useArrowKeys } from "../lib/useArrowKeys";
import { useMediaQuery } from "../lib/useMediaQuery";
import type { DeckAction, DeckState } from "../state/deck";
import { Backdrop } from "./Backdrop";
import { EmptyState } from "./EmptyState";
import { FactsRow } from "./FactsRow";
import { Hero, HeroDetails, HeroTitle } from "./Hero";
import { ThumbStrip } from "./ThumbStrip";
import { ArrowIcon } from "./ui/ArrowIcon";
import { RoundButton } from "./ui/RoundButton";

const SWIPE_MIN_PX = 60;
/** Phones: quiet arrows on the still; the swipe is the main gesture, these just hint at it. */
const ghostArrow = "size-9! border-white/20 text-base text-fg-2";

interface HeroSectionProps {
  state: DeckState;
  current: Title | undefined;
  why: string | null;
  dispatch: (a: DeckAction) => void;
  /** Arrow keys flip only while this is true (home route, nothing modal open). */
  active: boolean;
  onTrailer: (t: Title) => void;
}

export function HeroSection({ state, current, why, dispatch, active, onTrailer }: HeroSectionProps) {
  const section = useRef<HTMLElement>(null);
  const still = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const wide = useMediaQuery("(min-width: 768px)");
  // Flips once the first still is in; the thumb strip's posters wait for it.
  const [heroReady, setHeroReady] = useState(false);

  useArrowKeys(active, () => dispatch({ type: "prev" }), () => dispatch({ type: "next" }));

  // Swipe on the hero only (desktop) or the still only (phones), so the rest of the page scrolls normally.
  useEffect(() => {
    const el = wide ? section.current : still.current;
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
  }, [dispatch, wide]);

  const upcoming = useMemo(
    () => (state.deck.length > 1 ? [1, 2].map((k) => state.deck[(state.index + k) % state.deck.length]) : []),
    [state.deck, state.index],
  );

  const hasDeck = state.deck.length > 0;
  const tint = { "--tint": tintOf(current) } as CSSProperties;
  // Advance first so the store's rebuild keeps us on the next film instead of jumping to the start.
  const onWatched = (w: boolean) => w && state.filters.hideWatched && dispatch({ type: "next" });

  if (!wide) {
    return (
      <section ref={section} aria-label="Tonight's film" className="relative" style={tint}>
        {/* svh, not dvh: the still must not resize when the browser bar hides on scroll. */}
        <div ref={still} data-testid="still" className="relative h-[64svh] overflow-hidden">
          <Backdrop title={current} upcoming={upcoming} />
          {current && (
            // pb-4 leaves room for the title's 12px rise-in so it isn't clipped at the still's edge.
            <div className="absolute inset-x-5 bottom-0 z-(--z-ui) pb-4">
              <HeroTitle title={current} />
              <FactsRow title={current} />
            </div>
          )}
          {hasDeck && (
            <div className="absolute bottom-3 right-5 z-(--z-ui) flex gap-1.5">
              <RoundButton label="Previous" onClick={() => dispatch({ type: "prev" })} className={ghostArrow}><ArrowIcon dir="left" /></RoundButton>
              <RoundButton label="Next" onClick={() => dispatch({ type: "next" })} className={ghostArrow}><ArrowIcon dir="right" /></RoundButton>
            </div>
          )}
        </div>
        <div className="px-5 pb-10 pt-6">
          {current ? (
            <HeroDetails title={current} why={why} onTrailer={() => onTrailer(current)} onWatched={onWatched} facts={false} rise={false} />
          ) : (
            <EmptyState hint="Loosen the filters." />
          )}
        </div>
      </section>
    );
  }

  return (
    <section ref={section} aria-label="Tonight's film" className="relative min-h-dvh overflow-hidden" style={tint}>
      <Backdrop title={current} upcoming={upcoming} onStillLoaded={() => setHeroReady(true)} />
      <span className="pointer-events-none absolute left-[30px] top-1/2 z-(--z-ui) origin-left -translate-y-1/2 -rotate-90 whitespace-nowrap font-ui text-[10px] uppercase tracking-[0.35em] text-fg-3">
        Swipe or press → for the next one
      </span>
      {hasDeck && (
        <>
          <RoundButton label="Previous" onClick={() => dispatch({ type: "prev" })} className="absolute left-11 top-1/2 z-(--z-ui) -translate-y-1/2"><ArrowIcon dir="left" /></RoundButton>
          <RoundButton label="Next" onClick={() => dispatch({ type: "next" })} className="absolute right-11 top-1/2 z-(--z-ui) -translate-y-1/2"><ArrowIcon dir="right" /></RoundButton>
        </>
      )}
      <div className="absolute bottom-10 left-[84px] right-[300px] z-(--z-ui)">
        {current ? (
          <Hero title={current} why={why} onTrailer={() => onTrailer(current)} onWatched={onWatched} />
        ) : (
          <EmptyState hint="Loosen the filters." />
        )}
      </div>
      <div className="absolute bottom-10 right-11 z-(--z-ui)">
        <ThumbStrip deck={state.deck} index={state.index} ready={heroReady} onJump={(id) => dispatch({ type: "jump", id })} />
      </div>
    </section>
  );
}
