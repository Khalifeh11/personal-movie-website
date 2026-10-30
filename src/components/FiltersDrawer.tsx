import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Filters, RuntimeBand, TypeFilter } from "../lib/types";
import type { UserDataStore } from "../lib/userData";
import { Label } from "./ui/Label";
import { Pill } from "./ui/Pill";

interface FiltersDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
  matchCount: number;
  store: UserDataStore;
}

const TYPES: [TypeFilter, string][] = [["all", "All"], ["Movie", "Movies"], ["Series", "Series"]];
const RUNTIMES: [RuntimeBand, string][] = [["any", "Any"], ["short", "Under 100 min"], ["mid", "100 – 140"], ["long", "140+"]];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7 first:mt-0">
      <Label as="div" muted className="mb-3 text-[10px] tracking-wide">{title}</Label>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

export function FiltersDrawer({ open, onClose, filters, onChange, matchCount, store }: FiltersDrawerProps) {
  const [message, setMessage] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const exportData = () => {
    const url = URL.createObjectURL(new Blob([store.exportJson()], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "tonight-user-data.json" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File | undefined) => {
    if (!file) return;
    try {
      await store.importJson(await file.text());
      setMessage("Imported.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import failed");
    }
  };

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label="Filters"
      aria-modal="true"
      tabIndex={-1}
      className={`fixed inset-y-0 right-0 z-(--z-drawer) w-[300px] max-w-full overflow-y-auto border-l border-white/10 bg-black/90 px-8 py-10 outline-none backdrop-blur-md transition-[translate,visibility] duration-(--duration-title) ${
        open ? "visible translate-x-0" : "invisible translate-x-full"
      }`}
    >
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute right-5 top-4 text-lg text-fg-3 hover:text-fg"
      >
        ✕
      </button>

      <Group title="Type">
        {TYPES.map(([v, label]) => (
          <Pill key={v} active={filters.type === v} onClick={() => onChange({ type: v })}>{label}</Pill>
        ))}
      </Group>
      <Group title="Runtime">
        {RUNTIMES.map(([v, label]) => (
          <Pill key={v} active={filters.runtime === v} onClick={() => onChange({ runtime: v })}>{label}</Pill>
        ))}
      </Group>
      <Group title="Watched">
        <Pill active={filters.hideWatched} onClick={() => onChange({ hideWatched: !filters.hideWatched })}>Hide watched</Pill>
      </Group>

      <p className="mt-7 text-xs text-fg-3">
        {matchCount} {matchCount === 1 ? "title matches" : "titles match"}
      </p>

      <Group title="Your data">
        <Pill onClick={exportData}>Export watched &amp; ratings</Pill>
        <label className="cursor-pointer rounded-full border border-white/25 px-3.5 py-2 font-ui text-xs text-fg-2 hover:text-fg">
          Import
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => {
              void importData(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </Group>
      {message && <p role="status" className="mt-3 text-xs text-fg-2">{message}</p>}
    </div>
  );
}
