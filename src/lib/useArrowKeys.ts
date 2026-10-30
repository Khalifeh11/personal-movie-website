import { useEffect, useRef } from "react";
import { anyOverlayOpen } from "../components/ui/overlayStack";

/** True when the key should be ignored: defaultPrevented, typing in an input/textarea, an overlay open, or inside a poster rail. */
export function arrowKeyBlocked(e: KeyboardEvent): boolean {
  // defaultPrevented: a focused control (e.g. the rating slider) already used the key.
  if (e.defaultPrevented) return true;
  // Duck-typed (tagName/closest) rather than instanceof, so it also runs where there is no DOM.
  const t = e.target as Partial<Element> | null;
  if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return true;
  // A title card (opened from a shelf) is modal; inside a poster rail the arrows scroll the rail.
  return anyOverlayOpen() || (typeof t?.closest === "function" && t.closest("[data-testid=rail]") !== null);
}

/** Left/Right arrows call the handlers while `active`, unless the key belongs to something else (see arrowKeyBlocked). */
export function useArrowKeys(active: boolean, onLeft: () => void, onRight: () => void): void {
  const handlers = useRef({ onLeft, onRight });
  useEffect(() => {
    handlers.current = { onLeft, onRight };
  });

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (arrowKeyBlocked(e)) return;
      if (e.key === "ArrowRight") handlers.current.onRight();
      if (e.key === "ArrowLeft") handlers.current.onLeft();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [active]);
}
