import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { useUserData } from "../state/useUserData";
import { Pill } from "./ui/Pill";

const NOTE_MAX = 500;

/** Watched toggle, your rating (½–5 stars) and a note, read from and written to the user-data store. */
export function UserControls({ id, onWatched }: { id: string; onWatched?: (watched: boolean) => void }) {
  const { store, entries } = useUserData();
  const entry = entries[id] ?? store.get(id);
  const [noteOpen, setNoteOpen] = useState(false);

  const toggleWatched = () => {
    const watched = !entry.watched;
    onWatched?.(watched);
    void store.set(id, { watched });
  };

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <Pill active={entry.watched} onClick={toggleWatched}>{entry.watched ? "✓ Watched" : "Watched"}</Pill>
      <StarRating value={entry.rating} onChange={(rating) => void store.set(id, { rating })} />
      <Pill active={noteOpen} onClick={() => setNoteOpen(!noteOpen)}>{entry.note ? "Note •" : "Note"}</Pill>
      {noteOpen && (
        <textarea
          aria-label="Note"
          autoFocus
          maxLength={NOTE_MAX}
          defaultValue={entry.note}
          onBlur={(e) => {
            void store.set(id, { note: e.target.value });
            setNoteOpen(false);
          }}
          onKeyDown={(e) => e.key === "Escape" && e.currentTarget.blur()}
          className="absolute left-0 top-full z-(--z-ui) mt-2 h-28 w-72 max-w-[80vw] rounded-sm border border-white/20 bg-bg/95 p-3 font-ui text-sm text-fg outline-none focus:border-fg"
        />
      )}
    </div>
  );
}

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const set = (v: number) => onChange(v === value ? null : v);
  const onClick = (star: number) => (e: MouseEvent<HTMLSpanElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    set(e.clientX - box.left < box.width / 2 ? star - 0.5 : star);
  };
  const onKey = (e: KeyboardEvent) => {
    const v = value ?? 0;
    if (e.key === "ArrowRight") onChange(Math.min(5, v + 0.5));
    else if (e.key === "ArrowLeft") onChange(v <= 0.5 ? null : v - 0.5);
    else return;
    e.preventDefault();
  };
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Your rating"
      aria-valuemin={0.5}
      aria-valuemax={5}
      aria-valuenow={value ?? undefined}
      aria-valuetext={value == null ? "Not rated" : `${value} of 5`}
      onKeyDown={onKey}
      className="flex cursor-pointer px-1 text-lg leading-none outline-none focus-visible:ring-1 focus-visible:ring-fg"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, (value ?? 0) - (star - 1)));
        return (
          <span key={star} onClick={onClick(star)} className="relative text-white/25">
            ★
            <span className="absolute inset-0 overflow-hidden text-fg" style={{ width: `${fill * 100}%` }}>★</span>
          </span>
        );
      })}
    </div>
  );
}
