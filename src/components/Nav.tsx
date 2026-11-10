import { useEffect, useRef, useState } from "react";
import { MOODS as VOCAB } from "../lib/moods";
import type { Route } from "../lib/route";
import type { MoodFilter } from "../lib/types";
import { MoodDot } from "./ui/MoodDot";
import { SearchIcon } from "./ui/SearchIcon";
import { isTopOverlay, popOverlay, pushOverlay } from "./ui/overlayStack";

interface NavProps {
  route: Route;
  onNavigate: (r: Route, opts?: { replace?: boolean }) => void;
  onOpenFilters: () => void;
  onOpenSearch: () => void;
}

const MOODS: { slug: MoodFilter; label: string }[] = [...VOCAB, { slug: "all", label: "All titles" }];

const item = "font-ui text-[13px] uppercase tracking-ui transition-colors hover:text-fg";
const big = "font-display text-[40px] uppercase leading-[1.1] transition-colors";
const lit = (on: boolean) => (on ? "text-fg" : "text-fg-3");

function useScrolled(threshold = 40) {
  const [scrolled, setScrolled] = useState(() => scrollY >= threshold);
  useEffect(() => {
    const onScroll = () => setScrolled(scrollY >= threshold);
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/** One bar on every page: clear at the top, solid once scrolled. Phones get a full-screen menu behind a MENU pill. */
export function Nav({ route, onNavigate, onOpenFilters, onOpenSearch }: NavProps) {
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moodsOpen, setMoodsOpen] = useState(false);
  const moodsRef = useRef<HTMLDivElement>(null);
  // Set by the phone menu's Moods link when it leaves another page; home's tiles scroll in once mounted.
  const toTiles = useRef(false);
  const onHome = route.name === "home";

  // Any route change (link, Back) closes open menus.
  const [menusFor, setMenusFor] = useState(route);
  if (menusFor !== route) {
    setMenusFor(route);
    setMenuOpen(false);
    setMoodsOpen(false);
  }
  const solid = scrolled || menuOpen;

  useEffect(() => {
    if (!onHome || !toTiles.current) return;
    toTiles.current = false;
    document.getElementById("moods")?.scrollIntoView();
  }, [onHome]);

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

  // The phone menu is an overlay: page scroll locked, hero arrows ignored, Esc closes.
  useEffect(() => {
    if (!menuOpen) return;
    const me = Symbol("menu");
    pushOverlay(me);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && isTopOverlay(me) && setMenuOpen(false);
    addEventListener("keydown", onKey);
    return () => {
      popOverlay(me);
      removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const go = (r: Route, opts?: { replace?: boolean }) => {
    setMenuOpen(false);
    setMoodsOpen(false);
    onNavigate(r, opts);
  };
  const goTiles = () => {
    setMenuOpen(false);
    if (onHome) return document.getElementById("moods")?.scrollIntoView({ behavior: "smooth" });
    toTiles.current = true;
    onNavigate({ name: "home" });
  };
  // Already on Decades: replace, so Back still leaves it.
  const goDecades = () => go({ name: "decades", decade: null }, { replace: route.name === "decades" });
  const onFilters = () => {
    setMenuOpen(false);
    onOpenFilters();
  };
  const onSearch = () => {
    setMenuOpen(false);
    setMoodsOpen(false);
    onOpenSearch();
  };
  const moodList = (className: string) => (
    <div role="menu" aria-label="Moods" className={`flex flex-wrap gap-2 ${className}`}>
      {MOODS.map((m) => {
        const current = route.name === "mood" && route.mood === m.slug;
        return (
          <button
            key={m.slug}
            type="button"
            role="menuitem"
            aria-current={current || undefined}
            onClick={() => go({ name: "mood", mood: m.slug })}
            className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 font-ui text-[13px] transition-colors hover:border-white/40 hover:text-fg ${
              current ? "border-white/60 text-fg" : "border-white/15 text-fg-2"
            }`}
          >
            <MoodDot slug={m.slug} />
            {m.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <nav
      aria-label="Site"
      data-solid={solid}
      className={`fixed inset-x-0 top-0 z-(--z-nav) flex flex-col border-b transition-colors duration-(--duration-title) ${
        menuOpen ? "bottom-0 border-white/10 bg-bg md:bottom-auto md:bg-bg/90" : solid ? "border-white/10 bg-bg/90 backdrop-blur-md" : "border-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-5 py-3 md:px-11 md:py-5">
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            go({ name: "home" });
          }}
          className="font-display text-xl uppercase leading-none tracking-[0.04em] text-fg"
        >
          Not Tonight
        </a>
        <div className="hidden items-center gap-9 md:flex">
          <button type="button" onClick={() => go({ name: "home" })} aria-current={onHome ? "page" : undefined} className={`${item} ${lit(onHome)}`}>
            Home
          </button>
          <div ref={moodsRef} className="relative">
            <button type="button" onClick={() => setMoodsOpen(!moodsOpen)} aria-expanded={moodsOpen} className={`${item} ${lit(route.name === "mood" || moodsOpen)}`}>
              Moods
            </button>
            {moodsOpen && (
              <div className="absolute right-0 top-full mt-5 w-[420px] border border-white/10 bg-bg/95 p-5 backdrop-blur-md">
                {moodList("")}
              </div>
            )}
          </div>
          <button type="button" onClick={goDecades} aria-current={route.name === "decades" ? "page" : undefined} className={`${item} ${lit(route.name === "decades")}`}>
            Decades
          </button>
          <button type="button" onClick={onFilters} className={`${item} text-fg-3`}>Filters</button>
          <button type="button" aria-label="Search" title="Search (/)" onClick={onSearch} className={`-mx-2 flex min-h-10 min-w-10 items-center justify-center ${lit(route.name === "search")} transition-colors hover:text-fg`}>
            <SearchIcon className="size-[18px]" />
          </button>
        </div>
        <div className="-mr-2 flex items-center md:hidden">
          {!menuOpen && (
            <button type="button" aria-label="Search" onClick={onSearch} className="flex min-h-11 min-w-11 items-center justify-center text-fg-2">
              <SearchIcon className="size-5" />
            </button>
          )}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex min-h-11 items-center px-2"
          >
            <span className="rounded-full border border-white/35 px-4 py-2 font-ui text-[11px] uppercase tracking-ui text-fg">
              {menuOpen ? "Close" : "Menu"}
            </span>
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-10 pt-4 md:hidden">
          <button
            type="button"
            onClick={onSearch}
            className="mb-7 flex w-full items-center gap-3 rounded-full border border-white/20 px-[18px] py-3 text-left font-ui text-[15px] text-fg-3"
          >
            <SearchIcon className="size-4" />
            Search titles, directors, years
          </button>
          <div className="flex flex-col items-start">
            <button type="button" onClick={() => go({ name: "home" })} aria-current={onHome ? "page" : undefined} className={`${big} ${lit(onHome)}`}>Home</button>
            <button type="button" onClick={goTiles} className={`${big} ${lit(route.name === "mood")}`}>Moods</button>
            <button type="button" onClick={goDecades} aria-current={route.name === "decades" ? "page" : undefined} className={`${big} ${lit(route.name === "decades")}`}>Decades</button>
            <button type="button" onClick={onFilters} className={`${big} text-fg-3`}>Filters</button>
          </div>
          <div className="mt-8 font-ui text-[11px] uppercase tracking-ui text-fg-3">Jump to a mood</div>
          {moodList("mt-4")}
        </div>
      )}
    </nav>
  );
}
