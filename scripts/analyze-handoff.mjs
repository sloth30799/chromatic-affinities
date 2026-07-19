import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { bindingFailures } from "./analyze-contrast.mjs";

export const ANALYZER_VERSION = "1.0.0";
export const HANDOFF_LIMITS = { pixelL1: 18, outgoingMean: 4, outgoingChangedFraction: .03, restoreMean: 2, restoreChangedFraction: .015, identicalMean: .25, identicalChangedFraction: .001 };
function requiredEvidenceDirectory() { if (!process.env.CA_EVIDENCE_DIR) throw new Error("CA_EVIDENCE_DIR is required for handoff analysis."); return resolve(process.env.CA_EVIDENCE_DIR); }

async function crop(path, ratio) {
  const image = sharp(path); const metadata = await image.metadata(); const width = Math.max(1, Math.floor(metadata.width * ratio.width)); const height = Math.max(1, Math.floor(metadata.height * ratio.height));
  return image.extract({ left: Math.floor(metadata.width * ratio.x), top: Math.floor(metadata.height * ratio.y), width, height }).ensureAlpha().raw().toBuffer();
}
export async function compareCrops(firstPath, secondPath, ratio, limits = HANDOFF_LIMITS) {
  const [first, second] = await Promise.all([crop(firstPath, ratio), crop(secondPath, ratio)]); if (first.length !== second.length) throw new Error("handoff crop dimensions differ");
  let total = 0; let changed = 0; const pixels = first.length / 4;
  for (let offset = 0; offset < first.length; offset += 4) { const delta = Math.abs(first[offset] - second[offset]) + Math.abs(first[offset + 1] - second[offset + 1]) + Math.abs(first[offset + 2] - second[offset + 2]); total += delta; if (delta > limits.pixelL1) changed += 1; }
  return { pixels, meanAbsoluteRgbDelta: total / pixels, changedFraction: changed / pixels };
}
function passes(values, mean, fraction) { return values.meanAbsoluteRgbDelta >= mean && values.changedFraction >= fraction; }

export async function analyzeHandoff(evidenceDir = requiredEvidenceDirectory()) {
  const manifest = JSON.parse(await readFile(join(evidenceDir, "manifest.json"), "utf8")); const limits = { ...HANDOFF_LIMITS, ...(manifest.thresholds?.handoff ?? {}) }; const failures = [...bindingFailures(manifest.binding)]; const results = [];
  for (const contract of manifest.required?.handoffs ?? []) {
    const artifact = (manifest.artifacts ?? []).find((item) => item.kind === "handoff" && item.chapter === contract.chapter && item.required);
    if (!artifact) { failures.push(`missing handoff declaration: ${contract.chapter}`); continue; }
    const path = (name) => join(evidenceDir, artifact.files[name]);
    try {
      const outgoing = await compareCrops(path("outgoing08"), path("outgoing32"), contract.crop, limits); const restore = await compareCrops(path("restore8067"), path("restore84"), contract.crop, limits); const identical = await compareCrops(path("controlA"), path("controlB"), contract.crop, limits);
      const pass = passes(outgoing, limits.outgoingMean, limits.outgoingChangedFraction) && passes(restore, limits.restoreMean, limits.restoreChangedFraction) && identical.meanAbsoluteRgbDelta < limits.identicalMean && identical.changedFraction < limits.identicalChangedFraction;
      if (!pass) failures.push(`handoff limits failed: ${contract.chapter}`); results.push({ chapter: contract.chapter, target: contract.target, crop: contract.crop, outgoing, restore, identical, pass });
    } catch (error) { failures.push(`handoff artifact error: ${contract.chapter}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  const output = { analyzer: "analyze-handoff", version: ANALYZER_VERSION, limits, results, failures, pass: failures.length === 0 && results.length === (manifest.required?.handoffs ?? []).length };
  await writeFile(join(evidenceDir, "analysis", "handoff-results.json"), `${JSON.stringify(output, null, 2)}\n`); return output;
}

if (import.meta.url === `file://${process.argv[1]}`) analyzeHandoff().then((result) => { console.log(JSON.stringify({ handoffs: result.results.length, pass: result.pass })); if (!result.pass) process.exitCode = 1; }).catch((error) => { console.error(error); process.exitCode = 1; });
