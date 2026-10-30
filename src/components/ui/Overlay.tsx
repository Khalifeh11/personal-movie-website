import { useEffect, useRef, type ReactNode } from "react";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}

/** Open overlays, bottom to top: only the topmost one answers Esc (e.g. trailer above the title card). */
const stack: symbol[] = [];
let bodyOverflow = "";

/** Page scroll is locked while any overlay is open and restored when the last one closes, whatever the order. */
function push(id: symbol) {
  if (stack.length === 0) {
    bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  stack.push(id);
}
function pop(id: symbol) {
  stack.splice(stack.indexOf(id), 1);
  if (stack.length === 0) document.body.style.overflow = bodyOverflow;
}

/** Full-screen modal: ✕, Esc or a click on the backdrop closes; focus returns to the opener; page scroll locked. */
export function Overlay({ open, onClose, label, children }: OverlayProps) {
  const panel = useRef<HTMLDivElement>(null);
  const id = useRef(Symbol("overlay"));
  // Callers pass inline closures; the effect must not re-run (and re-focus) on every parent render.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const me = id.current;
    push(me);
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && stack.at(-1) === me && close.current();
    addEventListener("keydown", onKey);
    return () => {
      pop(me);
      removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-(--z-overlay) flex items-center justify-center bg-black/90 outline-none backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-5 top-4 text-2xl text-fg-3 hover:text-fg md:right-8 md:top-6"
      >
        ✕
      </button>
      {children}
    </div>
  );
}
