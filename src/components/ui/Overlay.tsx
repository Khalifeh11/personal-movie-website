import { useEffect, useRef, type ReactNode } from "react";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}

/** Open overlays, bottom to top: only the topmost one answers Esc (e.g. trailer above the title card). */
const stack: symbol[] = [];

/** Full-screen modal: ✕, Esc or a click on the backdrop closes; focus returns to the opener; page scroll locked. */
export function Overlay({ open, onClose, label, children }: OverlayProps) {
  const panel = useRef<HTMLDivElement>(null);
  const id = useRef(Symbol("overlay"));

  useEffect(() => {
    if (!open) return;
    const me = id.current;
    stack.push(me);
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && stack.at(-1) === me && onClose();
    addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      stack.splice(stack.indexOf(me), 1);
      removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [open, onClose]);

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
