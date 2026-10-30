import { useEffect, useRef, useState } from "react";
import { BUCKETS } from "../lib/moods";
import type { Route } from "../lib/route";
import type { MoodFilter } from "../lib/types";

interface NavProps {
  route: Route;
  onNavigate: (r: Route) => void;
  onOpenFilters: () => void;
}

const MOODS: { slug: MoodFilter; label: string }[] = [...BUCKETS, { slug: "all", label: "All titles" }];

const item = "font-ui text-[11px] uppercase tracking-ui text-fg-2 transition-colors hover:text-fg";

function useScrolled(threshold = 40) {
  const [scrolled, setScrolled] = useState(() => scrollY >= threshold);
  useEffect(() => {
    const onScroll = () => setScrolled(scrollY >= threshold);
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

export function Nav({ route, onNavigate, onOpenFilters }: NavProps) {
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moodsOpen, setMoodsOpen] = useState(false);
  const moodsRef = useRef<HTMLDivElement>(null);
  const onHome = route.name === "home";
  const solid = scrolled || !onHome || menuOpen;

  // Dropdown closes on Esc or a click anywhere outside it.
  useEffect(() => {
    if (!moodsOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoodsOpen(false);
    const onDown = (e: PointerEvent) => !moodsRef.current?.contains(e.target as Node) && setMoodsOpen(false);
    addEventListener("keydown", onKey);
    addEventListener("pointerdown", onDown);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("pointerdown", onDown);
    };
  }, [moodsOpen]);

  const onMoods = () => {
    if (!onHome) return setMoodsOpen(!moodsOpen);
    setMenuOpen(false);
    document.getElementById("moods")?.scrollIntoView({ behavior: "smooth" });
  };
  const goMood = (mood: MoodFilter) => {
    setMoodsOpen(false);
    setMenuOpen(false);
    onNavigate({ name: "mood", mood });
  };
  const moodList = (
    <div role="menu" aria-label="Moods" className="flex flex-col items-start gap-3">
      {MOODS.map((m) => (
        <button
          key={m.slug}
          type="button"
          role="menuitem"
          onClick={() => goMood(m.slug)}
          className={`${item} ${route.name === "mood" && route.mood === m.slug ? "text-fg" : ""}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
  const onFilters = () => {
    setMenuOpen(false);
    onOpenFilters();
  };

  const filtersButton = <button type="button" onClick={onFilters} className={item}>Filters</button>;

  return (
    <nav
      aria-label="Site"
      data-solid={solid}
      className={`fixed inset-x-0 top-0 z-(--z-nav) border-b transition-colors duration-(--duration-title) ${
        solid ? "border-white/10 bg-bg/90 backdrop-blur-md" : "border-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-5 py-4 md:px-11 md:py-5">
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            setMenuOpen(false);
            onNavigate({ name: "home" });
          }}
          className="font-display text-xl uppercase leading-none tracking-[0.04em] text-fg"
        >
          Not Tonight
        </a>
        <div className="hidden items-center gap-8 md:flex">
          <div ref={moodsRef} className="relative">
            <button type="button" onClick={onMoods} aria-expanded={onHome ? undefined : moodsOpen} className={item}>
              Moods
            </button>
            {moodsOpen && (
              <div className="absolute right-0 top-full mt-4 min-w-44 border border-white/10 bg-bg/95 px-5 py-4 backdrop-blur-md">
                {moodList}
              </div>
            )}
          </div>
          {filtersButton}
        </div>
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex size-9 flex-col items-center justify-center gap-[5px] md:hidden"
        >
          <span className="h-px w-5 bg-fg" />
          <span className="h-px w-5 bg-fg" />
          <span className="h-px w-5 bg-fg" />
        </button>
      </div>
      {menuOpen && (
        <div className="flex flex-col items-start gap-5 px-5 pb-6 md:hidden">
          {onHome ? <button type="button" onClick={onMoods} className={item}>Moods</button> : moodList}
          {filtersButton}
        </div>
      )}
    </nav>
  );
}
