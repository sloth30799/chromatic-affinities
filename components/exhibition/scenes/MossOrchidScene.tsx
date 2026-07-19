"use client";

import { useEffect, useState } from "react";
import {
  getSpecimen,
  SpecimenArtwork,
  type SpecimenViewport,
} from "@/components/campaign/SpecimenArtwork";

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

export function MossOrchidScene() {
  const viewport = useSceneViewport();

  return (
    <div className="scene-art scene-art--moss-orchid" aria-hidden="true">
      <div className="moss-territory" />
      <div className="orchid-territory" />
      <div className="moss-rhizome" />
      <div className="moss-frond moss-frond--near" />
      <div className="moss-frond moss-frond--far" />
      <div className="orchid-stem" />
      <div className="orchid-bloom" />
      <SpecimenArtwork
        specimen={getSpecimen("AC-02-A")}
        viewport={viewport}
        placement="contract"
        decorative
        className="scene-specimen scene-specimen--verdant-organza"
      />
      <SpecimenArtwork
        specimen={getSpecimen("AC-02-B")}
        viewport={viewport}
        placement="contract"
        decorative
        className="scene-specimen scene-specimen--orchid-weave"
      />
      <SpecimenArtwork
        specimen={getSpecimen("AC-02-C")}
        viewport={viewport}
        placement="contract"
        decorative
        className="scene-specimen scene-specimen--pigment-vial"
      />
      <div className="botanical-seam" />
      <div className="lumen-nucleus" />
      <div className="spore-crossing"><i /><i /><i /><i /><i /></div>
      <div className="moss-ground" />
      <div className="orchid-ground" />
    </div>
  );
}
