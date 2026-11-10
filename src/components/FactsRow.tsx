import type { ReactNode } from "react";
import { formatRuntime } from "../lib/filters";
import { genreLine, ratingText } from "../lib/format";
import { moodLabel } from "../lib/moods";
import type { Title } from "../lib/types";
import { Label } from "./ui/Label";

export function FactsRow({ title }: { title: Title }) {
  const feels = title.moods.length > 0 && (
    <span data-testid="feels" className="flex flex-wrap gap-x-3 gap-y-1">
      {title.moods.map((m) => (
        <span key={m}>{moodLabel(m)}</span>
      ))}
    </span>
  );
  const facts: [string, ReactNode][] = [
    ["Runtime", formatRuntime(title)],
    ["IMDb", ratingText(title)],
    ["Genre", genreLine(title)],
    ["Feels", feels],
  ];
  return (
    <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-4 text-[13px] text-fg-2">
      {facts.filter(([, v]) => v).map(([k, v]) => (
        <div key={k}>
          <dt><Label muted className="text-[10px]">{k}</Label></dt>
          <dd className="mt-1">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
