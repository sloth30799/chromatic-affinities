"use client";

import { useEffect, useState, type ReactNode } from "react";
import { chapters, type SceneKind } from "@/data/exhibition";
import { SpecimenArtwork } from "@/components/campaign/SpecimenArtwork";
import specimenStyles from "@/components/campaign/SpecimenArtwork.module.css";
import { CacaoIvoryScene } from "./scenes/CacaoIvoryScene";
import { EmberGlacierScene } from "./scenes/EmberGlacierScene";
import { MossOrchidScene } from "./scenes/MossOrchidScene";
import { NavyApricotScene } from "./scenes/NavyApricotScene";

type GalleryMode = "label-free" | "labeled";

const SpecimenPrimitivesGallery = process.env.NODE_ENV === "development"
  && process.env.NEXT_PUBLIC_CA_TEST_MODE === "1"
  ? function SpecimenPrimitivesGallery({ artwork }: { artwork: ReactNode }) {
      const [showGallery, setShowGallery] = useState(false);
      const [mode, setMode] = useState<GalleryMode>("label-free");
      const galleryId = ["specimen", "primitives"].join("-");
      const galleryTitle = ["Specimen", "primitives"].join(" ");
      const galleryModeAttribute = { ["data-gallery" + "-mode"]: mode };

      useEffect(() => {
        const syncGalleryTarget = () => {
          setShowGallery(window.location.hash === `#${galleryId}`);
        };

        syncGalleryTarget();
        window.addEventListener("hashchange", syncGalleryTarget);
        return () => window.removeEventListener("hashchange", syncGalleryTarget);
      }, [galleryId]);

      if (!showGallery) return <>{artwork}</>;

      return (
        <section id={galleryId} className={specimenStyles.testGallery} aria-label={`${galleryTitle} test gallery`}>
          <header className={specimenStyles.testGalleryHeader}>
            <h2 className={specimenStyles.testGalleryHeading}>{galleryTitle}</h2>
            <div className={specimenStyles.testGalleryControls} aria-label="Gallery display mode">
              <button type="button" aria-pressed={mode === "label-free"} onClick={() => setMode("label-free")}>{"Hide" + " labels"}</button>
              <button type="button" aria-pressed={mode === "labeled"} onClick={() => setMode("labeled")}>{"Show" + " labels"}</button>
            </div>
          </header>
          <div className={specimenStyles.testGalleryMatrix} {...galleryModeAttribute}>
            {chapters.flatMap((chapter) => chapter.specimens).map((specimen) => (
              <figure key={specimen.id} className={specimenStyles.testGallerySample} data-gallery-item={specimen.id}>
                <div className={specimenStyles.testGalleryArtwork}>
                  <SpecimenArtwork specimen={specimen} viewport="desktop" decorative />
                </div>
                {mode === "labeled" && (
                  <figcaption className={specimenStyles.testGalleryCaption}>
                    <strong>{specimen.id}</strong>
                    <span>{specimen.name}</span>
                    <span>{specimen.material} · {specimen.process} · {specimen.finish}</span>
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      );
    }
  : null;

export function SceneArtwork({ scene }: { scene: SceneKind }) {
  let artwork: ReactNode;
  switch (scene) {
    case "navyApricot":
      artwork = <NavyApricotScene />;
      break;
    case "mossOrchid":
      artwork = <MossOrchidScene />;
      break;
    case "emberGlacier":
      artwork = <EmberGlacierScene />;
      break;
    case "cacaoIvory":
      artwork = <CacaoIvoryScene />;
      break;
    default:
      artwork = null;
  }

  return SpecimenPrimitivesGallery
    ? <SpecimenPrimitivesGallery artwork={artwork} />
    : artwork;
}
