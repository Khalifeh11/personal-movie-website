import type { CSSProperties } from "react";
import { countLabel, type Tile } from "../lib/moodTiles";
import type { MoodFilter } from "../lib/types";
import { FadeImg } from "./ui/FadeImg";
import { Label } from "./ui/Label";
import { MoodDot } from "./ui/MoodDot";

const still =
  "absolute inset-0 h-full w-full object-cover brightness-60 transition-[opacity,filter,scale] duration-500 ease-in-out " +
  "group-hover:brightness-80 group-focus-visible:brightness-80 motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105";
const tint = "absolute inset-0 bg-[linear-gradient(to_top,rgb(0_0_0/0.85),color-mix(in_srgb,var(--accent)_25%,transparent)_55%,transparent)]";
const edge =
  "pointer-events-none absolute inset-0 rounded-sm border border-white/10 transition-colors " +
  "group-hover:border-[color-mix(in_srgb,var(--accent)_60%,transparent)] group-focus-visible:border-[color-mix(in_srgb,var(--accent)_60%,transparent)]";

export function MoodTiles({ tiles, onOpen }: { tiles: Tile[]; onOpen: (mood: MoodFilter) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {tiles.map((t) => (
        <button
          key={t.slug}
          type="button"
          aria-label={`${t.label}, ${countLabel(t.count)}`}
          onClick={() => onOpen(t.slug)}
          style={{ "--accent": t.accent } as CSSProperties}
          className={`group relative aspect-video overflow-hidden rounded-sm bg-bg text-left outline-none focus-visible:ring-1 focus-visible:ring-fg ${t.count === 0 ? "opacity-40" : ""}`}
        >
          {t.backdrop && <FadeImg src={t.backdrop} alt="" loading="lazy" className={still} />}
          <span className={tint} />
          <span className={edge} />
          <span className="absolute inset-x-3 bottom-3 flex flex-col gap-1.5 md:inset-x-4 md:bottom-4">
            <span className="font-display text-lg uppercase leading-none md:text-2xl lg:text-3xl">{t.label}</span>
            <span className="flex items-center gap-1.5">
              <MoodDot slug={t.slug} />
              <Label className="text-[10px]">{countLabel(t.count)}</Label>
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
