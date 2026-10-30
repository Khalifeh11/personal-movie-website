import { useMemo, useState } from "react";
import type { Route } from "../lib/route";
import { homeShelves } from "../lib/shelves";
import type { Title } from "../lib/types";
import { useUserData } from "../state/useUserData";
import { Shelf } from "./Shelf";
import { TitleCard } from "./TitleCard";

interface HomeShelvesProps {
  /** The filtered deck: hidden films never reach a shelf. */
  deck: Title[];
  /** Tonight's pick, for the director shelf. */
  current: Title | undefined;
  onNavigate: (r: Route) => void;
  onTrailer: (t: Title) => void;
}

/** The poster shelves below the mood tiles; owns the title card they open. */
export function HomeShelves({ deck, current, onNavigate, onTrailer }: HomeShelvesProps) {
  const { entries } = useUserData();
  const shelves = useMemo(() => homeShelves(deck, current), [deck, current]);
  const [cardFor, setCardFor] = useState<Title | null>(null);
  if (shelves.length === 0) return null;
  return (
    <section aria-label="Shelves" className="px-5 pb-16 md:px-11 md:pb-24">
      {shelves.map((s) => (
        <Shelf key={s.id} shelf={s} entries={entries} onOpen={setCardFor} onSeeAll={() => onNavigate(s.seeAll)} />
      ))}
      <TitleCard title={cardFor} onClose={() => setCardFor(null)} onTrailer={onTrailer} onWatched={() => {}} />
    </section>
  );
}
