import type { ReactNode } from "react";

interface LabelProps {
  as?: "span" | "div";
  muted?: boolean;
  className?: string;
  children: ReactNode;
}

/** Small uppercase, tracked-out UI text — the site's default voice for chrome. */
export function Label({ as: Tag = "span", muted = false, className = "", children }: LabelProps) {
  return (
    <Tag className={`font-ui text-[11px] uppercase tracking-ui ${muted ? "text-fg-3" : "text-fg-2"} ${className}`}>
      {children}
    </Tag>
  );
}
