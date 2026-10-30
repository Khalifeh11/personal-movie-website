import { Label } from "./ui/Label";

export function Footer() {
  return (
    <footer className="flex flex-col items-start gap-3 border-t border-white/10 px-5 py-10 md:flex-row md:items-center md:gap-5 md:px-11">
      <img src="/tmdb.svg" alt="TMDB" className="h-3" />
      <Label muted className="normal-case tracking-normal">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </Label>
    </footer>
  );
}
