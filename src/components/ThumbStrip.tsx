import type { Title } from "../lib/types";
import { FadeImg } from "./ui/FadeImg";

interface ThumbStripProps {
  deck: Title[];
  index: number;
  onJump: (id: string) => void;
  /** Posters wait for this (the hero still has loaded) so they don't compete with it on a cold load. */
  ready: boolean;
}

export function ThumbStrip({ deck, index, onJump, ready }: ThumbStripProps) {
  const count = Math.min(5, deck.length);
  const items = Array.from({ length: count }, (_, k) => deck[(index + k) % deck.length]);
  return (
    <div className="flex gap-[7px]">
      {items.map((t, k) => (
        <button
          key={t.id}
          type="button"
          aria-label={t.title}
          onClick={() => onJump(t.id)}
          className={`h-14 w-[38px] overflow-hidden border bg-white/10 transition-opacity duration-200 hover:border-fg hover:opacity-100 ${
            k === 0 ? "border-fg opacity-100" : "border-white/30 opacity-55"
          }`}
        >
          {t.poster && ready && <FadeImg src={t.poster} alt="" fetchPriority="low" className="h-full w-full object-cover transition-opacity duration-300" />}
        </button>
      ))}
    </div>
  );
}
