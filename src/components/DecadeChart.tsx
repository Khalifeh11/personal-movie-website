import type { KeyboardEvent, PointerEvent } from "react";
import { decadeLabel, decadeOf, decades, FIRST_YEAR, nextDecade, type Decade } from "../lib/decades";
import type { Title } from "../lib/types";

/** Which decade a pointer at fraction x∈[0,1] of the chart width points at. */
// Kept beside the chart it serves; only costs fast refresh on this file.
// oxlint-disable-next-line react/only-export-components
export function decadeAtFraction(x: number, now: Date = new Date()): Decade {
  const years = now.getFullYear() - FIRST_YEAR + 1;
  const i = Math.min(years - 1, Math.max(0, Math.floor(x * years)));
  return decadeOf(FIRST_YEAR + i);
}

interface DecadeChartProps {
  /** Titles per year (yearCounts), index 0 is FIRST_YEAR. */
  counts: number[];
  /** The filtered titles across every decade; the arrow keys skip decades with none. */
  allTitles: Title[];
  selected: Decade;
  tint: string;
  onSelect: (d: Decade) => void;
  now: Date;
}

/** One bar per year, grouped by decade; click, drag or arrow keys pick the decade. */
export function DecadeChart({ counts, allTitles, selected, tint, onSelect, now }: DecadeChartProps) {
  const all = decades(now);
  const last = all.at(-1)!;
  const max = Math.max(1, ...counts);

  const selectAt = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const d = decadeAtFraction((e.clientX - r.left) / r.width, now);
    if (d !== selected) onSelect(d);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    // Ours now: the page-wide arrow keys skip defaultPrevented events, so the decade moves once.
    e.preventDefault();
    const d = nextDecade(selected, allTitles, e.key === "ArrowRight" ? 1 : -1, now);
    if (d !== null) onSelect(d);
  };

  // Years in each decade: ten, except the current one, which stops at this year.
  const span = (d: Decade) => Math.min(10, counts.length - (d - FIRST_YEAR));

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Decade"
      aria-valuemin={FIRST_YEAR}
      aria-valuemax={last}
      aria-valuenow={selected}
      aria-valuetext={decadeLabel(selected)}
      data-testid="decade-chart"
      className="cursor-ew-resize select-none"
      style={{ touchAction: "pan-y" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        selectAt(e);
      }}
      onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && selectAt(e)}
      onKeyDown={onKeyDown}
    >
      <div className="flex h-14 items-end">
        {all.map((d) => (
          <div key={d} className="flex h-full basis-0 items-end gap-[2px] not-last:mr-2" style={{ flexGrow: span(d) }}>
            {counts.slice(d - FIRST_YEAR, d - FIRST_YEAR + span(d)).map((n, i) => (
              <div
                key={i}
                className={`min-h-[2px] flex-1 transition-colors duration-(--duration-bg) ${d === selected ? "" : "bg-white/28"}`}
                style={{ height: `${(n / max) * 100}%`, ...(d === selected && { background: tint }) }}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Same grouping as the bars so each label sits under its decade; phones show every other one. */}
      <div className="mt-2 flex font-ui text-[10px] uppercase tracking-[0.25em] text-fg-3">
        {all.map((d) => (
          <span key={d} className="basis-0 not-last:mr-2 max-md:even:invisible" style={{ flexGrow: span(d) }}>
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}
