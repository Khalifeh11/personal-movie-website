import { beforeEach, describe, expect, it, vi } from "vitest";

const anyOverlayOpen = vi.hoisted(() => vi.fn(() => false));
vi.mock("../components/ui/overlayStack", () => ({ anyOverlayOpen }));

import { arrowKeyBlocked } from "./useArrowKeys";

/** Duck-typed stand-in: vitest runs in node, so there is no DOM to build a real event from. */
function fake(opts: { defaultPrevented?: boolean; tagName?: string; inRail?: boolean } = {}): KeyboardEvent {
  const target = opts.tagName
    ? { tagName: opts.tagName, closest: (sel: string) => (opts.inRail && sel === "[data-testid=rail]" ? {} : null) }
    : null;
  return { defaultPrevented: opts.defaultPrevented ?? false, target } as unknown as KeyboardEvent;
}

describe("arrowKeyBlocked", () => {
  beforeEach(() => anyOverlayOpen.mockReturnValue(false));

  it("blocks when defaultPrevented", () => expect(arrowKeyBlocked(fake({ defaultPrevented: true, tagName: "DIV" }))).toBe(true));
  it("blocks typing in an input", () => expect(arrowKeyBlocked(fake({ tagName: "INPUT" }))).toBe(true));
  it("blocks typing in a textarea", () => expect(arrowKeyBlocked(fake({ tagName: "TEXTAREA" }))).toBe(true));
  it("blocks while an overlay is open", () => {
    anyOverlayOpen.mockReturnValue(true);
    expect(arrowKeyBlocked(fake({ tagName: "DIV" }))).toBe(true);
  });
  it("blocks inside a poster rail", () => expect(arrowKeyBlocked(fake({ tagName: "DIV", inRail: true }))).toBe(true));
  it("passes otherwise", () => expect(arrowKeyBlocked(fake({ tagName: "DIV" }))).toBe(false));
  it("passes when the target is not an element", () => expect(arrowKeyBlocked(fake())).toBe(false));
});
