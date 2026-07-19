import { access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, resolve } from "node:path";
import sharp from "sharp";
import { analyzeContrast, bindingFailures } from "./analyze-contrast.mjs";
import { analyzeFlash } from "./analyze-flash.mjs";
import { analyzeHandoff } from "./analyze-handoff.mjs";

export const ANALYZER_VERSION = "2.0.0";
function requiredEvidenceDirectory() {
  if (!process.env.CA_EVIDENCE_DIR) throw new Error("CA_EVIDENCE_DIR is required for evidence analysis."); const target = resolve(process.env.CA_EVIDENCE_DIR); const relation = relative(process.cwd(), target);
  if (relation === "" || (!relation.startsWith("..") && !relation.startsWith("/"))) throw new Error("CA_EVIDENCE_DIR must resolve outside the worktree."); return target;
}
async function exists(path) { try { await access(path, constants.F_OK); return true; } catch { return false; } }
function durationMs(path) { return Number.parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path], { encoding: "utf8" }).trim()) * 1_000; }
function shapeFailures(manifest) {
  const failures = []; if (manifest.schemaVersion !== 7) failures.push("manifest schema mismatch");
  for (const key of ["projects", "scenes", "routes", "selectors", "focusArtifacts", "handoffs", "recordings"])
    if (!manifest.required || !Array.isArray(manifest.required[key])) failures.push(`manifest required.${key} missing`);
  if (!Array.isArray(manifest.artifacts)) failures.push("manifest artifacts missing"); return failures;
}
export async function validateManifest(evidenceDir) {
  const manifest = JSON.parse(await readFile(join(evidenceDir, "manifest.json"), "utf8")); const failures = [...shapeFailures(manifest), ...bindingFailures(manifest.binding)]; const artifacts = manifest.artifacts ?? [];
  for (const artifact of artifacts.filter((item) => item.required)) {
    const paths = artifact.files ? Object.values(artifact.files) : [artifact.path, artifact.metadata].filter(Boolean);
    for (const path of paths) if (!await exists(join(evidenceDir, path))) failures.push(`missing declared artifact: ${artifact.id}:${path}`);
    if (artifact.kind !== "recording" && artifact.dimensions && artifact.path && await exists(join(evidenceDir, artifact.path))) {
      const dimensions = await sharp(join(evidenceDir, artifact.path)).metadata();
      if (dimensions.width !== artifact.dimensions.width || dimensions.height !== artifact.dimensions.height) failures.push(`dimension mismatch: ${artifact.id}`);
    }
    if (artifact.layout && (typeof artifact.layout.horizontalOverflow !== "boolean" || !Array.isArray(artifact.layout.collisions))) failures.push(`layout fields missing: ${artifact.id}`);
    if (artifact.missingSelectors?.length) failures.push(`required selectors missing: ${artifact.id}: ${artifact.missingSelectors.join(", ")}`);
    if (artifact.layout?.horizontalOverflow) failures.push(`horizontal overflow: ${artifact.id}`);
    if (artifact.layout?.collisions?.length) failures.push(`collision: ${artifact.id}`);
  }
  for (const recording of manifest.required?.recordings ?? []) {
    const artifact = artifacts.find((item) => item.id === recording.id); if (!artifact || !await exists(join(evidenceDir, artifact.path))) { failures.push(`missing declared recording: ${recording.id}`); continue; }
    const actual = durationMs(join(evidenceDir, artifact.path)); if (Math.abs(actual - recording.durationMs) > 250) failures.push(`recording duration mismatch: ${recording.id}`);
  }
  const performance = manifest.performance ?? [];
  if (!performance.length) failures.push("frame-performance fields missing");
  for (const sample of performance) if (!Number.isFinite(sample.frameCount) || !Number.isFinite(sample.minimumFps) || sample.minimumFps < 30 || !Array.isArray(sample.longTasks)) failures.push(`frame-performance gate failed: ${sample.id ?? "unknown"}`);
  return { manifest, failures };
}
export async function analyzeEvidence(evidenceDir = requiredEvidenceDirectory(), options = { nested: true }) {
  const validation = await validateManifest(evidenceDir); const failures = [...validation.failures]; let contrast; let flash; let handoff;
  if (options.nested) { contrast = await analyzeContrast(evidenceDir); flash = await analyzeFlash(evidenceDir); handoff = await analyzeHandoff(evidenceDir); if (!contrast.pass) failures.push("contrast analysis failed"); if (!flash.pass) failures.push("flash analysis failed"); if (!handoff.pass) failures.push("handoff analysis failed"); }
  const output = { analyzer: "analyze-evidence", version: ANALYZER_VERSION, artifacts: validation.manifest.artifacts?.length ?? 0, performance: validation.manifest.performance ?? [], contrast: contrast ? { pass: contrast.pass, states: contrast.stateCount } : null, flash: flash ? { pass: flash.pass, recordings: flash.recordings.length } : null, handoff: handoff ? { pass: handoff.pass, boundaries: handoff.results.length } : null, failures, pass: failures.length === 0 };
  await writeFile(join(evidenceDir, "analysis", "evidence-results.json"), `${JSON.stringify(output, null, 2)}\n`); return output;
}
if (import.meta.url === `file://${process.argv[1]}`) analyzeEvidence().then((result) => { console.log(JSON.stringify({ pass: result.pass, failures: result.failures.length, artifacts: result.artifacts })); if (!result.pass) process.exitCode = 1; }).catch((error) => { console.error(error); process.exitCode = 1; });
