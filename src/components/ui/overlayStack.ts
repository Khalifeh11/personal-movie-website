/** Open overlays, bottom to top: only the topmost one answers Esc (e.g. trailer above the title card). */
const stack: symbol[] = [];
let bodyOverflow = "";

/** Page scroll is locked while any overlay is open and restored when the last one closes, whatever the order. */
export function pushOverlay(id: symbol): void {
  if (stack.length === 0) {
    bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  stack.push(id);
}

export function popOverlay(id: symbol): void {
  stack.splice(stack.indexOf(id), 1);
  if (stack.length === 0) document.body.style.overflow = bodyOverflow;
}

export const isTopOverlay = (id: symbol): boolean => stack.at(-1) === id;

/** True while any overlay is open (e.g. the hero's arrow keys stay out of a title card). */
export const anyOverlayOpen = (): boolean => stack.length > 0;
