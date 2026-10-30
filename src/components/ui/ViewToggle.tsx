import type { ReactNode } from "react";
export type View = "list" | "grid";
export const VIEW_KEY = "tonight.view.v1";

const icon = "size-3.5";

/** Segmented grid | list switch. */
export function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  const seg = (v: View, label: string, glyph: ReactNode) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={value === v}
      onClick={() => onChange(v)}
      className={`px-3 py-2 transition-colors ${value === v ? "bg-fg text-bg" : "text-fg-2 hover:text-fg"}`}
    >
      {glyph}
    </button>
  );
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-white/25">
      {seg(
        "grid",
        "Grid view",
        <svg aria-hidden viewBox="0 0 14 14" className={icon} fill="currentColor">
          <rect x="0" y="0" width="6" height="6" rx="1" />
          <rect x="8" y="0" width="6" height="6" rx="1" />
          <rect x="0" y="8" width="6" height="6" rx="1" />
          <rect x="8" y="8" width="6" height="6" rx="1" />
        </svg>,
      )}
      {seg(
        "list",
        "List view",
        <svg aria-hidden viewBox="0 0 14 14" className={icon} fill="currentColor">
          <rect x="0" y="1" width="14" height="2" rx="1" />
          <rect x="0" y="6" width="14" height="2" rx="1" />
          <rect x="0" y="11" width="14" height="2" rx="1" />
        </svg>,
      )}
    </div>
  );
}
