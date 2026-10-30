import type { ReactNode } from "react";

interface PillProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

export function Pill({ active = false, onClick, children }: PillProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 font-ui text-xs transition-colors hover:text-fg ${
        active ? "border-fg bg-white/8 text-fg" : "border-white/25 text-fg-2"
      }`}
    >
      {children}
    </button>
  );
}
