"use client";

import { useEffect, useState } from "react";
import {
  getSpecimen,
  SpecimenArtwork,
  type SpecimenViewport,
} from "@/components/campaign/SpecimenArtwork";

const bubbles = Array.from({ length: 16 }, (_, index) => index + 1);
const dust = Array.from({ length: 18 }, (_, index) => index + 1);

function useSceneViewport(): SpecimenViewport {
  const [viewport, setViewport] = useState<SpecimenViewport>("desktop");

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const sync = () => setViewport(query.matches ? "mobile" : "desktop");
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return viewport;
}

export function NavyApricotScene() {
  const viewport = useSceneViewport();

  return (
    <div className="scene-art scene-art--navy-apricot" aria-hidden="true">
      <div className="navy-field" />
      <div className="apricot-field" />
      <div className="navy-void" />
      <div className="apricot-plate" />

      <svg className="tidal-current tidal-current--far" viewBox="0 0 720 520" preserveAspectRatio="none">
        <path d="M-40 390C70 276 132 438 258 352S430 236 542 301s103 23 218-59V560H-40Z" />
        <path d="M-30 356c129-104 194 47 313-50 116-94 207-88 298-37 93 53 122 22 180-33" />
      </svg>
      <svg className="tidal-current tidal-current--near" viewBox="0 0 720 460" preserveAspectRatio="none">
        <path d="M-44 344c98-34 157 17 252-38 125-72 184-11 278-2 105 10 146-41 274-56v260H-44Z" />
        <path d="M-30 349c105-37 159 12 255-38 113-61 190-20 277-11 112 13 156-39 258-48" />
      </svg>
      <svg className="heat-fall" viewBox="0 0 720 560" preserveAspectRatio="none">
        <path d="M13-70C119 22 213 33 296 0s180-12 263 55 122 64 207-3" />
        <path d="M-20 72c116 85 194 88 294 40 107-51 189-22 272 38 80 58 144 59 210-8" />
        <path d="M-10 202c91 73 180 96 286 37 88-49 204-23 279 27 88 58 136 63 213 17" />
        <path d="M-8 332c98 70 185 82 275 38 104-51 205-37 298 22 72 46 131 54 194 30" />
      </svg>

      <div className="navy-shelf"><i /><i /><i /></div>
      <div className="apricot-dune"><i /><i /><i /></div>
      <div className="feather-crest"><i /><i /><i /><i /><i /><b /></div>
      <div className="night-flower-scene"><i /><i /><i /><i /><i /><b /></div>
      <div className="peach-fruit"><i /><b /></div>

      <SpecimenArtwork
        specimen={getSpecimen("AC-01-A")}
        viewport={viewport}
        placement="contract"
        decorative
        className="scene-specimen scene-specimen--cobalt-tile"
      />
      <SpecimenArtwork
        specimen={getSpecimen("AC-01-B")}
        viewport={viewport}
        placement="contract"
        decorative
        className="scene-specimen scene-specimen--tidal-panel"
      />
      <SpecimenArtwork
        specimen={getSpecimen("AC-01-C")}
        viewport={viewport}
        placement="contract"
        decorative
        className="scene-specimen scene-specimen--solar-cake"
      />

      <div className="tidal-seam"><i /><i /><i /><b /></div>
      <div className="aperture aperture--outer" />
      <div className="aperture aperture--inner" />
      <svg className="aperture-lines" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
        <path d="M32 200C68 108 127 57 200 47c73 10 132 61 168 153-36 92-95 143-168 153C127 343 68 292 32 200Z" />
        <path d="M70 200c28-60 70-95 130-105 60 10 102 45 130 105-28 60-70 95-130 105C140 295 98 260 70 200Z" />
      </svg>

      <div className="shared-orb">
        <div className="shared-moon"><i /><i /><i /></div>
        <div className="shared-peach"><i /><b /></div>
        <div className="shared-orb-glint" />
      </div>

      <div className="bubble-field">
        {bubbles.map((bubble) => <i key={bubble} className={`bubble bubble--${bubble}`} />)}
      </div>
      <div className="dust-field">
        {dust.map((particle) => <i key={particle} className={`dust dust--${particle}`} />)}
      </div>

      <svg className="navy-foreground" viewBox="0 0 720 260" preserveAspectRatio="none">
        <path d="M-24 119c95-48 165 29 260-21 97-51 174-15 257 14 89 31 137 13 251-34v206H-24Z" />
        <path d="M-24 125c95-48 165 29 260-21 97-51 174-15 257 14 89 31 137 13 251-34" />
      </svg>
      <div className="navy-edge" />
      <div className="apricot-edge" />
    </div>
  );
}
