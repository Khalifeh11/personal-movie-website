import { Hero } from "./components/Hero";
import titlesJson from "./data/titles.json";
import type { Title } from "./lib/types";

const titles = titlesJson as Title[];

export default function App() {
  const current = titles[0];
  return (
    <main className="relative min-h-dvh overflow-hidden bg-bg font-ui text-fg">
      {/* Static still for now; animated Backdrop comes later. */}
      {current.backdrop && (
        <img src={current.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-linear-to-b from-black/45 via-black/25 to-black/90" />
      <div className="absolute inset-x-5 bottom-8 z-ui md:inset-x-[84px] md:bottom-10">
        <Hero title={current} showBlurb />
      </div>
    </main>
  );
}
