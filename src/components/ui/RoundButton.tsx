import type { ReactNode } from "react";

interface RoundButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}

export function RoundButton({ label, onClick, className = "", children }: RoundButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex size-[54px] items-center justify-center rounded-full border border-white/60 text-xl text-fg transition-colors duration-200 hover:bg-fg hover:text-bg ${className}`}
    >
      {children}
    </button>
  );
}
