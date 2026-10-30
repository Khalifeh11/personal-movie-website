import { useState } from "react";
import type { Title } from "../lib/types";
import { Label } from "./ui/Label";
import { Overlay } from "./ui/Overlay";

export function TrailerOverlay({ title, onClose }: { title: Title | null; onClose: () => void }) {
  return (
    <Overlay open={Boolean(title?.trailerKey)} onClose={onClose} label={title ? `${title.title} trailer` : "Trailer"}>
      {title?.trailerKey && <Frame key={title.id} title={title} />}
    </Overlay>
  );
}

function Frame({ title }: { title: Title }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative aspect-video w-[min(1100px,86vw)] bg-cover bg-center"
        style={!loaded && title.backdrop ? { backgroundImage: `url(${title.backdrop})` } : undefined}
      >
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${title.trailerKey}?autoplay=1&rel=0`}
          title={`${title.title} trailer`}
          allow="autoplay; fullscreen"
          allowFullScreen
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <Label muted>{title.title}</Label>
    </div>
  );
}
