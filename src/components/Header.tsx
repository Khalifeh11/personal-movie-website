import { BUCKETS } from "../lib/moods";
import type { MoodFilter } from "../lib/types";
import { Label } from "./ui/Label";

interface HeaderProps {
  mood: MoodFilter;
  onMood: (m: MoodFilter) => void;
  onOpenFilters: () => void;
  count: string;
}

const MOODS: { slug: MoodFilter; label: string }[] = [...BUCKETS, { slug: "all", label: "All" }];

export function Header({ mood, onMood, onOpenFilters, count }: HeaderProps) {
  return (
    <header className="flex flex-col gap-3.5 px-5 pt-[18px] md:flex-row md:items-start md:justify-between md:px-11 md:pt-7">
      <nav aria-label="Mood" className="flex flex-wrap items-baseline gap-x-3.5 gap-y-2 md:gap-x-6">
        <Label muted className="mr-1">Mood</Label>
        {MOODS.map((m) => (
          <button
            key={m.slug}
            type="button"
            aria-pressed={m.slug === mood}
            onClick={() => onMood(m.slug)}
            className={`border-b pb-1 font-ui text-[11px] uppercase tracking-ui transition-colors hover:text-fg ${
              m.slug === mood ? "border-fg text-fg" : "border-transparent text-fg-2"
            }`}
          >
            {m.label}
          </button>
        ))}
      </nav>
      <div className="flex items-center justify-between gap-7 md:justify-end">
        <button type="button" onClick={onOpenFilters} className="font-ui text-[11px] uppercase tracking-ui text-fg-2 hover:text-fg">
          Filters
        </button>
        <span data-testid="counter" className="font-counter text-2xl leading-none tracking-[0.06em]">
          {count}
        </span>
      </div>
    </header>
  );
}
