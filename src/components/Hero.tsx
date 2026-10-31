import { Fragment } from "react";
import { byline } from "../lib/format";
import { moodAccent } from "../lib/moods";
import type { Title } from "../lib/types";
import { FactsRow } from "./FactsRow";
import { DirectorLink } from "./ui/DirectorLink";
import { Label } from "./ui/Label";
import { UserControls } from "./UserControls";

const heroAction =
  "rounded-full border border-white/25 px-3.5 py-2 font-ui text-[11px] uppercase tracking-ui text-fg-2 transition-colors hover:border-(--tint) hover:text-fg";

interface HeroProps {
  title: Title;
  /** The data-built reason for tonight's pick (`whyThis`); null hides the line. */
  why: string | null;
  onTrailer: () => void;
  onWatched: (watched: boolean) => void;
}

/** Year, title, byline. On phones this sits over the still; on desktop it tops the full hero. */
export function HeroTitle({ title }: { title: Title }) {
  const by = byline(title);
  return (
    <div key={title.id} className="animate-rise">
      {title.year && <div className="mb-2 text-xl tracking-[0.12em] text-fg-2">{title.year}</div>}
      <h1
        className="mb-4 font-display uppercase leading-[0.9] text-fg [text-shadow:0_10px_50px_rgb(0_0_0/0.7)]"
        style={{ fontSize: "clamp(56px, 9vw, 124px)" }}
      >
        {title.title}
      </h1>
      <Label as="div" className="tracking-wide">
        {by.lead}{" "}
        {title.directors.map((d, i) => (
          <Fragment key={d}>
            {i > 0 && " & "}
            <DirectorLink name={d} variant="hero" />
          </Fragment>
        ))}
      </Label>
    </div>
  );
}

interface HeroDetailsProps extends HeroProps {
  /** Phones put the facts row on the still and skip the entrance animation (it reads as the still flashing). */
  facts?: boolean;
  rise?: boolean;
}

/** Facts, actions, overview, "why this". */
export function HeroDetails({ title, why, onTrailer, onWatched, facts = true, rise = true }: HeroDetailsProps) {
  const accent = title.moods[0] ? moodAccent(title.moods[0]) : "var(--color-fg-2)";
  return (
    <div key={title.id} className={rise ? "animate-rise" : ""}>
      {facts && <FactsRow title={title} />}
      <div className={`flex flex-wrap gap-2 ${facts ? "mt-5" : ""}`}>
        {title.trailerKey && <button type="button" onClick={onTrailer} className={heroAction}>▶ Trailer</button>}
        <a href={title.imdbUrl} target="_blank" rel="noreferrer" className={heroAction}>IMDb ↗</a>
        <UserControls id={title.id} onWatched={onWatched} />
      </div>
      {title.overview && <p className="mt-5 max-w-[520px] text-sm leading-relaxed text-fg-2">{title.overview}</p>}
      {why && (
        <p data-testid="why-this" className="mt-4 max-w-[520px] text-sm italic leading-relaxed" style={{ color: accent }}>
          Why this: {why}
        </p>
      )}
    </div>
  );
}

export function Hero(props: HeroProps) {
  return (
    <section className="max-w-[900px]">
      <HeroTitle title={props.title} />
      <HeroDetails {...props} />
    </section>
  );
}
