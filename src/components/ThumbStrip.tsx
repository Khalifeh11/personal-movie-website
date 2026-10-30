import type { Title } from "../lib/types";

export function ThumbStrip({ deck, index, onJump }: { deck: Title[]; index: number; onJump: (id: string) => void }) {
  const count = Math.min(5, deck.length);
  const items = Array.from({ length: count }, (_, k) => deck[(index + k) % deck.length]);
  return (
    <div className="hidden gap-[7px] md:flex">
      {items.map((t, k) => (
        <button
          key={t.id}
          type="button"
          aria-label={t.title}
          onClick={() => onJump(t.id)}
          className={`h-14 w-[38px] border bg-white/10 bg-cover bg-center transition-opacity duration-200 hover:border-fg hover:opacity-100 ${
            k === 0 ? "border-fg opacity-100" : "border-white/30 opacity-55"
          }`}
          style={t.poster ? { backgroundImage: `url(${t.poster})` } : undefined}
        />
      ))}
    </div>
  );
}
