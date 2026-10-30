import type { ReactNode } from "react";
import { formatRuntime } from "../lib/filters";
import { feelsLine, genreLine, ratingText } from "../lib/format";
import type { Title } from "../lib/types";

interface FilmRowProps {
  n: number;
  title: Title;
  dimmed: boolean;
  actions: ReactNode;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function FilmRow({ n, title: t, dimmed, actions }: FilmRowProps) {
  const facts = [t.year, t.directors.join(" & ") || null, formatRuntime(t), `IMDb ${ratingText(t)}`].filter(Boolean);
  return (
    <article
      data-dimmed={dimmed}
      className={`flex gap-3 border-b border-white/10 py-5 transition-opacity md:gap-5 md:py-6 ${dimmed ? "opacity-45" : ""}`}
    >
      <span className="w-7 flex-none font-display text-xl leading-none text-fg-3 md:w-10 md:text-3xl">{pad(n)}</span>
      {t.poster ? (
        <img src={t.poster} alt="" loading="lazy" className="h-[72px] w-12 flex-none rounded-sm object-cover md:h-[93px] md:w-[62px]" />
      ) : (
        <div className="h-[72px] w-12 flex-none rounded-sm bg-white/5 md:h-[93px] md:w-[62px]" />
      )}
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className="font-display text-xl uppercase leading-none md:text-2xl">{t.title}</h2>
        <p className="text-xs text-fg-2">{facts.join(" · ")}</p>
        <p className="text-xs text-fg-3">
          {genreLine(t)}
          {t.moods.length > 0 && ` · Feels: ${feelsLine(t)}`}
        </p>
        {t.overview && <p className="line-clamp-2 max-w-[640px] text-[13px] leading-relaxed text-fg-2 md:line-clamp-none">{t.overview}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">{actions}</div>
      </div>
    </article>
  );
}
