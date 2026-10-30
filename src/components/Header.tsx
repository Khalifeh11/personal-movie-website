interface HeaderProps {
  onOpenFilters: () => void;
  count: string;
}

export function Header({ onOpenFilters, count }: HeaderProps) {
  return (
    <header className="flex flex-col gap-3.5 px-5 pt-[18px] md:flex-row md:items-start md:justify-end md:px-11 md:pt-7">
      <div className="flex items-center justify-between gap-7 md:justify-end">
        <button type="button" onClick={onOpenFilters} className="font-ui text-[11px] uppercase tracking-ui text-fg-2 hover:text-fg">
          Filters
        </button>
        <span data-testid="counter" className="font-counter text-2xl leading-none tracking-[0.06em]">
          {count}
        </span>
      </div>
    </header>
  );
}
