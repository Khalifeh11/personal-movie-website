import { countLabel, type Tile } from "../lib/moodTiles";
import type { MoodFilter } from "../lib/types";
import { Label } from "./ui/Label";

export function MoodTiles({ tiles, onOpen }: { tiles: Tile[]; onOpen: (mood: MoodFilter) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {tiles.map((t) => (
        <button
          key={t.slug}
          type="button"
          aria-label={`${t.label}, ${countLabel(t.count)}`}
          onClick={() => onOpen(t.slug)}
          className={`group relative flex h-36 overflow-hidden rounded-sm bg-white/5 text-left md:h-48 ${t.count === 0 ? "opacity-40" : ""}`}
        >
          {t.posters.map((src, i) =>
            src ? (
              <img
                key={i}
                src={src}
                alt=""
                loading="lazy"
                className="h-full w-1/4 object-cover brightness-50 transition-[filter] duration-(--duration-title) group-hover:brightness-75"
              />
            ) : (
              <div key={i} className="h-full w-1/4 bg-white/5" />
            ),
          )}
          <span className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent to-60%" />
          <span className="absolute bottom-3 left-3 font-display text-xl uppercase leading-none md:bottom-4 md:left-4 md:text-3xl">
            {t.label}
          </span>
          <Label className="absolute bottom-3 right-3 text-[10px] md:bottom-4 md:right-4">{countLabel(t.count)}</Label>
        </button>
      ))}
    </div>
  );
}
