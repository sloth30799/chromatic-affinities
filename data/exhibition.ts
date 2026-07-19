import {
  CUE_ENDPOINTS,
  CHAPTER_DURATION_MS,
  EXHIBITION_DURATION_MS,
  isSupportedEasing,
  type EasingId,
} from "@/lib/timeline";
import type { MotionValue } from "motion/react";

export type SceneKind = "navyApricot" | "mossOrchid" | "emberGlacier" | "cacaoIvory";
export type MotionProfile = "tidalAperture" | "botanicalFluorescence" | "thermalFracture" | "materialFold";
export type HandoffProfile = "liquidToBotanical" | "petalToPrism" | "prismToPaper" | "ensembleReturn";
export type HotspotId =
  | "raven-feather" | "night-flower" | "peach-stone"
  | "lichen-map" | "beetle-wing" | "orchid-throat"
  | "poppy" | "koi-scale" | "ice-facet"
  | "cacao-ridge" | "walnut-shell" | "porcelain-edge";
export type SpecimenId =
  | "AC-01-A" | "AC-01-B" | "AC-01-C"
  | "AC-02-A" | "AC-02-B" | "AC-02-C"
  | "AC-03-A" | "AC-03-B" | "AC-03-C"
  | "AC-04-A" | "AC-04-B" | "AC-04-C";

export type Campaign = {
  readonly studio: "Atelier Chromatique";
  readonly title: "Chromatic Affinities";
  readonly collectionName: "Material Studies No. 01";
  readonly collectionCode: "Collection 01";
  readonly openingLine: "Four color studies for material worlds.";
  readonly closingLine: "Four studies. Four material worlds. Chromatic Affinities — Collection 01.";
  readonly disclosure: "Self-initiated concept campaign";
};

export type MaterialSpecimen = {
  readonly id: SpecimenId;
  readonly name: string;
  readonly material: string;
  readonly process: string;
  readonly finish: string;
  readonly note: string;
  readonly sceneRole: "hero" | "supporting";
};

export type World = {
  readonly name: string;
  readonly hex: string;
  readonly atmosphere: string;
};

export type MotionCueConfig = {
  readonly establishEnd: number;
  readonly buildEnd: number;
  readonly collisionEnd: number;
  readonly fusionEnd: number;
  readonly restoreEnd: number;
  readonly handoffEnd: 1;
  readonly easings: {
    readonly build: EasingId;
    readonly collision: EasingId;
    readonly fusion: EasingId;
    readonly restore: EasingId;
    readonly handoff: EasingId;
  };
};

export type ResponsivePoint = {
  readonly desktop: { readonly x: number; readonly y: number };
  readonly mobile: { readonly x: number; readonly y: number };
};

export type Hotspot = {
  readonly id: HotspotId;
  readonly specimenId: SpecimenId;
  /** Compatibility aliases projected from the referenced specimen. */
  readonly title: string;
  readonly note: string;
  readonly fact: string;
  readonly position: ResponsivePoint;
  readonly align: "left" | "right";
  readonly calmWindow: readonly [number, number];
};

export type Chapter = {
  readonly number: string;
  readonly id: string;
  readonly scene: SceneKind;
  readonly motionProfile: MotionProfile;
  readonly durationMs: typeof CHAPTER_DURATION_MS;
  readonly cues: MotionCueConfig;
  readonly handoffProfile: HandoffProfile;
  readonly from: World;
  readonly to: World;
  readonly transformation: string;
  readonly dek: string;
  readonly reducedMotionSummary: string;
  readonly studyTitle: string;
  readonly feeling: string;
  readonly specimens: readonly [MaterialSpecimen, MaterialSpecimen, MaterialSpecimen];
  readonly hotspots: readonly [Hotspot, Hotspot, Hotspot];
};

export type CampaignData = {
  readonly campaign: Campaign;
  readonly chapters: readonly [Chapter, Chapter, Chapter, Chapter];
};

export type TransitionDescriptor = {
  readonly profile: HandoffProfile;
  readonly currentChapterId: string;
  readonly nextChapterId: string;
  readonly currentLeft: World;
  readonly currentRight: World;
  readonly nextLeft: World;
  readonly nextRight: World;
};

export type HandoffRendererProps = {
  readonly descriptor: TransitionDescriptor;
  readonly progress: MotionValue<number>;
  readonly resetRevision: number;
};

export type CampaignDataErrorCode =
  | "chapter-count"
  | "duration"
  | "total-duration"
  | "duplicate-chapter-id"
  | "duplicate-hotspot-id"
  | "duplicate-scene"
  | "duplicate-motion-profile"
  | "duplicate-handoff-profile"
  | "hex"
  | "position"
  | "calm-window"
  | "summary"
  | "cues"
  | "easing"
  | "campaign"
  | "chapter"
  | "world"
  | "content"
  | "specimen"
  | "role"
  | "hotspot"
  | "mapping";

export type CampaignDataValidationResult =
  | { readonly valid: true; readonly data: CampaignData; readonly errors: readonly [] }
  | { readonly valid: false; readonly errors: readonly CampaignDataErrorCode[] };

/** @deprecated Use CampaignDataErrorCode. */
export type ExhibitionDataErrorCode = CampaignDataErrorCode;
/** @deprecated Use CampaignDataValidationResult. */
export type ExhibitionDataValidationResult = CampaignDataValidationResult;

export const exhibitionTitle = "Chromatic Affinities";
export const exhibitionIntro =
  "A fullscreen interactive exhibition exploring four pairs of colors as eight interconnected worlds.";

const approvedCampaign = {
  studio: "Atelier Chromatique",
  title: "Chromatic Affinities",
  collectionName: "Material Studies No. 01",
  collectionCode: "Collection 01",
  openingLine: "Four color studies for material worlds.",
  closingLine: "Four studies. Four material worlds. Chromatic Affinities — Collection 01.",
  disclosure: "Self-initiated concept campaign",
} as const satisfies Campaign;

const sharedCueEnds = CUE_ENDPOINTS;

const FACT_SEPARATOR = " · ";

function specimenFact(specimen: MaterialSpecimen): string {
  return [specimen.material, specimen.process, specimen.finish].join(FACT_SEPARATOR);
}

function createHotspot(
  id: HotspotId,
  specimen: MaterialSpecimen,
  position: ResponsivePoint,
  align: Hotspot["align"],
  calmWindow: Hotspot["calmWindow"],
): Hotspot {
  return {
    id,
    specimenId: specimen.id,
    title: specimen.name,
    note: specimen.note,
    fact: specimenFact(specimen),
    position,
    align,
    calmWindow,
  };
}

const chapter01Specimens = [
  {
    id: "AC-01-A",
    name: "Cobalt Glaze Tile",
    material: "porcelain stoneware",
    process: "high-fired cobalt glaze",
    finish: "pooled gloss with a beveled wet edge",
    note: "depth gathers where glaze thickens at the edge.",
    sceneRole: "hero",
  },
  {
    id: "AC-01-B",
    name: "Tidal Lacquer Panel",
    material: "aluminum sample panel",
    process: "layered transparent cobalt lacquer",
    finish: "mirror gloss with a waterline fade",
    note: "successive translucent coats turn reflection into apparent depth.",
    sceneRole: "supporting",
  },
  {
    id: "AC-01-C",
    name: "Solar Mineral Cake",
    material: "mineral pigment and gum binder",
    process: "pressed by hand",
    finish: "dry velvety bloom",
    note: "warm particulate color softens the glazed field without imitating shine.",
    sceneRole: "hero",
  },
] as const satisfies readonly [MaterialSpecimen, MaterialSpecimen, MaterialSpecimen];

const chapter02Specimens = [
  {
    id: "AC-02-A",
    name: "Verdant Organza",
    material: "silk organza",
    process: "botanical dye bath",
    finish: "translucent matte with visible warp and weft",
    note: "layered open weave deepens green without becoming opaque.",
    sceneRole: "hero",
  },
  {
    id: "AC-02-B",
    name: "Orchid Signal Weave",
    material: "recycled polyester monofilament",
    process: "narrow jacquard weave",
    finish: "fluorescent satin flash",
    note: "synthetic violet appears only as the filament turns toward light.",
    sceneRole: "hero",
  },
  {
    id: "AC-02-C",
    name: "Botanical Pigment Vial",
    material: "waterborne pigment dispersion in glass",
    process: "milled and decanted",
    finish: "luminous suspended liquid",
    note: "settled particles make the boundary between living color and signal visible.",
    sceneRole: "supporting",
  },
] as const satisfies readonly [MaterialSpecimen, MaterialSpecimen, MaterialSpecimen];

const chapter03Specimens = [
  {
    id: "AC-03-A",
    name: "Vermilion Lacquer Plate",
    material: "aluminum sample plate",
    process: "sprayed pigmented lacquer",
    finish: "heat-saturated mirror gloss",
    note: "one sharp highlight makes the red surface feel faster than its static support.",
    sceneRole: "hero",
  },
  {
    id: "AC-03-B",
    name: "Ember Pigment Cast",
    material: "mineral pigment and wax binder",
    process: "low-heat cast",
    finish: "satin crust with molten interior color",
    note: "broken edges retain the memory of flow after the mass cools.",
    sceneRole: "supporting",
  },
  {
    id: "AC-03-C",
    name: "Glacier Resin Shard",
    material: "optically clear cast resin",
    process: "faceted and polished",
    finish: "icy transparent gloss",
    note: "cyan concentrates at thick facets while the center remains almost colorless.",
    sceneRole: "hero",
  },
] as const satisfies readonly [MaterialSpecimen, MaterialSpecimen, MaterialSpecimen];

const chapter04Specimens = [
  {
    id: "AC-04-A",
    name: "Cacao Clay Body",
    material: "grogged earthenware",
    process: "hand-pressed and left unfired",
    finish: "raw granular tooth",
    note: "coarse inclusions hold weight at the broken edge.",
    sceneRole: "hero",
  },
  {
    id: "AC-04-B",
    name: "Porcelain Vessel",
    material: "kaolin porcelain",
    process: "slip-cast and high-fired",
    finish: "translucent glazed lip over a satin body",
    note: "refinement appears where the thinnest rim begins to transmit light.",
    sceneRole: "hero",
  },
  {
    id: "AC-04-C",
    name: "Folded Ceramic Sheet",
    material: "porcelain paperclay",
    process: "slab-rolled, folded, and fired",
    finish: "crisp satin crease",
    note: "fiber reinforcement lets a ceramic surface borrow the memory of paper.",
    sceneRole: "supporting",
  },
] as const satisfies readonly [MaterialSpecimen, MaterialSpecimen, MaterialSpecimen];

const approvedChapters = [
  {
    number: "01",
    id: "navy-apricot",
    scene: "navyApricot",
    motionProfile: "tidalAperture",
    durationMs: CHAPTER_DURATION_MS,
    cues: {
      ...sharedCueEnds,
      easings: { build: "liquidRise", collision: "liquidRise", fusion: "softInOut", restore: "softInOut", handoff: "softInOut" },
    },
    handoffProfile: "liquidToBotanical",
    from: { name: "Midnight Navy", hex: "#071A2D", atmosphere: "Deep ocean · ink · moonlit feathers" },
    to: { name: "Solar Apricot", hex: "#FFB36B", atmosphere: "Peaches · terracotta · desert candlelight" },
    transformation: "underwater moon / peach sun",
    dek: "Moonlight sinks through ink-blue water, then lifts warm as a fruit held to the sun.",
    reducedMotionSummary: "Midnight water and solar apricot meet at an iris-like seam; a moon becomes a peach as bubbles cross into warm dust.",
    studyTitle: "Tidal Aperture",
    feeling: "depth becoming warmth.",
    specimens: chapter01Specimens,
    hotspots: [
      createHotspot("raven-feather", chapter01Specimens[0], { desktop: { x: 18, y: 62 }, mobile: { x: 20, y: 64 } }, "left", [0.12, 0.28]),
      createHotspot("night-flower", chapter01Specimens[1], { desktop: { x: 46, y: 76 }, mobile: { x: 46, y: 72 } }, "left", [0.6, 0.74]),
      createHotspot("peach-stone", chapter01Specimens[2], { desktop: { x: 76, y: 66 }, mobile: { x: 76, y: 64 } }, "right", [0.34, 0.52]),
    ],
  },
  {
    number: "02",
    id: "moss-orchid",
    scene: "mossOrchid",
    motionProfile: "botanicalFluorescence",
    durationMs: CHAPTER_DURATION_MS,
    cues: {
      ...sharedCueEnds,
      easings: { build: "softInOut", collision: "petalSnap", fusion: "softInOut", restore: "petalSnap", handoff: "softInOut" },
    },
    handoffProfile: "petalToPrism",
    from: { name: "Moss Verdant", hex: "#38523B", atmosphere: "Ferns · lichen · wet stone" },
    to: { name: "Electric Orchid", hex: "#C377FF", atmosphere: "Amethyst · ultraviolet · twilight haze" },
    transformation: "moss stone / orchid",
    dek: "A rain-dark stone learns the syntax of a flower: weight becomes radiance, spore becomes signal.",
    reducedMotionSummary: "Moss and ultraviolet orchid share a botanical seam; a wet stone unfurls into a luminous flower while spores become fluorescent signals.",
    studyTitle: "Botanical Fluorescence",
    feeling: "organic growth becoming electric.",
    specimens: chapter02Specimens,
    hotspots: [
      createHotspot("lichen-map", chapter02Specimens[0], { desktop: { x: 22, y: 68 }, mobile: { x: 20, y: 70 } }, "left", [0.1, 0.26]),
      createHotspot("beetle-wing", chapter02Specimens[1], { desktop: { x: 71, y: 74 }, mobile: { x: 74, y: 70 } }, "right", [0.62, 0.76]),
      createHotspot("orchid-throat", chapter02Specimens[2], { desktop: { x: 52, y: 40 }, mobile: { x: 52, y: 42 } }, "right", [0.36, 0.54]),
    ],
  },
  {
    number: "03",
    id: "ember-glacier",
    scene: "emberGlacier",
    motionProfile: "thermalFracture",
    durationMs: CHAPTER_DURATION_MS,
    cues: {
      ...sharedCueEnds,
      easings: { build: "thermalBrake", collision: "thermalBrake", fusion: "softInOut", restore: "thermalBrake", handoff: "softInOut" },
    },
    handoffProfile: "prismToPaper",
    from: { name: "Vermilion Ember", hex: "#E4472E", atmosphere: "Fire · lacquer · red clay" },
    to: { name: "Glacier Cyan", hex: "#8FE7F2", atmosphere: "Ice glass · alpine water · winter sky" },
    transformation: "ember / ice crystal",
    dek: "The ember holds its breath. Heat suspends, edges sharpen, and a red memory turns to lucid ice.",
    reducedMotionSummary: "A vermilion ember brakes into cyan ice at a fractured prism seam; sparks suspend, sharpen, and return as facets.",
    studyTitle: "Thermal Fracture",
    feeling: "velocity meeting stillness.",
    specimens: chapter03Specimens,
    hotspots: [
      createHotspot("poppy", chapter03Specimens[0], { desktop: { x: 20, y: 70 }, mobile: { x: 18, y: 68 } }, "left", [0.1, 0.26]),
      createHotspot("koi-scale", chapter03Specimens[1], { desktop: { x: 43, y: 69 }, mobile: { x: 43, y: 68 } }, "left", [0.6, 0.74]),
      createHotspot("ice-facet", chapter03Specimens[2], { desktop: { x: 61, y: 36 }, mobile: { x: 62, y: 40 } }, "right", [0.34, 0.54]),
    ],
  },
  {
    number: "04",
    id: "cacao-ivory",
    scene: "cacaoIvory",
    motionProfile: "materialFold",
    durationMs: CHAPTER_DURATION_MS,
    cues: {
      ...sharedCueEnds,
      easings: { build: "paperFold", collision: "paperFold", fusion: "softInOut", restore: "paperFold", handoff: "softInOut" },
    },
    handoffProfile: "ensembleReturn",
    from: { name: "Cacao Earth", hex: "#4A2C24", atmosphere: "Cocoa · walnut · soil · pottery" },
    to: { name: "Porcelain Ivory", hex: "#F3E8D3", atmosphere: "Shells · handmade paper · pale cloud" },
    transformation: "cacao pod / porcelain bloom",
    dek: "Earth splits gently open: seed, clay, and coffee grounds rise into a pale made thing.",
    reducedMotionSummary: "Cacao earth folds into porcelain ivory; a ribbed pod opens as paper fibers gather into a pale bloom, then all four pairs echo before the return.",
    studyTitle: "Material Fold",
    feeling: "weight becoming refinement.",
    specimens: chapter04Specimens,
    hotspots: [
      createHotspot("cacao-ridge", chapter04Specimens[0], { desktop: { x: 22, y: 70 }, mobile: { x: 20, y: 68 } }, "left", [0.12, 0.28]),
      createHotspot("walnut-shell", chapter04Specimens[1], { desktop: { x: 72, y: 72 }, mobile: { x: 75, y: 70 } }, "right", [0.58, 0.74]),
      createHotspot("porcelain-edge", chapter04Specimens[2], { desktop: { x: 53, y: 37 }, mobile: { x: 53, y: 40 } }, "right", [0.34, 0.54]),
    ],
  },
] as const satisfies readonly [Chapter, Chapter, Chapter, Chapter];

export const campaign: Campaign = approvedCampaign;
export const chapters: CampaignData["chapters"] = approvedChapters;
export const campaignData = { campaign, chapters } as const satisfies CampaignData;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHex(value: unknown): boolean {
  return typeof value === "string" && /^#[0-9A-F]{6}$/.test(value);
}

function isPercentage(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function isProgress(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function hasDuplicate(values: readonly unknown[]): boolean {
  const known = values.filter((value): value is string => typeof value === "string");
  return new Set(known).size !== known.length;
}

function hasExactKeys(value: unknown, expected: object): boolean {
  if (!isRecord(value)) return false;
  const actualKeys = Object.keys(value);
  const expectedKeys = Object.keys(expected);
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key) => Object.prototype.hasOwnProperty.call(expected, key));
}

function isExactRecord(value: unknown, expected: object): boolean {
  return isRecord(value) && hasExactKeys(value, expected)
    && Object.entries(expected).every(([key, expectedValue]) => value[key] === expectedValue);
}

function matchesResponsivePoint(value: unknown, expected: ResponsivePoint): boolean {
  if (!isRecord(value) || !isRecord(value.desktop) || !isRecord(value.mobile)
    || !hasExactKeys(value, expected) || !hasExactKeys(value.desktop, expected.desktop)
    || !hasExactKeys(value.mobile, expected.mobile)) return false;
  return value.desktop.x === expected.desktop.x && value.desktop.y === expected.desktop.y
    && value.mobile.x === expected.mobile.x && value.mobile.y === expected.mobile.y;
}

function validateCueConfig(cues: unknown, expected: MotionCueConfig): CampaignDataErrorCode[] {
  if (!isRecord(cues)) return ["cues", "easing"];
  const endpoints = [
    cues.establishEnd,
    cues.buildEnd,
    cues.collisionEnd,
    cues.fusionEnd,
    cues.restoreEnd,
    cues.handoffEnd,
  ];
  let previousEndpoint = -1;
  let cueError = !hasExactKeys(cues, expected) || cues.handoffEnd !== 1;
  for (const endpoint of endpoints) {
    if (!isProgress(endpoint) || endpoint <= previousEndpoint) {
      cueError = true;
      break;
    }
    previousEndpoint = endpoint;
  }
  const exactEndpoints = [
    "establishEnd",
    "buildEnd",
    "collisionEnd",
    "fusionEnd",
    "restoreEnd",
    "handoffEnd",
  ] as const;
  if (exactEndpoints.some((key) => cues[key] !== expected[key])) cueError = true;

  const easings = cues.easings;
  const easingKeys = ["build", "collision", "fusion", "restore", "handoff"] as const;
  const easingError = !isRecord(easings) || !hasExactKeys(easings, expected.easings)
    || easingKeys.some((key) => !isSupportedEasing(easings[key]) || easings[key] !== expected.easings[key]);
  return [
    ...(cueError ? ["cues" as const] : []),
    ...(easingError ? ["easing" as const] : []),
  ];
}

function validateWorld(value: unknown, expected: World, errors: Set<CampaignDataErrorCode>): void {
  if (!isRecord(value)) {
    errors.add("world");
    errors.add("hex");
    return;
  }
  if (!isHex(value.hex) || value.hex !== expected.hex) errors.add("hex");
  if (!isExactRecord(value, expected)) errors.add("world");
}

function validateSpecimens(
  value: unknown,
  expected: Chapter["specimens"],
  chapterIndex: number,
  errors: Set<CampaignDataErrorCode>,
  catalogIds: unknown[],
): readonly Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length !== 3) {
    errors.add("specimen");
    errors.add("role");
    return [];
  }

  const specimens: Record<string, unknown>[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const specimen = value[index];
    const contract = expected[index];
    if (!isRecord(specimen) || !contract) {
      errors.add("specimen");
      continue;
    }
    specimens.push(specimen);
    catalogIds.push(specimen.id);
    const requiredStrings = [specimen.name, specimen.material, specimen.process, specimen.finish, specimen.note];
    if (!requiredStrings.every(isNonemptyString) || !isExactRecord(specimen, contract)) errors.add("specimen");
    if (typeof specimen.id !== "string" || !specimen.id.startsWith(`AC-0${chapterIndex + 1}-`)) errors.add("specimen");
    if (specimen.sceneRole !== "hero" && specimen.sceneRole !== "supporting") errors.add("role");
  }
  if (specimens.filter((specimen) => specimen.sceneRole === "hero").length !== 2) errors.add("role");
  return specimens;
}

function validateHotspots(
  value: unknown,
  expected: Chapter["hotspots"],
  specimens: readonly Record<string, unknown>[],
  errors: Set<CampaignDataErrorCode>,
  hotspotIds: unknown[],
): void {
  if (!Array.isArray(value) || value.length !== 3) {
    errors.add("hotspot");
    errors.add("position");
    errors.add("calm-window");
    errors.add("mapping");
    return;
  }

  const specimenIds = new Set(specimens.map((specimen) => specimen.id));
  const mappedSpecimenIds: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const hotspot = value[index];
    const contract = expected[index];
    if (!isRecord(hotspot) || !contract) {
      errors.add("hotspot");
      errors.add("position");
      errors.add("calm-window");
      errors.add("mapping");
      continue;
    }
    hotspotIds.push(hotspot.id);
    mappedSpecimenIds.push(hotspot.specimenId);
    if (!hasExactKeys(hotspot, contract) || hotspot.id !== contract.id
      || hotspot.align !== contract.align) errors.add("hotspot");
    const position = hotspot.position;
    const desktop = isRecord(position) ? position.desktop : undefined;
    const mobile = isRecord(position) ? position.mobile : undefined;
    const validPosition = isRecord(desktop) && isPercentage(desktop.x) && isPercentage(desktop.y)
      && isRecord(mobile) && isPercentage(mobile.x) && isPercentage(mobile.y);
    if (!validPosition || !matchesResponsivePoint(position, contract.position)) errors.add("position");

    const calmWindow = hotspot.calmWindow;
    const validCalmWindow = Array.isArray(calmWindow) && calmWindow.length === 2
      && isProgress(calmWindow[0]) && isProgress(calmWindow[1]) && calmWindow[0] <= calmWindow[1];
    if (!validCalmWindow || calmWindow[0] !== contract.calmWindow[0] || calmWindow[1] !== contract.calmWindow[1]) {
      errors.add("calm-window");
    }

    const specimen = specimens.find((entry) => entry.id === hotspot.specimenId);
    const aliasesMatch = specimen && hotspot.title === specimen.name
      && hotspot.note === specimen.note
      && hotspot.fact === [specimen.material, specimen.process, specimen.finish].join(FACT_SEPARATOR);
    if (!specimenIds.has(hotspot.specimenId) || hotspot.specimenId !== contract.specimenId) {
      errors.add("mapping");
    }
    if (!aliasesMatch) errors.add("hotspot");
  }
  if (new Set(mappedSpecimenIds).size !== 3 || mappedSpecimenIds.some((id) => !specimenIds.has(id))) errors.add("mapping");
}

/**
 * Validates all campaign content without throwing, including malformed nested input.
 * A valid result exposes the same closed data shape consumed by the application.
 */
export function validateCampaignData(input: unknown): CampaignDataValidationResult {
  const errors = new Set<CampaignDataErrorCode>();
  if (!isRecord(input)) {
    return { valid: false, errors: ["campaign", "chapter-count"] };
  }

  if (!hasExactKeys(input, campaignData) || !isRecord(input.campaign) || !isExactRecord(input.campaign, approvedCampaign)
    || !Object.values(input.campaign).every(isNonemptyString)) {
    errors.add("campaign");
  }

  const inputChapters = input.chapters;
  if (!Array.isArray(inputChapters) || inputChapters.length !== 4) errors.add("chapter-count");
  if (!Array.isArray(inputChapters)) return { valid: false, errors: [...errors] };

  const chapterIds: unknown[] = [];
  const sceneIds: unknown[] = [];
  const motionProfiles: unknown[] = [];
  const handoffProfiles: unknown[] = [];
  const hotspotIds: unknown[] = [];
  const catalogIds: unknown[] = [];
  let totalDuration = 0;

  for (let index = 0; index < inputChapters.length; index += 1) {
    const chapter = inputChapters[index];
    const expected = approvedChapters[index];
    if (!isRecord(chapter) || !expected) {
      errors.add("chapter");
      errors.add("duration");
      errors.add("summary");
      errors.add("cues");
      errors.add("easing");
      errors.add("world");
      errors.add("hex");
      errors.add("content");
      errors.add("specimen");
      errors.add("role");
      errors.add("hotspot");
      errors.add("position");
      errors.add("calm-window");
      errors.add("mapping");
      continue;
    }

    chapterIds.push(chapter.id);
    sceneIds.push(chapter.scene);
    motionProfiles.push(chapter.motionProfile);
    handoffProfiles.push(chapter.handoffProfile);
    if (!hasExactKeys(chapter, expected) || chapter.number !== expected.number || chapter.id !== expected.id || chapter.scene !== expected.scene
      || chapter.motionProfile !== expected.motionProfile || chapter.handoffProfile !== expected.handoffProfile) {
      errors.add("chapter");
    }

    if (chapter.durationMs !== CHAPTER_DURATION_MS) errors.add("duration");
    if (typeof chapter.durationMs === "number" && Number.isFinite(chapter.durationMs)) totalDuration += chapter.durationMs;

    validateWorld(chapter.from, expected.from, errors);
    validateWorld(chapter.to, expected.to, errors);
    if (!isNonemptyString(chapter.transformation) || !isNonemptyString(chapter.dek)
      || !isNonemptyString(chapter.studyTitle) || !isNonemptyString(chapter.feeling)
      || chapter.transformation !== expected.transformation || chapter.dek !== expected.dek
      || chapter.studyTitle !== expected.studyTitle || chapter.feeling !== expected.feeling) {
      errors.add("content");
    }
    if (!isNonemptyString(chapter.reducedMotionSummary) || chapter.reducedMotionSummary !== expected.reducedMotionSummary) {
      errors.add("summary");
    }
    for (const error of validateCueConfig(chapter.cues, expected.cues)) errors.add(error);

    const specimens = validateSpecimens(chapter.specimens, expected.specimens, index, errors, catalogIds);
    validateHotspots(chapter.hotspots, expected.hotspots, specimens, errors, hotspotIds);
  }

  if (totalDuration !== EXHIBITION_DURATION_MS) errors.add("total-duration");
  if (hasDuplicate(chapterIds)) errors.add("duplicate-chapter-id");
  if (hasDuplicate(hotspotIds)) errors.add("duplicate-hotspot-id");
  if (hasDuplicate(sceneIds)) errors.add("duplicate-scene");
  if (hasDuplicate(motionProfiles)) errors.add("duplicate-motion-profile");
  if (hasDuplicate(handoffProfiles)) errors.add("duplicate-handoff-profile");
  if (hasDuplicate(catalogIds) || new Set(catalogIds).size !== 12) errors.add("specimen");

  return errors.size === 0
    ? { valid: true, data: input as CampaignData, errors: [] }
    : { valid: false, errors: [...errors] };
}

/** Compatibility entry point for the accepted v4 array-only content shape. */
export function validateExhibitionData(input: unknown): ExhibitionDataValidationResult {
  return validateCampaignData({ campaign, chapters: input });
}

export const exhibitionDataValidation = validateCampaignData(campaignData);
