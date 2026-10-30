import { byline } from "../lib/format";
import type { Title } from "../lib/types";
import { FactsRow } from "./FactsRow";
import { Label } from "./ui/Label";
import { UserControls } from "./UserControls";

const heroAction =
  "rounded-full border border-white/25 px-3.5 py-2 font-ui text-[11px] uppercase tracking-ui text-fg-2 transition-colors hover:border-fg hover:text-fg";

interface HeroProps {
  title: Title;
  onTrailer: () => void;
  onWatched: (watched: boolean) => void;
}

export function Hero({ title, onTrailer, onWatched }: HeroProps) {
  const by = byline(title);
  return (
    <section key={title.id} className="max-w-[900px] animate-rise">
      {title.year && <div className="mb-2 text-xl tracking-[0.12em] text-fg-2">{title.year}</div>}
      <h1
        className="mb-4 font-display uppercase leading-[0.9] text-fg [text-shadow:0_10px_50px_rgb(0_0_0/0.7)]"
        style={{ fontSize: "clamp(56px, 9vw, 124px)" }}
      >
        {title.title}
      </h1>
      <Label as="div" className="tracking-wide">
        {by.lead} {by.name && <b className="font-semibold tracking-[0.15em] text-fg">{by.name}</b>}
      </Label>
      <FactsRow title={title} />
      <div className="mt-5 flex flex-wrap gap-2">
        {title.trailerKey && <button type="button" onClick={onTrailer} className={heroAction}>▶ Trailer</button>}
        <a href={title.imdbUrl} target="_blank" rel="noreferrer" className={heroAction}>IMDb ↗</a>
        <UserControls id={title.id} onWatched={onWatched} />
      </div>
      {title.overview && (
        <p className="mt-5 line-clamp-5 max-w-[520px] text-sm leading-relaxed text-fg-2 md:line-clamp-none">{title.overview}</p>
      )}
    </section>
  );
}
