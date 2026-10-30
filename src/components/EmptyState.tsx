export function EmptyState({ hint }: { hint: string }) {
  return (
    <section className="max-w-[900px]">
      <h1 className="mb-4 font-display uppercase leading-[0.9]" style={{ fontSize: "clamp(56px, 9vw, 124px)" }}>
        Nothing matches
      </h1>
      <p className="text-sm text-fg-2">{hint}</p>
    </section>
  );
}
