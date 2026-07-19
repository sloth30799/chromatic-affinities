import type { ReactNode } from "react";
import type { MaterialSpecimen } from "@/data/exhibition";
import {
  SpecimenArtwork,
  type SpecimenViewport,
} from "./SpecimenArtwork";
import styles from "./SpecimenArtwork.module.css";

type StudyFigureProps = {
  specimen: MaterialSpecimen;
  viewport?: SpecimenViewport;
  showMetadata?: boolean;
  caption?: ReactNode;
  className?: string;
};

/**
 * A restrained editorial figure for collection and case-study layouts. It keeps
 * specimen identity in the shared artwork primitive and deliberately avoids a
 * product-card shell, price, or purchase affordance.
 */
export function StudyFigure({
  specimen,
  viewport = "desktop",
  showMetadata = true,
  caption,
  className,
}: StudyFigureProps) {
  return (
    <figure className={[styles.studyFigure, className ?? ""].filter(Boolean).join(" ")} data-study-figure={specimen.id}>
      <div className={styles.studyFigureArtwork}>
        <SpecimenArtwork specimen={specimen} viewport={viewport} decorative />
      </div>
      {(showMetadata || caption) && (
        <figcaption className={styles.studyFigureCaption}>
          {showMetadata && (
            <>
              <span className={styles.studyFigureId}>{specimen.id}</span>
              <span className={styles.studyFigureName}>{specimen.name}</span>
              <span className={styles.studyFigureFact}>{specimen.material} · {specimen.process} · {specimen.finish}</span>
            </>
          )}
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
