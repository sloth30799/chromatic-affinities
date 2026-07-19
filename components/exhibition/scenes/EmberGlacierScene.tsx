"use client";

import { useEffect, useState } from "react";
import {
  getSpecimen,
  SpecimenArtwork,
  type SpecimenViewport,
} from "@/components/campaign/SpecimenArtwork";

const sparks = Array.from({ length: 6 }, (_, index) => index + 1);

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

/** Thermal fracture keeps the three catalog specimens as the only material targets. */
export function EmberGlacierScene() {
  const viewport = useSceneViewport();

  return (
    <div className="scene-art scene-art--ember-glacier" aria-hidden="true">
      <div className="ember-territory" />
      <div className="glacier-territory" />
      <div className="ember-escarpment" />
      <div className="glacier-shelf" />

      <SpecimenArtwork
        specimen={getSpecimen("AC-03-A")}
        viewport={viewport}
        placement="contract"
        decorative
        className="scene-specimen scene-specimen--vermilion-plate"
      />
      <SpecimenArtwork
        specimen={getSpecimen("AC-03-B")}
        viewport={viewport}
        placement="contract"
        decorative
        className="scene-specimen scene-specimen--ember-cast"
      />
      <SpecimenArtwork
        specimen={getSpecimen("AC-03-C")}
        viewport={viewport}
        placement="contract"
        decorative
        className="scene-specimen scene-specimen--glacier-shard"
      />

      <div className="prism-seam" />
      <div className="prism-hero" />
      <div className="thermal-sparks">
        {sparks.map((spark) => <i key={spark} className={`thermal-spark thermal-spark--${spark}`} />)}
      </div>
      <div className="ember-ground" />
      <div className="ice-ground" />
    </div>
  );
}
