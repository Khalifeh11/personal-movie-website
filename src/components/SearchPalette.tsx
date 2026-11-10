import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { decadeLabel } from "../lib/decades";
import type { Route } from "../lib/route";
import { decadeQuery, matchRange, moodQuery, rankTitles } from "../lib/search";
import { tintOf } from "../lib/tint";
import type { Title } from "../lib/types";
import { FadeImg } from "./ui/FadeImg";
import { MoodDot } from "./ui/MoodDot";
import { SearchIcon } from "./ui/SearchIcon";
import { isTopOverlay, popOverlay, pushOverlay } from "./ui/overlayStack";

interface SearchPaletteProps {
  open: boolean;
  onClose: () => void;
  titles: Title[];
  onNavigate: (r: Route) => void;
  onOpenTitle: (t: Title) => void;
}

/** Films shown before "See all N results" takes over. */
const CAP = 7;

type Row =
  | { kind: "go"; key: string; label: string; sub: string; mark: ReactNode; route: Route }
  | { kind: "film"; key: string; t: Title }
  | { kind: "all"; key: string; n: number; q: string };

/** The query underlined inside `text`, or `text` as is. */
function Hl({ text, q, wordStart }: { text: string; q: string; wordStart?: boolean }) {
  const r = matchRange(text, q, wordStart);
  if (!r) return <>{text}</>;
  return (
    <>
      {text.slice(0, r[0])}
      <mark className="bg-transparent text-fg underline decoration-(--tint) decoration-2 underline-offset-[3px]">{text.slice(r[0], r[1])}</mark>
      {text.slice(r[1])}
    </>
  );
}

const exactYear = (t: Title, q: string) => String(t.year) === q.trim();

/**
 * Nav search: a panel over the page (full screen on phones). Titles, directors and years match as you type;
 * a decade ("90s") or mood ("dreamy") adds a "Go to" row. ↵ on a film opens its card, the last row opens every match.
 * Stays mounted so the query survives closing; renders nothing while closed.
 */
export function SearchPalette({ open, onClose, titles, onNavigate, onOpenTitle }: SearchPaletteProps) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  const rows = useMemo<Row[]>(() => {
    if (!q.trim()) return [];
    const out: Row[] = [];
    const decade = decadeQuery(q);
    if (decade !== null)
      out.push({ kind: "go", key: `d${decade}`, label: `The ${decadeLabel(decade)}`, sub: "Decades", mark: <span aria-hidden>▤</span>, route: { name: "decades", decade } });
    for (const m of moodQuery(q))
      out.push({ kind: "go", key: `m${m.slug}`, label: m.label, sub: "Mood", mark: <MoodDot slug={m.slug} className="size-2.5" />, route: { name: "mood", mood: m.slug } });
    const films = rankTitles(titles, q);
    for (const t of films.slice(0, CAP)) out.push({ kind: "film", key: t.id, t });
    if (films.length > CAP) out.push({ kind: "all", key: "all", n: films.length, q: q.trim() });
    return out;
  }, [q, titles]);

  // A new query highlights the first row again.
  const [selFor, setSelFor] = useState(q);
  if (selFor !== q) {
    setSelFor(q);
    setSel(0);
  }
  const active = Math.min(sel, rows.length - 1);

  useEffect(() => {
    if (!open) return;
    const me = Symbol("search");
    pushOverlay(me);
    const opener = document.activeElement as HTMLElement | null;
    input.current?.focus();
    input.current?.select();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && isTopOverlay(me) && close.current();
    addEventListener("keydown", onKey);
    return () => {
      popOverlay(me);
      removeEventListener("keydown", onKey);
      // Leaving for a card or a page moves focus on; only restore it when the panel was dismissed.
      if (document.activeElement === document.body || document.activeElement === null) opener?.focus();
    };
  }, [open]);

  useEffect(() => {
    list.current?.querySelector(`[data-row="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const choose = (row: Row | undefined) => {
    if (!row) return;
    onClose();
    if (row.kind === "film") onOpenTitle(row.t);
    else if (row.kind === "go") onNavigate(row.route);
    else onNavigate({ name: "search", q: row.q });
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (rows.length) setSel((active + (e.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(rows[active]);
    }
  };

  const optId = (i: number) => `${id}-opt-${i}`;
  const rowClass = (i: number) =>
    `relative flex w-full items-center gap-3.5 rounded px-3 py-1.5 text-left ${i === active ? "bg-white/[0.07] before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded before:bg-(--tint)" : ""}`;
  const option = (row: Row, i: number, children: ReactNode, style?: CSSProperties) => (
    <button
      key={row.key}
      id={optId(i)}
      type="button"
      role="option"
      tabIndex={-1}
      aria-selected={i === active}
      data-row={i}
      onMouseMove={() => i !== active && setSel(i)}
      onClick={() => choose(row)}
      className={rowClass(i)}
      style={style}
    >
      {children}
    </button>
  );

  const gos = rows.filter((r) => r.kind === "go");
  const films = rows.filter((r) => r.kind === "film");
  const section = (label: string) => <div className="px-3 pb-1.5 pt-3 font-ui text-[10px] uppercase tracking-ui text-fg-3">{label}</div>;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-(--z-overlay) flex justify-center bg-bg md:items-start md:bg-black/75 md:px-4 md:pt-[12vh] md:backdrop-blur-sm"
    >
      <div className="flex w-full flex-col overflow-hidden bg-bg md:w-[640px] md:rounded-md md:border md:border-white/15 md:bg-[#0c0c0c] md:shadow-[0_30px_80px_-20px_#000]">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3.5 md:px-[18px] md:py-4">
          <SearchIcon className="size-[18px] flex-none text-fg-3" />
          <input
            ref={input}
            type="search"
            role="combobox"
            aria-label="Search titles"
            aria-expanded={rows.length > 0}
            aria-controls={`${id}-list`}
            aria-activedescendant={rows.length ? optId(active) : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder="Title, director, year"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            className="min-w-0 flex-1 bg-transparent text-lg text-fg outline-none placeholder:text-fg-3 [&::-webkit-search-cancel-button]:hidden"
          />
          <button type="button" onClick={onClose} className="rounded border border-white/20 px-1.5 py-0.5 font-ui text-[11px] text-fg-2 hover:text-fg">
            <span className="hidden md:inline">esc</span>
            <span className="md:hidden">Close</span>
          </button>
        </div>
        <div ref={list} id={`${id}-list`} role="listbox" aria-label="Results" className="flex-1 overflow-y-auto overscroll-contain p-1.5 md:max-h-[min(60vh,520px)] md:flex-none">
          {!q.trim() ? (
            <p className="px-3 py-6 text-sm leading-relaxed text-fg-2">Search by title, director or year. Try a surname, 1979, 90s or dreamy.</p>
          ) : rows.length === 0 ? (
            <p className="px-3 py-6 text-sm leading-relaxed text-fg-2">No titles match “{q.trim()}”. Try a director’s surname or a year.</p>
          ) : (
            <>
              {gos.length > 0 && section("Go to")}
              {gos.map((r) => {
                const i = rows.indexOf(r);
                return r.kind === "go" && option(r, i,
                  <>
                    <span className="grid size-9 flex-none place-items-center rounded-full border border-white/15 text-fg-2">{r.mark}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] text-fg">{r.label}</span>
                      <span className="block truncate text-xs text-fg-3">{r.sub}</span>
                    </span>
                    <span aria-hidden className="text-fg-3">→</span>
                  </>,
                );
              })}
              {films.length > 0 && section("Titles")}
              {films.map((r) => {
                if (r.kind !== "film") return null;
                const i = rows.indexOf(r);
                const t = r.t;
                return option(r, i,
                  <>
                    <span className="relative aspect-[2/3] w-9 flex-none overflow-hidden rounded-sm bg-white/5">
                      {t.poster && <FadeImg src={t.poster} alt="" loading="lazy" className="h-full w-full object-cover transition-opacity duration-300" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] text-fg"><Hl text={t.title} q={q} /></span>
                      <span className="block truncate text-xs text-fg-3">
                        <Hl text={t.directors.join(", ") || t.type} q={q} wordStart />
                        {t.year != null && <> · {exactYear(t, q) ? <Hl text={String(t.year)} q={q} /> : t.year}</>}
                      </span>
                    </span>
                    <span className="flex flex-none gap-1.5">
                      {t.moods.slice(0, 3).map((m) => <MoodDot key={m} slug={m} className="size-2" />)}
                    </span>
                  </>,
                  { "--tint": tintOf(t) } as CSSProperties,
                );
              })}
              {/* Pinned to the bottom of the list so it never scrolls out of reach. */}
              {rows.map((r, i) =>
                r.kind === "all" && (
                  <div key={r.key} className="sticky -bottom-1.5 -mx-1.5 -mb-1.5 mt-1 border-t border-white/10 bg-bg p-1.5 md:bg-[#0c0c0c]">
                    {option(r, i,
                      <>
                        <span className="flex-1 py-1.5 font-ui text-[13px] uppercase tracking-ui text-fg">See all {r.n} results</span>
                        <span aria-hidden className="text-fg-3">→</span>
                      </>,
                    )}
                  </div>
                ),
              )}
            </>
          )}
        </div>
        <div className="hidden flex-wrap gap-x-4 gap-y-1.5 border-t border-white/10 px-[18px] py-2.5 font-ui text-[11px] text-fg-3 md:flex">
          <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> move</span>
          <span><Kbd>↵</Kbd> open</span>
          <span><Kbd>/</Kbd> or <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd> <Kbd>K</Kbd> from any page</span>
        </div>
      </div>
    </div>
  );
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-white/20 px-1.5 py-px font-ui text-[11px] text-fg-2">{children}</kbd>;
}
