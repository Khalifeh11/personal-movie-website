import { useEffect, useState } from "react";
import type { Route } from "../lib/route";

interface NavProps {
  route: Route;
  onNavigate: (r: Route) => void;
  onOpenFilters: () => void;
}

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
  const solid = scrolled || route.name !== "home" || menuOpen;

  const onMoods = () => {
    setMenuOpen(false);
    document.getElementById("moods")?.scrollIntoView({ behavior: "smooth" });
  };
  const onFilters = () => {
    setMenuOpen(false);
    onOpenFilters();
  };

  const items = (
    <>
      <button type="button" onClick={onMoods} className={item}>Moods</button>
      <button type="button" onClick={onFilters} className={item}>Filters</button>
    </>
  );

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
        <div className="hidden items-center gap-8 md:flex">{items}</div>
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
      {menuOpen && <div className="flex flex-col items-start gap-5 px-5 pb-6 md:hidden">{items}</div>}
    </nav>
  );
}
