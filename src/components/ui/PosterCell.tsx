import type { CSSProperties, ReactNode } from "react";
import type { Title } from "../../lib/types";
import { FadeImg } from "./FadeImg";

interface PosterCellProps {
  title: Title;
  /** Watched titles sit at reduced opacity. */
  dimmed: boolean;
  /** Hover/focus border colour (CSS colour). */
  accent: string;
  /** What goes under the poster. */
  caption: ReactNode;
  onOpen: (t: Title) => void;
  className?: string;
}

const edge =
  "pointer-events-none absolute inset-0 rounded-sm border border-white/10 transition-colors " +
  "group-hover:border-[color-mix(in_srgb,var(--accent)_60%,transparent)] group-focus-visible:border-[color-mix(in_srgb,var(--accent)_60%,transparent)]";

/** A poster button: fade-in image (or a placeholder box), hover zoom, accent edge, caption below. */
export function PosterCell({ title: t, dimmed, accent, caption, onOpen, className = "" }: PosterCellProps) {
  return (
    <button
      type="button"
      aria-label={t.title}
      data-dimmed={dimmed}
      onClick={() => onOpen(t)}
      style={{ "--accent": accent } as CSSProperties}
      className={`group text-left outline-none transition-opacity focus-visible:ring-1 focus-visible:ring-fg ${dimmed ? "opacity-45" : ""} ${className}`}
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
      {caption}
    </button>
  );
}
