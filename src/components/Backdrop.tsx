import { useEffect, useState } from "react";
import type { Title } from "../lib/types";
import { FadeImg } from "./ui/FadeImg";

interface Layer {
  key: string;
  src: string | null;
  srcSmall: string | null;
  blurred: boolean;
}

const SMALL_SCREEN = "(max-width: 760px)";

const toLayer =(t: Title | undefined): Layer => ({
  key: t?.id ?? "none",
  src: t?.backdrop ?? null,
  srcSmall: t?.backdropSmall ?? null,
  blurred: Boolean(t?.backdrop && t.backdrop === t.poster),
});

/**
 * Full-bleed still. The new still fades in over the previous one (kept underneath),
 * with a slow Ken-Burns zoom, then the shade and grain layers.
 * Each still blurs up: the small image shows at once, the full one fades in over it when loaded.
 */
interface BackdropProps {
  title: Title | undefined;
  upcoming: Title[];
  /** Fires once the still on screen has loaded; the hero section holds its other images until then. */
  onStillLoaded?: () => void;
}

export function Backdrop({ title, upcoming, onStillLoaded }: BackdropProps) {
  const [layers, setLayers] = useState<Layer[]>(() => [toLayer(title)]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // New title → push it on top, keep only the previous one underneath (adjust-state-on-prop-change).
  const next = toLayer(title);
  if (layers.at(-1)?.key !== next.key) setLayers([...layers.slice(-1), next]);
  const top = layers.at(-1)!;
  const topLoaded = loadedKey === top.key || !top.src;

  const markLoaded = (key: string) => {
    setLoadedKey(key);
    onStillLoaded?.();
  };

  // Warm the cache for the next couple of stills, but only once the one on screen is in: on a cold
  // load every byte of pipe belongs to the hero.
  useEffect(() => {
    if (!topLoaded) return;
    const small = matchMedia(SMALL_SCREEN).matches;
    for (const t of upcoming) {
      const srcs = small ? [t.backdropSmall ?? t.backdrop] : [t.backdropSmall, t.backdrop];
      for (const src of srcs) {
        if (!src) continue;
        const img = new Image();
        img.fetchPriority = "low";
        img.src = src;
      }
    }
  }, [upcoming, topLoaded]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-bg" aria-hidden>
      {layers.map((l, i) =>
        l.src ? (
          <div key={l.key} className={`absolute inset-0 ${i === layers.length - 1 && layers.length > 1 ? "animate-fadein" : ""}`}>
            <div className={`absolute inset-0 animate-kenburns ${l.blurred ? "scale-110 blur-xl" : ""}`}>
              {/* The still on screen outranks every tile and poster below the fold. */}
              {l.srcSmall && <img src={l.srcSmall} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full scale-105 object-cover blur-md" />}
              {/* Phones get the small still here too: it's already cached, so the top image is complete at once. */}
              <picture>
                {l.srcSmall && <source media={SMALL_SCREEN} srcSet={l.srcSmall} />}
                <FadeImg src={l.src} alt="" fetchPriority="high" onReady={() => markLoaded(l.key)} className="absolute inset-0 h-full w-full object-cover transition-opacity duration-(--duration-bg)" />
              </picture>
            </div>
          </div>
        ) : (
          <div key={l.key} className="absolute inset-0 bg-bg" />
        ),
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.5),rgb(0_0_0/0.05)_35%,rgb(0_0_0/0.35)_60%,rgb(0_0_0/0.94))]" />
      <div className="absolute inset-0 bg-linear-to-r from-black/45 to-transparent to-60%" />
      {/* Phones: the still is short and the title sits on its lower edge, so fade the bottom third into the page. */}
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/55 via-30% to-transparent to-65% md:hidden" />
      {/* Ambient glow in the still's own colour, over the shades so it pools behind the title; the colour tweens between stills. */}
      <div
        data-testid="glow"
        className="glow absolute inset-0 transition-[background-color] duration-(--duration-bg) ease-out"
        style={{ backgroundColor: "var(--tint)" }}
      />
      <div className="grain absolute inset-0" />
    </div>
  );
}
