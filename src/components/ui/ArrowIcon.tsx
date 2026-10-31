/** One drawn arrow, mirrored for "left", so both directions are the same size (the ← → glyphs aren't). */
export function ArrowIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={`size-[1em] ${dir === "left" ? "-scale-x-100" : ""}`}>
      <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
