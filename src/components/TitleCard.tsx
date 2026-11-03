import { Fragment, type CSSProperties } from "react";
import { genreLine } from "../lib/format";
import { moodLabel } from "../lib/moods";
import { tintOf } from "../lib/tint";
import type { Title } from "../lib/types";
import { Facts } from "./FilmRow";
import { action } from "./ui/actionClass";
import { FadeImg } from "./ui/FadeImg";
import { MoodDot } from "./ui/MoodDot";
import { Overlay } from "./ui/Overlay";
import { UserControls } from "./UserControls";

interface TitleCardProps {
  title: Title | null;
  onClose: () => void;
  onTrailer: (t: Title) => void;
  onWatched: (id: string, watched: boolean) => void;
}

/**
 * Everything a row holds plus the backdrop, in one card: a centred 720px panel on desktop, a
 * bottom sheet on phones. Trailer opens in the app-level overlay above it.
 */
export function TitleCard({ title: t, onClose, onTrailer, onWatched }: TitleCardProps) {
  return (
    <Overlay open={Boolean(t)} onClose={onClose} label={t?.title ?? ""} closeClassName="hidden md:block">
      {t && (
        <div
          data-testid="card"
          className="fixed inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto border-t border-white/10 bg-[#0a0a0a] md:static md:w-[720px] md:rounded-md md:border"
          style={{ "--tint": tintOf(t) } as CSSProperties}
        >
          {/* Phones: the sheet carries its own ✕ (thumb-sized, sticky so it survives scrolling); desktop uses the overlay's. */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="sticky top-0 z-(--z-ui) float-right flex h-11 w-11 items-center justify-center text-2xl text-fg-2 md:hidden"
          >
            ✕
          </button>
          {t.backdrop && (
            <div
              className="relative h-[180px] bg-cover bg-center md:h-[220px]"
              style={t.backdropSmall ? { backgroundImage: `url(${t.backdropSmall})` } : undefined}
            >
              {/* absolute: a block img would dodge the floated phone ✕ and slide 44px down past the gradient. */}
              <FadeImg src={t.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500" />
              <div aria-hidden className="glow absolute inset-0" style={{ backgroundColor: "var(--tint)" }} />
              <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,#0a0a0a,transparent_70%)]" />
            </div>
          )}
          <div className={`relative flex gap-5 px-5 pb-6 md:px-6 ${t.backdrop ? "-mt-[60px] md:-mt-[70px]" : "pt-12"}`}>
            {/* self-start: flex stretch would otherwise win over the aspect ratio and pull the poster to the text's height. */}
            <div data-testid="poster" className="relative aspect-[2/3] w-[84px] flex-none self-start overflow-hidden rounded-sm bg-white/5 md:w-[110px]">
              {t.poster && <FadeImg src={t.poster} alt="" className="h-full w-full object-cover transition-opacity duration-300" />}
            </div>
            <div className="flex min-w-0 flex-col gap-2 pt-10 md:pt-14">
              <h2 className="font-display text-[30px] uppercase leading-none md:text-[32px]">{t.title}</h2>
              <Facts title={t} onNavigate={onClose} className="text-[15px] text-fg-2" />
              <p className="text-sm text-fg-3">
                {genreLine(t)}
                {t.moods.length > 0 && " · Feels: "}
                {t.moods.map((m, i) => (
                  <Fragment key={m}>
                    {i > 0 && " · "}
                    <MoodDot slug={m} className="mr-1.5 align-middle" />
                    {moodLabel(m)}
                  </Fragment>
                ))}
              </p>
              {t.overview && <p className="text-base leading-relaxed text-fg-2">{t.overview}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {t.trailerKey && <button type="button" onClick={() => onTrailer(t)} className={action}>▶ Trailer</button>}
                <a href={t.imdbUrl} target="_blank" rel="noreferrer" className={action}>IMDb ↗</a>
                <UserControls id={t.id} onWatched={(w) => onWatched(t.id, w)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Overlay>
  );
}
