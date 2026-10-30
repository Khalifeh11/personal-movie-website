import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { SORTS, type SortKey } from "../lib/browse";

interface SortMenuProps {
  value: SortKey;
  onChange: (key: SortKey) => void;
  className: string;
}

const label = (key: SortKey) => SORTS.find((s) => s.key === key)!.label;

export function SortMenu({ value, onChange, className }: SortMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);

  // Closes on Esc or a click anywhere outside; opening focuses the current option.
  useEffect(() => {
    if (!open) return;
    options.current[SORTS.findIndex((s) => s.key === value)]?.focus();
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    addEventListener("pointerdown", onDown);
    return () => removeEventListener("pointerdown", onDown);
  }, [open, value]);

  const close = () => {
    setOpen(false);
    ref.current?.querySelector<HTMLButtonElement>("[aria-haspopup]")?.focus();
  };
  const pick = (key: SortKey) => {
    onChange(key);
    close();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") return close();
    const i = options.current.indexOf(document.activeElement as HTMLButtonElement);
    const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    options.current[(i + step + SORTS.length) % SORTS.length]?.focus();
  };

  return (
    <div ref={ref} className="relative" onKeyDown={open ? onKey : undefined}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sort: ${label(value)}`}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => !open && (e.key === "ArrowDown" || e.key === "ArrowUp") && (e.preventDefault(), setOpen(true))}
        className={`${className} flex items-center gap-2.5 hover:border-fg hover:text-fg ${open ? "border-fg text-fg" : ""}`}
      >
        <span className="text-fg-3">Sort</span>
        {label(value)}
        <svg aria-hidden viewBox="0 0 10 6" className={`w-2.5 text-fg-3 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Sort"
          className="absolute left-0 top-full z-20 mt-2 flex min-w-full flex-col gap-1 border border-white/15 bg-bg p-2 shadow-2xl md:left-auto md:right-0"
        >
          {SORTS.map((s, i) => (
            <button
              key={s.key}
              ref={(el) => {
                options.current[i] = el;
              }}
              type="button"
              role="option"
              aria-selected={s.key === value}
              onClick={() => pick(s.key)}
              className={`flex items-center justify-between gap-6 whitespace-nowrap px-3 py-2 text-left font-ui text-[11px] uppercase tracking-ui outline-none transition-colors hover:text-fg focus-visible:bg-white/8 focus-visible:text-fg ${
                s.key === value ? "text-fg" : "text-fg-3"
              }`}
            >
              {s.label}
              {s.key === value && <span aria-hidden className="h-1 w-1 rounded-full bg-fg" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
