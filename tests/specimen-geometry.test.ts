import { describe, expect, it } from "vitest";
import "./specimen-artwork.test.tsx";
import { chapters, type SpecimenId } from "@/data/exhibition";
import {
  SPECIMEN_IDS,
  doesSpecimenAnchorIntersectBox,
  getSpecimen,
  getSpecimenAnchor,
  getSpecimenBox,
  getSpecimenPlacement,
  isPointWithinSpecimenBox,
  specimenPlacementStyle,
} from "@/components/campaign/SpecimenArtwork";

describe("specimen geometry contract", () => {
  it("covers the exact frozen twelve-specimen mapping in catalog order", () => {
    expect(SPECIMEN_IDS).toEqual([
      "AC-01-A", "AC-01-B", "AC-01-C",
      "AC-02-A", "AC-02-B", "AC-02-C",
      "AC-03-A", "AC-03-B", "AC-03-C",
      "AC-04-A", "AC-04-B", "AC-04-C",
    ]);
    expect(SPECIMEN_IDS.map((id) => getSpecimen(id).id)).toEqual(SPECIMEN_IDS);
  });

  it.each(["desktop", "mobile"] as const)("derives %s anchors from frozen hotspot positions", (viewport) => {
    for (const chapter of chapters) {
      for (const hotspot of chapter.hotspots) {
        const id = hotspot.specimenId;
        expect(getSpecimenAnchor(id, viewport)).toEqual(hotspot.position[viewport]);
        expect(getSpecimen(id).id).toBe(id);
      }
    }
  });

  it.each(["desktop", "mobile"] as const)("keeps every %s hotspot anchor inside its specimen box", (viewport) => {
    for (const id of SPECIMEN_IDS) {
      const box = getSpecimenBox(id, viewport);
      const anchor = getSpecimenAnchor(id, viewport);
      const placement = getSpecimenPlacement(id, viewport);

      expect(box.x, `${id} x`).toBeGreaterThanOrEqual(0);
      expect(box.y, `${id} y`).toBeGreaterThanOrEqual(0);
      expect(box.width, `${id} width`).toBeGreaterThan(0);
      expect(box.height, `${id} height`).toBeGreaterThan(0);
      expect(box.x + box.width, `${id} right`).toBeLessThanOrEqual(100);
      expect(box.y + box.height, `${id} bottom`).toBeLessThanOrEqual(100);
      expect(isPointWithinSpecimenBox(anchor, box), `${id} anchor`).toBe(true);
      expect(doesSpecimenAnchorIntersectBox(id, viewport), `${id} intersection`).toBe(true);
      expect(placement).toEqual({ box, anchor });
    }
  });

  it("exports contract-ready percentage styles without hidden viewport math", () => {
    const style = specimenPlacementStyle("AC-03-C" as SpecimenId, "mobile");
    expect(style).toMatchObject({
      "--specimen-box-x": "51%",
      "--specimen-box-y": "20%",
      "--specimen-box-width": "25%",
      "--specimen-box-height": "42%",
    });
  });
});
