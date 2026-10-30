import { useCallback, useEffect, useRef, useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";

interface FadeImgProps extends ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Hold the request until the image is within ~200px of the viewport. Native `loading="lazy"`
   * alone isn't enough: Chrome's threshold is wide enough that every tile and poster on the home
   * page starts at once and starves the hero still.
   */
  defer?: boolean;
}

const NEAR_VIEWPORT = "200px";

/**
 * An <img> that stays at opacity 0 until it has loaded, then opacity 1.
 * The caller supplies the transition classes (e.g. `transition-opacity duration-300`) so it can
 * combine them with its own (filter, scale) without two `transition-*` utilities fighting.
 * Handles cached images (already complete before React attaches onLoad) and src changes.
 */
export function FadeImg({ className = "", onLoad, src, defer = false, ...rest }: FadeImgProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>();
  const [near, setNear] = useState(!defer);
  const el = useRef<HTMLImageElement | null>(null);
  const loaded = loadedSrc === src;
  const liveSrc = near ? src : undefined;

  const ref = useCallback(
    (node: HTMLImageElement | null) => {
      el.current = node;
      if (node?.complete && node.naturalWidth > 0 && node.getAttribute("src") === src) setLoadedSrc(src);
    },
    [src],
  );

  useEffect(() => {
    if (near || !el.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: NEAR_VIEWPORT },
    );
    io.observe(el.current);
    return () => io.disconnect();
  }, [near]);

  const handleLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    setLoadedSrc(src);
    onLoad?.(e);
  };

  return (
    <img
      ref={ref}
      src={liveSrc}
      data-src={src}
      onLoad={handleLoad}
      data-loaded={loaded}
      className={`${loaded ? "opacity-100" : "opacity-0"} ${className}`}
      {...rest}
    />
  );
}
