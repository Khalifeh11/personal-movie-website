import { countLabel } from "../lib/moodTiles";
import type { Shelf as ShelfData } from "../lib/shelves";
import type { Title, UserEntry } from "../lib/types";
import { Label } from "./ui/Label";
import { PosterCell } from "./ui/PosterCell";

interface ShelfProps {
  shelf: ShelfData;
  entries: Record<string, UserEntry>;
  onOpen: (t: Title) => void;
  onSeeAll: () => void;
}

/** One home shelf: heading row (title, count, See all) over a horizontal poster rail. */
export function Shelf({ shelf, entries, onOpen, onSeeAll }: ShelfProps) {
  const headingId = `shelf-${shelf.id}`;
  return (
    <section aria-labelledby={headingId} className="mb-12 last:mb-0">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id={headingId} className="font-display text-2xl uppercase leading-none md:text-3xl">
            {shelf.heading}
          </h2>
          <Label muted>· {countLabel(shelf.count)}</Label>
        </div>
        <button type="button" onClick={onSeeAll} className="shrink-0 whitespace-nowrap">
          <Label className="transition-colors hover:text-fg">See all →</Label>
        </button>
      </div>
      <div
        data-testid="rail"
        className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:-mx-11 md:px-11 [&::-webkit-scrollbar]:hidden"
      >
        {shelf.items.map((t) => (
          <PosterCell
            key={t.id}
            title={t}
            dimmed={Boolean(entries[t.id]?.watched)}
            accent="#FFFFFF"
            onOpen={onOpen}
            className="w-[110px] flex-none snap-start md:w-[118px]"
            caption={
              <>
                <span className="mt-2 block truncate text-[13px] leading-tight text-fg">{t.title}</span>
                <Label muted as="span" className="mt-0.5 block text-[10px]">{shelf.meta(t)}</Label>
              </>
            }
          />
        ))}
        {/* Trailing breathing room so the last poster isn't flush with the edge. */}
        <span aria-hidden className="w-2 flex-none md:w-6" />
      </div>
    </section>
  );
}
