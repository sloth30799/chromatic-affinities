"use client";

import { useEffect, useState } from "react";
import {
  getSpecimen,
  SpecimenArtwork,
  type SpecimenViewport,
} from "@/components/campaign/SpecimenArtwork";

const grains = Array.from({ length: 5 }, (_, index) => index + 1);

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

/** Material fold uses the shared clay, vessel, and paperclay specimen silhouettes. */
export function CacaoIvoryScene() {
  const viewport = useSceneViewport();

  return (
    <div className="scene-art scene-art--cacao-ivory" aria-hidden="true">
      <div className="cacao-territory" />
      <div className="ivory-territory" />
      <div className="cacao-fibers" />
      <div className="paper-field" />

      <SpecimenArtwork
        specimen={getSpecimen("AC-04-A")}
        viewport={viewport}
        placement="contract"
        decorative
        className="scene-specimen scene-specimen--cacao-clay"
      />
      <SpecimenArtwork
        specimen={getSpecimen("AC-04-B")}
        viewport={viewport}
        placement="contract"
        decorative
        className="scene-specimen scene-specimen--porcelain-vessel"
      />
      <SpecimenArtwork
        specimen={getSpecimen("AC-04-C")}
        viewport={viewport}
        placement="contract"
        decorative
        className="scene-specimen scene-specimen--folded-sheet"
      />

      <div className="kiln-gutter" />
      <div className="fold-hero"><i /><i /><b /></div>
      <div className="grain-crossing">
        {grains.map((grain) => <i key={grain} className={`grain grain--${grain}`} />)}
      </div>
      <div className="cacao-ground" />
      <div className="ivory-ground" />
    </div>
  );
}
