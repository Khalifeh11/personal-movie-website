import { NavTab } from "./ui/NavTab";

export type Tab = "film" | "trailer" | "browse" | "shuffle";

interface BottomNavProps {
  active: Tab | null;
  hasTrailer: boolean;
  imdbUrl: string | undefined;
  onSelect: (t: Tab) => void;
}

export function BottomNav({ active, hasTrailer, imdbUrl, onSelect }: BottomNavProps) {
  return (
    <nav aria-label="Film" className="flex border-t border-white/20 bg-linear-to-b from-transparent to-black/60">
      <NavTab active={active === "film"} onClick={() => onSelect("film")}>The film</NavTab>
      {hasTrailer && <NavTab active={active === "trailer"} onClick={() => onSelect("trailer")}>Trailer</NavTab>}
      <NavTab active={active === "browse"} onClick={() => onSelect("browse")}>Browse<span className="hidden md:inline"> this mood</span></NavTab>
      <NavTab onClick={() => onSelect("shuffle")}>Shuffle</NavTab>
      {imdbUrl && <NavTab href={imdbUrl}>IMDb ↗</NavTab>}
    </nav>
  );
}
