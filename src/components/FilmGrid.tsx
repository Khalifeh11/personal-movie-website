import type { CSSProperties } from "react";
import { gridCaption } from "../lib/format";
import type { Title, UserEntry } from "../lib/types";
import { FadeImg } from "./ui/FadeImg";

interface FilmGridProps {
  titles: Title[];
  entries: Record<string, UserEntry>;
  /** Hover/focus border colour: the mood's accent, white on director pages. */
  accent: string;
  onOpen: (t: Title) => void;
}

const edge =
  "pointer-events-none absolute inset-0 rounded-sm border border-white/10 transition-colors " +
  "group-hover:border-[color-mix(in_srgb,var(--accent)_60%,transparent)] group-focus-visible:border-[color-mix(in_srgb,var(--accent)_60%,transparent)]";

/** Poster wall: one cell per title, no title text (it's on the poster), one caption line. */
export function FilmGrid({ titles, entries, accent, onOpen }: FilmGridProps) {
  return (
    <div data-testid="grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
      {titles.map((t) => {
        const dimmed = Boolean(entries[t.id]?.watched);
        return (
          <button
            key={t.id}
            type="button"
            aria-label={t.title}
            data-dimmed={dimmed}
            onClick={() => onOpen(t)}
            style={{ "--accent": accent } as CSSProperties}
            className={`group text-left outline-none transition-opacity focus-visible:ring-1 focus-visible:ring-fg ${dimmed ? "opacity-45" : ""}`}
          >
            <span className="relative block aspect-[2/3] w-full overflow-hidden rounded-sm bg-white/5">
              {t.poster && (
                <FadeImg
                  src={t.poster}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-[opacity,scale] duration-300 motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105"
                />
              )}
              <span className={edge} />
            </span>
            <span className="mt-2 block text-[13px] text-fg-3">{gridCaption(t)}</span>
          </button>
        );
      })}
    </div>
  );
}
