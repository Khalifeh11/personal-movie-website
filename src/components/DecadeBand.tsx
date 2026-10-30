import type { CSSProperties } from "react";
import { decadeLabel, type Decade } from "../lib/decades";
import type { Title } from "../lib/types";
import { useMediaQuery } from "../lib/useMediaQuery";
import { Backdrop } from "./Backdrop";
import { DecadeChart } from "./DecadeChart";
import { Label } from "./ui/Label";

/** Stable empty list: the band has no deck to preload. */
const NO_UPCOMING: Title[] = [];

interface DecadeBandProps {
  decade: Decade;
  /** The decade's filtered titles, year ascending; the first one is the still. */
  titles: Title[];
  /** The filtered titles across every decade, for the chart's arrow keys. */
  allTitles: Title[];
  counts: number[];
  tint: string;
  onSelect: (d: Decade) => void;
  now: Date;
}

/** The Decades page header: the decade's first still, its name and count, and the year chart that picks it. */
export function DecadeBand({ decade, titles, allTitles, counts, tint, onSelect, now }: DecadeBandProps) {
  const wide = useMediaQuery("(min-width: 768px)");
  const style = { "--tint": tint } as CSSProperties;

  const text = (
    <div key={decade} className="animate-rise">
      <h1
        className="mb-4 font-display uppercase leading-[0.9] text-fg [text-shadow:0_10px_50px_rgb(0_0_0/0.7)]"
        style={{ fontSize: "clamp(56px, 9vw, 124px)" }}
      >
        {decadeLabel(decade)}
      </h1>
      <Label as="div" className="tracking-wide">
        {titles.length === 1 ? "1 film" : `${titles.length} films`}
      </Label>
    </div>
  );
  const chart = <DecadeChart counts={counts} allTitles={allTitles} selected={decade} tint={tint} onSelect={onSelect} now={now} />;

  if (!wide) {
    return (
      <section className="relative" style={style}>
        <div className="relative h-[56svh] overflow-hidden">
          <Backdrop title={titles[0]} upcoming={NO_UPCOMING} />
          {/* pb-4 leaves room for the 12px rise-in, as on the phone hero. */}
          <div className="absolute inset-x-5 bottom-0 z-(--z-ui) pb-4">{text}</div>
        </div>
        <div className="px-5 pt-5">{chart}</div>
      </section>
    );
  }

  return (
    <section className="relative h-[60vh] min-h-[420px] overflow-hidden" style={style}>
      <Backdrop title={titles[0]} upcoming={NO_UPCOMING} />
      {/* The hero's left offset; raised clear of the chart (bottom-10 + ~80px) by a 24px gap. */}
      <div className="absolute bottom-[144px] left-[84px] z-(--z-ui)">{text}</div>
      <div className="absolute inset-x-11 bottom-10 z-(--z-ui)">{chart}</div>
    </section>
  );
}
