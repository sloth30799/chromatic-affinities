"use client";

import { type CSSProperties } from "react";
import {
  chapters,
  type MaterialSpecimen,
  type ResponsivePoint,
  type SpecimenId,
} from "@/data/exhibition";
import styles from "./SpecimenArtwork.module.css";

export type SpecimenViewport = "desktop" | "mobile";

export type SpecimenBox = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type ResponsiveSpecimenBox = Readonly<Record<SpecimenViewport, SpecimenBox>>;

export type SpecimenPlacement = Readonly<{
  box: SpecimenBox;
  anchor: ResponsivePoint[SpecimenViewport];
}>;

const specimenIds = [
  "AC-01-A", "AC-01-B", "AC-01-C",
  "AC-02-A", "AC-02-B", "AC-02-C",
  "AC-03-A", "AC-03-B", "AC-03-C",
  "AC-04-A", "AC-04-B", "AC-04-C",
] as const satisfies readonly SpecimenId[];

/** Stable catalog order for visual registers, collections, and test coverage. */
export const SPECIMEN_IDS: readonly SpecimenId[] = specimenIds;

/**
 * Each box is expressed as a percentage of its containing diptych stage. The
 * corresponding anchor is derived from the frozen hotspot data below, so a
 * later scene can place artwork and its material note from one contract.
 */
export const specimenGeometry: Readonly<Record<SpecimenId, ResponsiveSpecimenBox>> = {
  "AC-01-A": {
    desktop: { x: 7, y: 39, width: 25, height: 31 },
    mobile: { x: 7, y: 43, width: 27, height: 29 },
  },
  "AC-01-B": {
    desktop: { x: 38, y: 57, width: 17, height: 31 },
    mobile: { x: 38, y: 55, width: 17, height: 31 },
  },
  "AC-01-C": {
    desktop: { x: 61, y: 47, width: 30, height: 37 },
    mobile: { x: 60, y: 47, width: 32, height: 35 },
  },
  "AC-02-A": {
    desktop: { x: 5, y: 35, width: 34, height: 43 },
    mobile: { x: 4, y: 40, width: 34, height: 37 },
  },
  "AC-02-B": {
    desktop: { x: 56, y: 47, width: 32, height: 42 },
    mobile: { x: 57, y: 44, width: 34, height: 41 },
  },
  "AC-02-C": {
    desktop: { x: 44, y: 20, width: 17, height: 35 },
    mobile: { x: 43, y: 23, width: 18, height: 34 },
  },
  "AC-03-A": {
    desktop: { x: 5, y: 43, width: 32, height: 38 },
    mobile: { x: 4, y: 42, width: 32, height: 37 },
  },
  "AC-03-B": {
    desktop: { x: 34, y: 56, width: 19, height: 28 },
    mobile: { x: 34, y: 55, width: 19, height: 27 },
  },
  "AC-03-C": {
    desktop: { x: 51, y: 17, width: 25, height: 43 },
    mobile: { x: 51, y: 20, width: 25, height: 42 },
  },
  "AC-04-A": {
    desktop: { x: 5, y: 43, width: 34, height: 39 },
    mobile: { x: 4, y: 42, width: 34, height: 39 },
  },
  "AC-04-B": {
    desktop: { x: 59, y: 45, width: 29, height: 39 },
    mobile: { x: 62, y: 44, width: 29, height: 39 },
  },
  "AC-04-C": {
    desktop: { x: 45, y: 21, width: 18, height: 34 },
    mobile: { x: 44, y: 23, width: 18, height: 33 },
  },
};

const specimenById = new Map<SpecimenId, MaterialSpecimen>(
  chapters.flatMap((chapter) => chapter.specimens.map((specimen) => [specimen.id, specimen] as const)),
);

const hotspotBySpecimenId = new Map(
  chapters.flatMap((chapter) => chapter.hotspots.map((hotspot) => [hotspot.specimenId, hotspot] as const)),
);

const silhouetteById: Readonly<Record<SpecimenId, string>> = {
  "AC-01-A": "beveled-glaze-tile",
  "AC-01-B": "waterline-lacquer-panel",
  "AC-01-C": "pressed-mineral-puck",
  "AC-02-A": "draped-open-weave",
  "AC-02-B": "jacquard-monofilament-weave",
  "AC-02-C": "capped-pigment-vial",
  "AC-03-A": "mirror-lacquer-plate",
  "AC-03-B": "broken-pigment-cast",
  "AC-03-C": "faceted-resin-shard",
  "AC-04-A": "raw-clay-body",
  "AC-04-B": "porcelain-vessel",
  "AC-04-C": "folded-ceramic-sheet",
};

export function getSpecimen(id: SpecimenId): MaterialSpecimen {
  const specimen = specimenById.get(id);
  if (!specimen) throw new Error(`Unknown material specimen: ${id}`);
  return specimen;
}

export function getSpecimenBox(id: SpecimenId, viewport: SpecimenViewport): SpecimenBox {
  return specimenGeometry[id][viewport];
}

/** Returns the frozen hotspot point linked to this specimen without duplicating it. */
export function getSpecimenAnchor(
  id: SpecimenId,
  viewport: SpecimenViewport,
): ResponsivePoint[SpecimenViewport] {
  const hotspot = hotspotBySpecimenId.get(id);
  if (!hotspot) throw new Error(`Missing hotspot contract for material specimen: ${id}`);
  return hotspot.position[viewport];
}

export function getSpecimenPlacement(id: SpecimenId, viewport: SpecimenViewport): SpecimenPlacement {
  return { box: getSpecimenBox(id, viewport), anchor: getSpecimenAnchor(id, viewport) };
}

export function isPointWithinSpecimenBox(
  point: Readonly<{ x: number; y: number }>,
  box: SpecimenBox,
): boolean {
  return point.x >= box.x
    && point.x <= box.x + box.width
    && point.y >= box.y
    && point.y <= box.y + box.height;
}

export function doesSpecimenAnchorIntersectBox(id: SpecimenId, viewport: SpecimenViewport): boolean {
  return isPointWithinSpecimenBox(getSpecimenAnchor(id, viewport), getSpecimenBox(id, viewport));
}

export function specimenPlacementStyle(id: SpecimenId, viewport: SpecimenViewport): CSSProperties {
  const box = getSpecimenBox(id, viewport);
  return {
    "--specimen-box-x": `${box.x}%`,
    "--specimen-box-y": `${box.y}%`,
    "--specimen-box-width": `${box.width}%`,
    "--specimen-box-height": `${box.height}%`,
  } as CSSProperties;
}

type SpecimenArtworkProps = {
  specimen: MaterialSpecimen;
  viewport?: SpecimenViewport;
  placement?: "inline" | "contract";
  decorative?: boolean;
  className?: string;
};

function SpecimenShape({ id }: { id: SpecimenId }) {
  switch (id) {
    case "AC-01-A":
      return (
        <svg className={styles.shape} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <rect className={styles.tileShadow} x="19" y="18" width="69" height="70" rx="2" />
          <rect className={styles.tileBody} x="10" y="9" width="72" height="73" rx="2" />
          <path className={styles.tileBevel} d="M10 9h72v8H17v58h65v7H10Z" />
          <path className={styles.tileGlaze} d="M17 16h58v49l-6 4 6 7H17Z" />
          <path className={styles.tileBorder} d="M22 21h48v48H22Z" />
          <g className={styles.tileMotif}>
            <circle cx="46" cy="45" r="7" />
            <circle cx="46" cy="31" r="8" />
            <circle cx="46" cy="59" r="8" />
            <circle cx="32" cy="45" r="8" />
            <circle cx="60" cy="45" r="8" />
            <path d="M24 23h11l-11 11ZM68 23H57l11 11ZM24 67h11L24 56ZM68 67H57l11-11Z" />
          </g>
          <path className={styles.tileSheen} d="M21 20h28c-9 4-16 11-21 21" />
          <path className={styles.tileChip} d="M68 16h7v10l-4-3-5 3v-7Z" />
        </svg>
      );
    case "AC-01-B":
      return (
        <svg className={styles.shape} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path className={styles.panelShadow} d="M27 8h49l8 12v73l-9 4H24l-7-11V20Z" />
          <path className={styles.panelBody} d="M25 6h50l8 13v71l-9 4H25l-8-11V19Z" />
          <path className={styles.panelWaterline} d="M19 58c17-7 45-7 65 0v25l-10 4H25l-6-8Z" />
          <path className={styles.panelReflection} d="M31 15h14l-16 65H19Z" />
          <path className={styles.panelEdge} d="M75 6l8 13v71l-9 4 2-15Z" />
        </svg>
      );
    case "AC-01-C":
      return (
        <svg className={styles.shape} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <circle className={styles.puckShadow} cx="53" cy="31" r="25" />
          <circle className={styles.puckLid} cx="48" cy="27" r="24" />
          <circle className={styles.puckMirror} cx="48" cy="27" r="19" />
          <rect className={styles.puckHinge} x="42" y="43" width="12" height="9" rx="2" />
          <circle className={styles.puckShadow} cx="53" cy="65" r="31" />
          <circle className={styles.puckBody} cx="48" cy="60" r="30" />
          <circle className={styles.puckWell} cx="48" cy="60" r="24" />
          <path className={styles.puckBloom} d="M26 59c0-14 9-23 22-23 12 0 21 7 23 18l-8 6 7 7c-4 11-12 17-24 16-13-1-21-10-20-24Z" />
          <path className={styles.puckCracks} d="m34 47 7 6 5-9 7 9 10-6M34 68l8-7 8 6 11-9M42 77l7-12M53 53l-3 14" />
          <g className={styles.puckGrain}><circle cx="32" cy="55" r=".8" /><circle cx="36" cy="43" r=".55" /><circle cx="45" cy="40" r=".7" /><circle cx="55" cy="42" r=".55" /><circle cx="64" cy="50" r=".8" /><circle cx="66" cy="65" r=".55" /><circle cx="58" cy="74" r=".75" /><circle cx="47" cy="78" r=".55" /><circle cx="37" cy="72" r=".7" /></g>
          <g className={styles.puckDust}><circle cx="20" cy="72" r="2.4" /><circle cx="17" cy="79" r="1.4" /><circle cx="25" cy="85" r="1" /><circle cx="71" cy="76" r="1.8" /><circle cx="79" cy="80" r="1.1" /><path d="M15 67c5-3 9-2 13 2-4 4-9 6-14 3Z" /></g>
          <path className={styles.puckApplicator} d="M23 89h46v3H23Z" />
          <ellipse className={styles.puckSponge} cx="20" cy="90.5" rx="7" ry="4" />
          <ellipse className={styles.puckSponge} cx="72" cy="90.5" rx="7" ry="4" />
        </svg>
      );
    case "AC-02-A":
      return (
        <svg className={styles.shape} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path className={styles.organzaShadow} d="M15 13c23 0 38 7 57 4 4 19-2 31 10 62-17 6-38 3-65 9 2-28-13-39-2-75Z" />
          <path className={styles.organzaBody} d="M12 9c22 2 39 9 60 4 3 22-3 31 12 62-19 9-40 3-68 12 4-27-13-43-4-78Z" />
          <path className={styles.organzaFold} d="M17 16c15 16 15 35 4 62M37 14c12 20 12 43 1 64M56 14c11 19 11 39 2 64M72 14c-2 21 2 42 12 61" />
          <path className={styles.organazaWeft} d="M14 28c17 8 39 8 59 1M14 42c18 8 43 8 63 0M15 57c18 8 47 7 66-1M17 70c19 7 45 6 67-1" />
        </svg>
      );
    case "AC-02-B":
      return (
        <svg className={styles.shape} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path className={styles.weaveShadow} d="m12 72 43-61 34 21-42 61Z" />
          <path className={styles.weaveBody} d="m10 67 43-61 35 22-43 61Z" />
          <g className={styles.weaveWarp}><path d="m16 70 43-61M25 76 68 15M35 81 78 20M45 87 87 27" /></g>
          <g className={styles.weaveWeft}><path d="m16 58 54 34M23 47 78 81M31 36 86 70M39 25 89 57M47 14 88 39" /></g>
          <path className={styles.weaveFlash} d="m57 9 10 6-42 61-10-6Z" />
        </svg>
      );
    case "AC-02-C":
      return (
        <svg className={styles.shape} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path className={styles.vialShadow} d="M38 11h24v21l11 16v36c0 9-8 13-23 13s-23-4-23-13V48l11-16Z" />
          <path className={styles.vialGlass} d="M36 9h28v23l10 16v37c0 8-9 12-24 12s-24-4-24-12V48l10-16Z" />
          <path className={styles.vialCap} d="M34 7h32v15H34Z" />
          <path className={styles.vialLiquid} d="M29 59c14-5 30-5 43 0v26c0 8-9 10-22 10s-22-3-22-10Z" />
          <path className={styles.vialGlint} d="M36 35c-5 14-5 31-2 43" />
          <g className={styles.vialSediment}><circle cx="40" cy="78" r="2" /><circle cx="49" cy="84" r="1.5" /><circle cx="58" cy="77" r="2" /><circle cx="64" cy="86" r="1" /></g>
        </svg>
      );
    case "AC-03-A":
      return (
        <svg className={styles.shape} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <rect className={styles.plateShadow} x="18" y="15" width="68" height="74" rx="4" />
          <rect className={styles.plateBody} x="10" y="8" width="70" height="74" rx="4" />
          <rect className={styles.plateGlow} x="17" y="15" width="56" height="58" rx="2" />
          <path className={styles.plateHighlight} d="M24 19h13L28 68H17Z" />
          <path className={styles.plateEdge} d="M73 15h7v67H10v-7h63Z" />
          <circle className={styles.plateMount} cx="65" cy="23" r="3" />
        </svg>
      );
    case "AC-03-B":
      return (
        <svg className={styles.shape} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path className={styles.castShadow} d="m13 66 12-42 26-16 32 16 7 33-19 28-43 5Z" />
          <path className={styles.castBody} d="m10 61 13-42 27-15 32 17 8 31-19 29-43 5Z" />
          <path className={styles.castMolten} d="m20 56 13-23 24-12 22 12-12 28-29 12Z" />
          <path className={styles.castCrust} d="m15 48 20-12 9 8 15-13 21 12M20 69l19-10 13 12 17-16" />
          <path className={styles.castBreak} d="m10 61 18 25 11-16 14 12 18-17" />
        </svg>
      );
    case "AC-03-C":
      return (
        <svg className={styles.shape} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path className={styles.shardShadow} d="m47 5 37 24 2 39-30 28-36-18-6-38Z" />
          <path className={styles.shardBody} d="m44 3 38 24 2 40-31 29-36-18-6-39Z" />
          <path className={styles.shardFacetOne} d="m44 3 9 44-36-9Z" />
          <path className={styles.shardFacetTwo} d="m53 47 29-20 2 40Z" />
          <path className={styles.shardFacetThree} d="m17 38 36 9v49L17 78Z" />
          <path className={styles.shardFacetFour} d="m53 47 31 20-31 29Z" />
          <path className={styles.shardEdge} d="m44 3 9 44 29-20M53 47 17 38m36 9v49" />
        </svg>
      );
    case "AC-04-A":
      return (
        <svg className={styles.shape} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path className={styles.clayShadow} d="M11 64c0-25 18-46 42-50 19-3 35 8 39 26 5 23-14 45-37 51-25 7-44-5-44-27Z" />
          <path className={styles.clayBody} d="M8 59c1-25 19-45 43-49 20-3 36 8 40 26 5 23-14 45-38 51-25 6-46-6-45-28Z" />
          <path className={styles.clayPlane} d="M17 48c8-20 27-30 47-27 13 2 22 11 23 19-16 13-44 18-70 8Z" />
          <path className={styles.clayBreak} d="M12 67c12-9 21 7 32-3 10-9 20 3 36-8" />
          <g className={styles.clayGrog}><circle cx="26" cy="40" r="2" /><circle cx="44" cy="31" r="1.5" /><circle cx="65" cy="37" r="2.5" /><circle cx="34" cy="63" r="2" /><circle cx="57" cy="68" r="1.5" /><circle cx="76" cy="55" r="2" /></g>
        </svg>
      );
    case "AC-04-B":
      return (
        <svg className={styles.shape} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path className={styles.vesselShadow} d="M18 35c0-13 14-22 33-22s33 9 33 22c0 6-3 10-7 14 1 27-9 40-26 40S24 76 25 49c-4-4-7-8-7-14Z" />
          <path className={styles.vesselBody} d="M16 31c0-13 14-22 34-22s34 9 34 22c0 6-3 10-7 14 1 28-9 42-27 42S22 73 23 45c-4-4-7-8-7-14Z" />
          <ellipse className={styles.vesselRim} cx="50" cy="31" rx="34" ry="18" />
          <ellipse className={styles.vesselWell} cx="50" cy="31" rx="24" ry="10" />
          <path className={styles.vesselLight} d="M28 43c0 24 7 33 17 37" />
          <path className={styles.vesselLip} d="M18 31c7 10 57 10 65 0" />
        </svg>
      );
    case "AC-04-C":
      return (
        <svg className={styles.shape} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path className={styles.sheetShadow} d="m14 26 50-15 25 22-15 56-50-1-13-31Z" />
          <path className={styles.sheetFront} d="m10 23 51-15 26 22-15 56-51-2-13-30Z" />
          <path className={styles.sheetFold} d="m61 8 26 22-31 20-34 36-1-32Z" />
          <path className={styles.sheetReverse} d="m56 50 31-20-15 56-50-1Z" />
          <path className={styles.sheetCrease} d="m61 8-5 42-34 36" />
          <path className={styles.sheetLight} d="m18 29 34-10M28 75l31 1" />
        </svg>
      );
  }
}

export function SpecimenArtwork({
  specimen,
  viewport = "desktop",
  placement = "inline",
  decorative = false,
  className,
}: SpecimenArtworkProps) {
  const classes = [
    styles.artwork,
    placement === "contract" ? styles.contractPlacement : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      style={placement === "contract" ? specimenPlacementStyle(specimen.id, viewport) : undefined}
      data-specimen-id={specimen.id}
      data-specimen-role={specimen.sceneRole}
      data-specimen-silhouette={silhouetteById[specimen.id]}
      data-specimen-material={specimen.material}
      data-specimen-process={specimen.process}
      data-specimen-finish={specimen.finish}
      data-specimen-viewport={viewport}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `${specimen.name}, ${specimen.material}`}
      role={decorative ? undefined : "img"}
    >
      <SpecimenShape id={specimen.id} />
    </div>
  );
}
