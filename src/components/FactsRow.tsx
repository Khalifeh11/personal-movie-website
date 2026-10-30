import { formatRuntime } from "../lib/filters";
import { genreLine, ratingText } from "../lib/format";
import type { Title } from "../lib/types";
import { Label } from "./ui/Label";

export function FactsRow({ title }: { title: Title }) {
  const facts = [
    ["Runtime", formatRuntime(title)],
    ["IMDb", ratingText(title)],
    ["Genre", genreLine(title)],
    ["Feels", title.mood],
  ];
  return (
    <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-4 text-[13px] text-fg-2">
      {facts.map(([k, v]) => (
        <div key={k}>
          <dt><Label muted className="text-[10px]">{k}</Label></dt>
          <dd className="mt-1">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
