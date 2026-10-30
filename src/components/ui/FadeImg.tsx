import { useCallback, useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";

/**
 * An <img> that stays at opacity 0 until it has loaded, then opacity 1.
 * The caller supplies the transition classes (e.g. `transition-opacity duration-300`) so it can
 * combine them with its own (filter, scale) without two `transition-*` utilities fighting.
 * Handles cached images (already complete before React attaches onLoad) and src changes.
 */
export function FadeImg({ className = "", onLoad, src, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>();
  const loaded = loadedSrc === src;

  const ref = useCallback(
    (el: HTMLImageElement | null) => {
      if (el?.complete && el.naturalWidth > 0) setLoadedSrc(src);
    },
    [src],
  );
  const handleLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    setLoadedSrc(src);
    onLoad?.(e);
  };

  return (
    <img
      ref={ref}
      src={src}
      onLoad={handleLoad}
      data-loaded={loaded}
      className={`${loaded ? "opacity-100" : "opacity-0"} ${className}`}
      {...rest}
    />
  );
}
