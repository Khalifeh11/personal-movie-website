import { byline } from "../lib/format";
import type { Title } from "../lib/types";
import { FactsRow } from "./FactsRow";
import { Label } from "./ui/Label";

export function Hero({ title, showBlurb }: { title: Title; showBlurb: boolean }) {
  const by = byline(title);
  return (
    <section className="max-w-[900px]">
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
      {showBlurb && title.overview && (
        <p className="mt-5 max-w-[520px] text-sm leading-relaxed text-fg-2">{title.overview}</p>
      )}
    </section>
  );
}
