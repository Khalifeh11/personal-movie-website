import { gridCaption } from "../lib/format";
import type { Title, UserEntry } from "../lib/types";
import { PosterCell } from "./ui/PosterCell";

interface FilmGridProps {
  titles: Title[];
  entries: Record<string, UserEntry>;
  /** Hover/focus border colour: the mood's accent, white on director pages. */
  accent: string;
  onOpen: (t: Title) => void;
}

/** Poster wall: one cell per title, no title text (it's on the poster), one caption line. */
export function FilmGrid({ titles, entries, accent, onOpen }: FilmGridProps) {
  return (
    <div data-testid="grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
      {titles.map((t) => (
        <PosterCell
          key={t.id}
          title={t}
          dimmed={Boolean(entries[t.id]?.watched)}
          accent={accent}
          onOpen={onOpen}
          caption={<span className="mt-2 block text-[13px] text-fg-3">{gridCaption(t)}</span>}
        />
      ))}
    </div>
  );
}
