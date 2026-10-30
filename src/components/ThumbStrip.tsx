import type { Title } from "../lib/types";
import { FadeImg } from "./ui/FadeImg";

export function ThumbStrip({ deck, index, onJump }: { deck: Title[]; index: number; onJump: (id: string) => void }) {
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
          {t.poster && <FadeImg src={t.poster} alt="" className="h-full w-full object-cover transition-opacity duration-300" />}
        </button>
      ))}
    </div>
  );
}
