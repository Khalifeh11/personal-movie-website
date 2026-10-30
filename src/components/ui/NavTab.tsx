import type { ReactNode } from "react";

interface NavTabProps {
  active?: boolean;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}

const base =
  "relative flex-1 border-r border-white/15 py-[18px] text-center font-ui text-[9px] uppercase tracking-[0.15em] transition-colors last:border-r-0 hover:text-fg md:text-[11px] md:tracking-ui";

export function NavTab({ active = false, onClick, href, children }: NavTabProps) {
  const cls = `${base} ${active ? "text-fg after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-fg" : "text-fg-2"}`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cls}>
      {children}
    </button>
  );
}
