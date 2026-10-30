import type { MouseEvent } from "react";
import { slugify } from "../../lib/directors";
import { freshNavigate } from "../../state/viewState";

const variants = {
  muted: "underline decoration-white/40 underline-offset-[3px] transition-colors hover:text-fg hover:decoration-fg",
  hero: "font-semibold tracking-[0.15em] text-fg hover:underline",
};

interface DirectorLinkProps {
  name: string;
  variant?: keyof typeof variants;
  /** Runs before navigating on a plain click (e.g. close an overlay). */
  onNavigate?: () => void;
}

/**
 * A plain `<a href="#/director/<slug>">`: the hash router handles the navigation, so no prop
 * plumbing. A plain left click goes through `freshNavigate` so the target starts at defaults;
 * modified and middle clicks fall through so open-in-new-tab keeps working.
 */
export function DirectorLink({ name, variant = "muted", onNavigate }: DirectorLinkProps) {
  const href = `#/director/${slugify(name)}`;
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onNavigate?.();
    freshNavigate(href);
  };
  return (
    <a href={href} onClick={onClick} className={variants[variant]}>
      {name}
    </a>
  );
}
