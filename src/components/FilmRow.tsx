import { Fragment, type ReactNode } from "react";
import { formatRuntime } from "../lib/filters";
import { feelsLine, genreLine, ratingText } from "../lib/format";
import type { Title } from "../lib/types";
import { DirectorLink } from "./ui/DirectorLink";
import { FadeImg } from "./ui/FadeImg";

interface FilmRowProps {
  n: number;
  title: Title;
  dimmed: boolean;
  actions: ReactNode;
  /** Poster or title clicked: open the title card. */
  onOpen: (t: Title) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");
const poster = "h-24 w-16 flex-none rounded-sm bg-white/5 md:h-[135px] md:w-[90px]";

/** year · director links · runtime · IMDb, each part optional, separated by " · ". */
export function Facts({ title: t, className = "" }: { title: Title; className?: string }) {
  const parts: ReactNode[] = [];
  if (t.year) parts.push(t.year);
  if (t.directors.length) {
    parts.push(
      t.directors.map((d, i) => (
        <Fragment key={d}>
          {i > 0 && " & "}
          <DirectorLink name={d} />
        </Fragment>
      )),
    );
  }
  parts.push(formatRuntime(t), `IMDb ${ratingText(t)}`);
  return (
    <p className={className}>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && " · "}
          {p}
        </Fragment>
      ))}
    </p>
  );
}

export function FilmRow({ n, title: t, dimmed, actions, onOpen }: FilmRowProps) {
  const open = `Open ${t.title}`;
  return (
    <article
      data-dimmed={dimmed}
      className={`flex gap-4 border-b border-white/10 py-7 transition-opacity md:gap-6 md:py-8 ${dimmed ? "opacity-45" : ""}`}
    >
      <span className="w-8 flex-none font-display text-2xl leading-none text-fg-3 md:w-12 md:text-4xl">{pad(n)}</span>
      <button type="button" aria-label={open} onClick={() => onOpen(t)} className={`${poster} overflow-hidden text-left`}>
        {t.poster && <FadeImg src={t.poster} alt="" loading="lazy" className="h-full w-full object-cover transition-opacity duration-300" />}
      </button>
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="font-display text-2xl uppercase leading-none md:text-[32px]">
          <button type="button" aria-label={open} onClick={() => onOpen(t)} className="text-left transition-colors hover:text-fg-2">
            {t.title}
          </button>
        </h2>
        <Facts title={t} className="text-sm text-fg-2 md:text-[15px]" />
        <p className="text-[13px] text-fg-3 md:text-sm">
          {genreLine(t)}
          {t.moods.length > 0 && ` · Feels: ${feelsLine(t)}`}
        </p>
        {t.overview && <p className="line-clamp-3 max-w-[640px] text-[15px] leading-relaxed text-fg-2 md:line-clamp-none md:text-base">{t.overview}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">{actions}</div>
      </div>
    </article>
  );
}
