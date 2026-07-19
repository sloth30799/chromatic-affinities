import { describe, expect, it } from "vitest";
import {
  campaign,
  campaignData,
  chapters,
  exhibitionDataValidation,
  validateCampaignData,
  validateExhibitionData,
} from "@/data/exhibition";
import {
  CHAPTER_DURATION_MS,
  CUE_ENDPOINTS,
  EXHIBITION_DURATION_MS,
  HANDOFF_DURATION_MS,
} from "@/lib/timeline";

type MutableRecord = Record<string, unknown>;
type MutableCampaignData = { campaign: MutableRecord; chapters: MutableRecord[] };

function cloneCampaignData(): MutableCampaignData {
  return JSON.parse(JSON.stringify(campaignData)) as MutableCampaignData;
}

function firstSpecimens(data: MutableCampaignData): MutableRecord[] {
  return data.chapters[0]?.specimens as MutableRecord[];
}

function firstHotspots(data: MutableCampaignData): MutableRecord[] {
  return data.chapters[0]?.hotspots as MutableRecord[];
}

function campaignErrorsFor(input: unknown): readonly string[] {
  const result = validateCampaignData(input);
  return result.valid ? [] : result.errors;
}

function exhibitionErrorsFor(input: unknown): readonly string[] {
  const result = validateExhibitionData(input);
  return result.valid ? [] : result.errors;
}

function expectCampaignError(input: unknown, expectedError: string): void {
  expect(() => validateCampaignData(input)).not.toThrow();
  expect(campaignErrorsFor(input)).toContain(expectedError);
}

describe("approved Atelier Chromatique campaign data", () => {
  it("closes the campaign naming hierarchy and returns typed valid data", () => {
    expect(exhibitionDataValidation.valid).toBe(true);
    if (!exhibitionDataValidation.valid) throw new Error("Approved campaign data must validate.");
    expect(exhibitionDataValidation.data).toBe(campaignData);
    expect(campaign).toEqual({
      studio: "Atelier Chromatique",
      title: "Chromatic Affinities",
      collectionName: "Material Studies No. 01",
      collectionCode: "Collection 01",
      openingLine: "Four color studies for material worlds.",
      closingLine: "Four studies. Four material worlds. Chromatic Affinities — Collection 01.",
      disclosure: "Self-initiated concept campaign",
    });
    expect(chapters).toHaveLength(4);
    expect(chapters.map((chapter) => [chapter.number, chapter.id, chapter.studyTitle, chapter.feeling])).toEqual([
      ["01", "navy-apricot", "Tidal Aperture", "depth becoming warmth."],
      ["02", "moss-orchid", "Botanical Fluorescence", "organic growth becoming electric."],
      ["03", "ember-glacier", "Thermal Fracture", "velocity meeting stillness."],
      ["04", "cacao-ivory", "Material Fold", "weight becoming refinement."],
    ]);
  });

  it("preserves the exact four accepted chapter relationships", () => {
    expect(chapters.map((chapter) => chapter.scene)).toEqual([
      "navyApricot", "mossOrchid", "emberGlacier", "cacaoIvory",
    ]);
    expect(chapters.map((chapter) => chapter.motionProfile)).toEqual([
      "tidalAperture", "botanicalFluorescence", "thermalFracture", "materialFold",
    ]);
    expect(chapters.map((chapter) => chapter.handoffProfile)).toEqual([
      "liquidToBotanical", "petalToPrism", "prismToPaper", "ensembleReturn",
    ]);
    expect(chapters.map((chapter) => [chapter.from, chapter.to])).toEqual([
      [
        { name: "Midnight Navy", hex: "#071A2D", atmosphere: "Deep ocean · ink · moonlit feathers" },
        { name: "Solar Apricot", hex: "#FFB36B", atmosphere: "Peaches · terracotta · desert candlelight" },
      ],
      [
        { name: "Moss Verdant", hex: "#38523B", atmosphere: "Ferns · lichen · wet stone" },
        { name: "Electric Orchid", hex: "#C377FF", atmosphere: "Amethyst · ultraviolet · twilight haze" },
      ],
      [
        { name: "Vermilion Ember", hex: "#E4472E", atmosphere: "Fire · lacquer · red clay" },
        { name: "Glacier Cyan", hex: "#8FE7F2", atmosphere: "Ice glass · alpine water · winter sky" },
      ],
      [
        { name: "Cacao Earth", hex: "#4A2C24", atmosphere: "Cocoa · walnut · soil · pottery" },
        { name: "Porcelain Ivory", hex: "#F3E8D3", atmosphere: "Shells · handmade paper · pale cloud" },
      ],
    ]);
    expect(chapters.map((chapter) => chapter.dek)).toEqual([
      "Moonlight sinks through ink-blue water, then lifts warm as a fruit held to the sun.",
      "A rain-dark stone learns the syntax of a flower: weight becomes radiance, spore becomes signal.",
      "The ember holds its breath. Heat suspends, edges sharpen, and a red memory turns to lucid ice.",
      "Earth splits gently open: seed, clay, and coffee grounds rise into a pale made thing.",
    ]);
    expect(chapters.map((chapter) => chapter.reducedMotionSummary)).toEqual([
      "Midnight water and solar apricot meet at an iris-like seam; a moon becomes a peach as bubbles cross into warm dust.",
      "Moss and ultraviolet orchid share a botanical seam; a wet stone unfurls into a luminous flower while spores become fluorescent signals.",
      "A vermilion ember brakes into cyan ice at a fractured prism seam; sparks suspend, sharpen, and return as facets.",
      "Cacao earth folds into porcelain ivory; a ribbed pod opens as paper fibers gather into a pale bloom, then all four pairs echo before the return.",
    ]);
  });

  it("contains the exact twelve semantic specimen records", () => {
    expect(chapters.flatMap((chapter) => chapter.specimens)).toEqual([
      { id: "AC-01-A", name: "Cobalt Glaze Tile", material: "porcelain stoneware", process: "high-fired cobalt glaze", finish: "pooled gloss with a beveled wet edge", note: "depth gathers where glaze thickens at the edge.", sceneRole: "hero" },
      { id: "AC-01-B", name: "Tidal Lacquer Panel", material: "aluminum sample panel", process: "layered transparent cobalt lacquer", finish: "mirror gloss with a waterline fade", note: "successive translucent coats turn reflection into apparent depth.", sceneRole: "supporting" },
      { id: "AC-01-C", name: "Solar Mineral Cake", material: "mineral pigment and gum binder", process: "pressed by hand", finish: "dry velvety bloom", note: "warm particulate color softens the glazed field without imitating shine.", sceneRole: "hero" },
      { id: "AC-02-A", name: "Verdant Organza", material: "silk organza", process: "botanical dye bath", finish: "translucent matte with visible warp and weft", note: "layered open weave deepens green without becoming opaque.", sceneRole: "hero" },
      { id: "AC-02-B", name: "Orchid Signal Weave", material: "recycled polyester monofilament", process: "narrow jacquard weave", finish: "fluorescent satin flash", note: "synthetic violet appears only as the filament turns toward light.", sceneRole: "hero" },
      { id: "AC-02-C", name: "Botanical Pigment Vial", material: "waterborne pigment dispersion in glass", process: "milled and decanted", finish: "luminous suspended liquid", note: "settled particles make the boundary between living color and signal visible.", sceneRole: "supporting" },
      { id: "AC-03-A", name: "Vermilion Lacquer Plate", material: "aluminum sample plate", process: "sprayed pigmented lacquer", finish: "heat-saturated mirror gloss", note: "one sharp highlight makes the red surface feel faster than its static support.", sceneRole: "hero" },
      { id: "AC-03-B", name: "Ember Pigment Cast", material: "mineral pigment and wax binder", process: "low-heat cast", finish: "satin crust with molten interior color", note: "broken edges retain the memory of flow after the mass cools.", sceneRole: "supporting" },
      { id: "AC-03-C", name: "Glacier Resin Shard", material: "optically clear cast resin", process: "faceted and polished", finish: "icy transparent gloss", note: "cyan concentrates at thick facets while the center remains almost colorless.", sceneRole: "hero" },
      { id: "AC-04-A", name: "Cacao Clay Body", material: "grogged earthenware", process: "hand-pressed and left unfired", finish: "raw granular tooth", note: "coarse inclusions hold weight at the broken edge.", sceneRole: "hero" },
      { id: "AC-04-B", name: "Porcelain Vessel", material: "kaolin porcelain", process: "slip-cast and high-fired", finish: "translucent glazed lip over a satin body", note: "refinement appears where the thinnest rim begins to transmit light.", sceneRole: "hero" },
      { id: "AC-04-C", name: "Folded Ceramic Sheet", material: "porcelain paperclay", process: "slab-rolled, folded, and fired", finish: "crisp satin crease", note: "fiber reinforcement lets a ceramic surface borrow the memory of paper.", sceneRole: "supporting" },
    ]);
    expect(chapters.map((chapter) => chapter.specimens.filter((specimen) => specimen.sceneRole === "hero").length)).toEqual([2, 2, 2, 2]);
  });

  it("projects every compatibility alias from its mapped specimen and keeps the approved geometry", () => {
    expect(chapters.flatMap((chapter) => chapter.hotspots.map((hotspot) => [hotspot.id, hotspot.specimenId]))).toEqual([
      ["raven-feather", "AC-01-A"], ["night-flower", "AC-01-B"], ["peach-stone", "AC-01-C"],
      ["lichen-map", "AC-02-A"], ["beetle-wing", "AC-02-B"], ["orchid-throat", "AC-02-C"],
      ["poppy", "AC-03-A"], ["koi-scale", "AC-03-B"], ["ice-facet", "AC-03-C"],
      ["cacao-ridge", "AC-04-A"], ["walnut-shell", "AC-04-B"], ["porcelain-edge", "AC-04-C"],
    ]);
    expect(chapters.flatMap((chapter) => chapter.hotspots.map(({ id, position, align, calmWindow }) => ({ id, position, align, calmWindow })))).toEqual([
      { id: "raven-feather", position: { desktop: { x: 18, y: 62 }, mobile: { x: 20, y: 64 } }, align: "left", calmWindow: [0.12, 0.28] },
      { id: "night-flower", position: { desktop: { x: 46, y: 76 }, mobile: { x: 46, y: 72 } }, align: "left", calmWindow: [0.6, 0.74] },
      { id: "peach-stone", position: { desktop: { x: 76, y: 66 }, mobile: { x: 76, y: 64 } }, align: "right", calmWindow: [0.34, 0.52] },
      { id: "lichen-map", position: { desktop: { x: 22, y: 68 }, mobile: { x: 20, y: 70 } }, align: "left", calmWindow: [0.1, 0.26] },
      { id: "beetle-wing", position: { desktop: { x: 71, y: 74 }, mobile: { x: 74, y: 70 } }, align: "right", calmWindow: [0.62, 0.76] },
      { id: "orchid-throat", position: { desktop: { x: 52, y: 40 }, mobile: { x: 52, y: 42 } }, align: "right", calmWindow: [0.36, 0.54] },
      { id: "poppy", position: { desktop: { x: 20, y: 70 }, mobile: { x: 18, y: 68 } }, align: "left", calmWindow: [0.1, 0.26] },
      { id: "koi-scale", position: { desktop: { x: 43, y: 69 }, mobile: { x: 43, y: 68 } }, align: "left", calmWindow: [0.6, 0.74] },
      { id: "ice-facet", position: { desktop: { x: 61, y: 36 }, mobile: { x: 62, y: 40 } }, align: "right", calmWindow: [0.34, 0.54] },
      { id: "cacao-ridge", position: { desktop: { x: 22, y: 70 }, mobile: { x: 20, y: 68 } }, align: "left", calmWindow: [0.12, 0.28] },
      { id: "walnut-shell", position: { desktop: { x: 72, y: 72 }, mobile: { x: 75, y: 70 } }, align: "right", calmWindow: [0.58, 0.74] },
      { id: "porcelain-edge", position: { desktop: { x: 53, y: 37 }, mobile: { x: 53, y: 40 } }, align: "right", calmWindow: [0.34, 0.54] },
    ]);
    for (const chapter of chapters) {
      for (const hotspot of chapter.hotspots) {
        const specimen = chapter.specimens.find((entry) => entry.id === hotspot.specimenId);
        expect(specimen).toBeDefined();
        expect([hotspot.title, hotspot.note, hotspot.fact]).toEqual([
          specimen?.name,
          specimen?.note,
          [specimen?.material, specimen?.process, specimen?.finish].join(" · "),
        ]);
      }
    }
  });

  it("uses the shared twelve-second motion contract", () => {
    expect(CHAPTER_DURATION_MS).toBe(12_000);
    expect(EXHIBITION_DURATION_MS).toBe(48_000);
    expect(HANDOFF_DURATION_MS).toBe(1_920);
    expect(chapters.every((chapter) => chapter.durationMs === CHAPTER_DURATION_MS)).toBe(true);
    expect(chapters.map((chapter) => chapter.cues)).toEqual([
      { ...CUE_ENDPOINTS, easings: { build: "liquidRise", collision: "liquidRise", fusion: "softInOut", restore: "softInOut", handoff: "softInOut" } },
      { ...CUE_ENDPOINTS, easings: { build: "softInOut", collision: "petalSnap", fusion: "softInOut", restore: "petalSnap", handoff: "softInOut" } },
      { ...CUE_ENDPOINTS, easings: { build: "thermalBrake", collision: "thermalBrake", fusion: "softInOut", restore: "thermalBrake", handoff: "softInOut" } },
      { ...CUE_ENDPOINTS, easings: { build: "paperFold", collision: "paperFold", fusion: "softInOut", restore: "paperFold", handoff: "softInOut" } },
    ]);
  });
});

describe("campaign data validation", () => {
  it.each([
    ["missing campaign root", undefined, "campaign"],
    ["primitive campaign", { campaign: "Atelier Chromatique", chapters }, "campaign"],
    ["missing campaign field", (() => { const data = cloneCampaignData(); delete data.campaign.title; return data; })(), "campaign"],
    ["incorrect campaign literal", (() => { const data = cloneCampaignData(); data.campaign.disclosure = "real client"; return data; })(), "campaign"],
    ["wrong chapter count", { campaign, chapters: chapters.slice(0, 3) }, "chapter-count"],
    ["wrong chapter relation", (() => { const data = cloneCampaignData(); data.chapters[0]!.scene = "mossOrchid"; return data; })(), "chapter"],
    ["wrong duration", (() => { const data = cloneCampaignData(); data.chapters[0]!.durationMs = CHAPTER_DURATION_MS - 1; return data; })(), "duration"],
    ["wrong total duration", (() => { const data = cloneCampaignData(); data.chapters[0]!.durationMs = CHAPTER_DURATION_MS - 1; return data; })(), "total-duration"],
    ["wrong world text", (() => { const data = cloneCampaignData(); (data.chapters[0]!.from as MutableRecord).atmosphere = ""; return data; })(), "world"],
    ["lowercase hex", (() => { const data = cloneCampaignData(); (data.chapters[0]!.from as MutableRecord).hex = "#071a2d"; return data; })(), "hex"],
    ["wrong content", (() => { const data = cloneCampaignData(); data.chapters[0]!.studyTitle = ""; return data; })(), "content"],
    ["wrong summary", (() => { const data = cloneCampaignData(); data.chapters[0]!.reducedMotionSummary = " "; return data; })(), "summary"],
    ["wrong cue", (() => { const data = cloneCampaignData(); (data.chapters[0]!.cues as MutableRecord).restoreEnd = 0.92; return data; })(), "cues"],
    ["wrong easing", (() => { const data = cloneCampaignData(); ((data.chapters[0]!.cues as MutableRecord).easings as MutableRecord).build = "unsupported"; return data; })(), "easing"],
    ["wrong specimen literal", (() => { const data = cloneCampaignData(); firstSpecimens(data)[0]!.material = ""; return data; })(), "specimen"],
    ["wrong role", (() => { const data = cloneCampaignData(); firstSpecimens(data)[0]!.sceneRole = "supporting"; return data; })(), "role"],
    ["wrong hotspot alignment", (() => { const data = cloneCampaignData(); firstHotspots(data)[0]!.align = "center"; return data; })(), "hotspot"],
    ["wrong specimen mapping", (() => { const data = cloneCampaignData(); firstHotspots(data)[0]!.specimenId = "AC-02-A"; return data; })(), "mapping"],
    ["wrong hotspot coordinate", (() => { const data = cloneCampaignData(); ((firstHotspots(data)[0]!.position as MutableRecord).desktop as MutableRecord).x = 19; return data; })(), "position"],
    ["wrong calm window", (() => { const data = cloneCampaignData(); firstHotspots(data)[0]!.calmWindow = [0.12, 0.3]; return data; })(), "calm-window"],
  ])("reports %s as %s", (_name, input, expectedError) => {
    expect(campaignErrorsFor(input)).toContain(expectedError);
  });

  it.each([
    ["chapter id", (data: MutableCampaignData) => { data.chapters[1]!.id = data.chapters[0]!.id; }, "duplicate-chapter-id"],
    ["scene", (data: MutableCampaignData) => { data.chapters[1]!.scene = data.chapters[0]!.scene; }, "duplicate-scene"],
    ["motion profile", (data: MutableCampaignData) => { data.chapters[1]!.motionProfile = data.chapters[0]!.motionProfile; }, "duplicate-motion-profile"],
    ["handoff profile", (data: MutableCampaignData) => { data.chapters[1]!.handoffProfile = data.chapters[0]!.handoffProfile; }, "duplicate-handoff-profile"],
    ["hotspot id", (data: MutableCampaignData) => { firstHotspots(data)[1]!.id = firstHotspots(data)[0]!.id; }, "duplicate-hotspot-id"],
  ])("retains the v4 duplicate code for %s", (_name, mutate, expectedError) => {
    const data = cloneCampaignData();
    mutate(data);
    expect(campaignErrorsFor(data)).toContain(expectedError);
  });

  it("checks every authored primitive field, including nested records and tuples", () => {
    const mutations: Array<[string, () => unknown, string]> = [
      ...Object.keys(campaign).map((field) => [
        `campaign.${field}`,
        () => { const data = cloneCampaignData(); data.campaign[field] = ""; return data; },
        "campaign",
      ] as [string, () => unknown, string]),
      ...["number", "id", "scene", "motionProfile", "handoffProfile"].map((field) => [
        `chapter.${field}`,
        () => { const data = cloneCampaignData(); data.chapters[0]![field] = "wrong"; return data; },
        "chapter",
      ] as [string, () => unknown, string]),
      ...["name", "atmosphere"].flatMap((field) => ["from", "to"].map((world) => [
        `${world}.${field}`,
        () => { const data = cloneCampaignData(); ((data.chapters[0]![world] as MutableRecord)[field]) = ""; return data; },
        "world",
      ] as [string, () => unknown, string])),
      ...["transformation", "dek", "studyTitle", "feeling"].map((field) => [
        `content.${field}`,
        () => { const data = cloneCampaignData(); data.chapters[0]![field] = ""; return data; },
        "content",
      ] as [string, () => unknown, string]),
      ...["id", "name", "material", "process", "finish", "note"].map((field) => [
        `specimen.${field}`,
        () => { const data = cloneCampaignData(); firstSpecimens(data)[0]![field] = ""; return data; },
        "specimen",
      ] as [string, () => unknown, string]),
      ...["title", "note", "fact"].map((field) => [
        `hotspot.${field}`,
        () => { const data = cloneCampaignData(); firstHotspots(data)[0]![field] = ""; return data; },
        "hotspot",
      ] as [string, () => unknown, string]),
    ];

    for (const [name, createInput, expectedError] of mutations) {
      expect(campaignErrorsFor(createInput()), name).toContain(expectedError);
    }
  });

  it.each([
    ["root", () => { const data = cloneCampaignData() as MutableRecord; data.extra = true; return data; }, "campaign"],
    ["campaign", () => { const data = cloneCampaignData(); data.campaign.extra = true; return data; }, "campaign"],
    ["chapter", () => { const data = cloneCampaignData(); data.chapters[0]!.extra = true; return data; }, "chapter"],
    ["world", () => { const data = cloneCampaignData(); (data.chapters[0]!.from as MutableRecord).extra = true; return data; }, "world"],
    ["cue", () => { const data = cloneCampaignData(); (data.chapters[0]!.cues as MutableRecord).extra = true; return data; }, "cues"],
    ["easing", () => { const data = cloneCampaignData(); ((data.chapters[0]!.cues as MutableRecord).easings as MutableRecord).extra = true; return data; }, "easing"],
    ["specimen", () => { const data = cloneCampaignData(); firstSpecimens(data)[0]!.extra = true; return data; }, "specimen"],
    ["hotspot", () => { const data = cloneCampaignData(); firstHotspots(data)[0]!.extra = true; return data; }, "hotspot"],
    ["position", () => { const data = cloneCampaignData(); (firstHotspots(data)[0]!.position as MutableRecord).extra = true; return data; }, "position"],
    ["desktop point", () => { const data = cloneCampaignData(); ((firstHotspots(data)[0]!.position as MutableRecord).desktop as MutableRecord).extra = true; return data; }, "position"],
    ["mobile point", () => { const data = cloneCampaignData(); ((firstHotspots(data)[0]!.position as MutableRecord).mobile as MutableRecord).extra = true; return data; }, "position"],
  ])("rejects an unknown %s key", (_name, createInput, expectedError) => {
    expectCampaignError(createInput(), expectedError);
  });

  it("rejects a same-chapter hotspot specimen permutation even when aliases are regenerated", () => {
    const data = cloneCampaignData();
    const specimens = firstSpecimens(data);
    const hotspots = firstHotspots(data);
    const assignSpecimen = (hotspot: MutableRecord, specimen: MutableRecord) => {
      hotspot.specimenId = specimen.id;
      hotspot.title = specimen.name;
      hotspot.note = specimen.note;
      hotspot.fact = [specimen.material, specimen.process, specimen.finish].join(" · ");
    };
    assignSpecimen(hotspots[0]!, specimens[1]!);
    assignSpecimen(hotspots[1]!, specimens[0]!);

    expectCampaignError(data, "mapping");
  });

  it("rejects an otherwise approved hotspot alignment flip", () => {
    const data = cloneCampaignData();
    firstHotspots(data)[0]!.align = "right";

    expectCampaignError(data, "hotspot");
  });

  it("rejects every required tuple or array length", () => {
    const cases: Array<[string, () => unknown, string]> = [
      ["short chapters", () => { const data = cloneCampaignData(); data.chapters.pop(); return data; }, "chapter-count"],
      ["long chapters", () => { const data = cloneCampaignData(); data.chapters.push({}); return data; }, "chapter-count"],
      ["short specimens", () => { const data = cloneCampaignData(); firstSpecimens(data).pop(); return data; }, "specimen"],
      ["long specimens", () => { const data = cloneCampaignData(); firstSpecimens(data).push({}); return data; }, "specimen"],
      ["short hotspots", () => { const data = cloneCampaignData(); firstHotspots(data).pop(); return data; }, "hotspot"],
      ["long hotspots", () => { const data = cloneCampaignData(); firstHotspots(data).push({}); return data; }, "hotspot"],
      ["short calm window", () => { const data = cloneCampaignData(); firstHotspots(data)[0]!.calmWindow = [0.12]; return data; }, "calm-window"],
      ["long calm window", () => { const data = cloneCampaignData(); firstHotspots(data)[0]!.calmWindow = [0.12, 0.28, 1]; return data; }, "calm-window"],
    ];
    for (const [name, createInput, expectedError] of cases) {
      expect(() => validateCampaignData(createInput()), name).not.toThrow();
      expect(campaignErrorsFor(createInput()), name).toContain(expectedError);
    }
  });

  it("rejects every cue, easing, and responsive point slot", () => {
    for (const cue of Object.keys(CUE_ENDPOINTS)) {
      const data = cloneCampaignData();
      (data.chapters[0]!.cues as MutableRecord)[cue] = 0;
      expectCampaignError(data, "cues");
    }
    for (const easing of ["build", "collision", "fusion", "restore", "handoff"]) {
      const data = cloneCampaignData();
      ((data.chapters[0]!.cues as MutableRecord).easings as MutableRecord)[easing] = "linear";
      expectCampaignError(data, "easing");
    }
    for (const breakpoint of ["desktop", "mobile"]) {
      for (const coordinate of ["x", "y"]) {
        const data = cloneCampaignData();
        const point = (firstHotspots(data)[0]!.position as MutableRecord)[breakpoint] as MutableRecord;
        point[coordinate] = (point[coordinate] as number) + 1;
        expectCampaignError(data, "position");
      }
    }
  });

  it("is nonthrowing for malformed primitives, arrays, nested objects, and tuple values", () => {
    const malformed: unknown[] = [
      null,
      undefined,
      true,
      1,
      "campaign",
      [],
      {},
      { campaign, chapters: null },
      { campaign, chapters: [null, {}, [], "chapter"] },
      (() => { const data = cloneCampaignData(); data.chapters[0]!.from = null; return data; })(),
      (() => { const data = cloneCampaignData(); data.chapters[0]!.cues = []; return data; })(),
      (() => { const data = cloneCampaignData(); data.chapters[0]!.specimens = [{}, {}, {}]; return data; })(),
      (() => { const data = cloneCampaignData(); data.chapters[0]!.hotspots = [{ position: { desktop: null, mobile: [] }, calmWindow: [0, null] }]; return data; })(),
      (() => { const data = cloneCampaignData(); data.chapters[0]!.from = { name: null, hex: [], atmosphere: {} }; return data; })(),
      (() => { const data = cloneCampaignData(); data.chapters[0]!.cues = { easings: null }; return data; })(),
      (() => { const data = cloneCampaignData(); firstHotspots(data)[0]!.position = { desktop: { x: null, y: {} }, mobile: null }; return data; })(),
    ];
    for (const input of malformed) expect(() => validateCampaignData(input)).not.toThrow();
  });

  it("keeps the v4 array validator available for the intermediate application", () => {
    expect(validateExhibitionData(chapters).valid).toBe(true);
    const mutatedChapters = chapters.map((chapter, index) => index === 0
      ? { ...chapter, hotspots: [{ ...chapter.hotspots[0], id: chapters[1]!.hotspots[0].id }, ...chapter.hotspots.slice(1)] }
      : chapter);
    expect(exhibitionErrorsFor(mutatedChapters)).toContain("duplicate-hotspot-id");
  });
});
