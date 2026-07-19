import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { chapters } from "@/data/exhibition";
import { SpecimenArtwork } from "@/components/campaign/SpecimenArtwork";
import { StudyFigure } from "@/components/campaign/StudyFigure";

const specimens = chapters.flatMap((chapter) => chapter.specimens);

describe("shared material specimen artwork", () => {
  it("renders all twelve public-safe specimens with stable catalog and material hooks", () => {
    const markup = renderToStaticMarkup(
      <div>
        {specimens.map((specimen) => <SpecimenArtwork key={specimen.id} specimen={specimen} />)}
      </div>,
    );

    expect(specimens).toHaveLength(12);
    for (const specimen of specimens) {
      expect(markup).toContain(`data-specimen-id="${specimen.id}"`);
      expect(markup).toContain(`data-specimen-role="${specimen.sceneRole}"`);
      expect(markup).toContain(`data-specimen-material="${specimen.material}"`);
      expect(markup).toContain(`data-specimen-process="${specimen.process}"`);
      expect(markup).toContain(`data-specimen-finish="${specimen.finish}"`);
    }
    expect([...markup.matchAll(/data-specimen-silhouette="([^"]+)"/g)].map((match) => match[1])).toHaveLength(12);
    expect(new Set([...markup.matchAll(/data-specimen-silhouette="([^"]+)"/g)].map((match) => match[1])).size).toBe(12);
    expect(markup).not.toMatch(/https?:\/\//);
    expect(markup).not.toContain("<img");
  });

  it("uses a quiet editorial figure rather than card or purchase markup", () => {
    const specimen = specimens[0]!;
    const markup = renderToStaticMarkup(<StudyFigure specimen={specimen} caption="Material translation" />);

    expect(markup).toContain(`data-study-figure="${specimen.id}"`);
    expect(markup).toContain(specimen.name);
    expect(markup).toContain("Material translation");
    expect(markup).not.toMatch(/price|cart|buy|checkout|button/i);
  });
});

describe("single-source material-note copy", () => {
  it("keeps generated compatibility aliases exactly equal to their referenced specimen", () => {
    for (const chapter of chapters) {
      for (const hotspot of chapter.hotspots) {
        const specimen = chapter.specimens.find((entry) => entry.id === hotspot.specimenId);
        expect(specimen, `${chapter.id}/${hotspot.id}`).toBeDefined();
        expect(hotspot.title).toBe(specimen?.name);
        expect(hotspot.note).toBe(specimen?.note);
        expect(hotspot.fact).toBe([specimen?.material, specimen?.process, specimen?.finish].join(" · "));
      }
    }
  });

  it("renders ObjectHotspot copy from MaterialSpecimen rather than compatibility aliases", () => {
    const source = readFileSync(resolve(process.cwd(), "components/exhibition/ObjectHotspot.tsx"), "utf8");

    expect(source).toContain("resolveHotspotSpecimen");
    expect(source).toContain("specimen.name");
    expect(source).toContain("specimen.note");
    expect(source).toContain("specimen.material");
    expect(source).not.toMatch(/hotspot\.(?:title|note|fact)/);
  });
});

describe("test-only gallery boundary", () => {
  it("requires both a development server and the explicit public test flag", () => {
    const source = readFileSync(resolve(process.cwd(), "components/exhibition/SceneArtwork.tsx"), "utf8");

    expect(source).toContain('process.env.NODE_ENV === "development"');
    expect(source).toContain('process.env.NEXT_PUBLIC_CA_TEST_MODE === "1"');
    expect(source).toContain("SpecimenPrimitivesGallery");
  });
});
