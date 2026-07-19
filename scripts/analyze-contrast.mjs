import { access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

export const ANALYZER_VERSION = "2.0.0";
export const EFFECTIVELY_ZERO_OPACITY = 0.01;
const BASELINE_HEAD = "9a56fe58c286eb7bfb88383950b486e8ae930069";
const LOCKS = {
  packageLock: "00d24668efb5cfa2d4916598ad607f6ab0c87aa10359879b4b2551e128ca2856",
  pnpmLock: "4264cff4f86600c0bff6125fe08fe11d5c056a7f789a809862366b37486da41f",
  pnpmWorkspace: "541c9f09bf29f96cc27cf1422a7b11e98d8dd4d51575197f00ddb300d2ff1cab",
};

function requiredEvidenceDirectory() {
  if (!process.env.CA_EVIDENCE_DIR) throw new Error("CA_EVIDENCE_DIR is required for contrast analysis.");
  return resolve(process.env.CA_EVIDENCE_DIR);
}

export function linearChannel(value) { const normalized = value / 255; return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4; }
export function relativeLuminance(red, green, blue) { return 0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue); }
export function parseColor(value) {
  const match = String(value).match(/rgba?\(([^)]+)\)/i);
  if (!match) throw new Error(`Unsupported computed color: ${value}`);
  const [red, green, blue, alpha = "1"] = match[1].split(",").map((part) => part.trim());
  return { red: Number(red), green: Number(green), blue: Number(blue), alpha: Number(alpha) };
}
export function contrastRatio(first, second) { return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05); }
export function compositeForegroundOverBackground(foreground, foregroundAlpha, background) {
  const alpha = Math.max(0, Math.min(1, foregroundAlpha));
  return { red: foreground.red * alpha + background.red * (1 - alpha), green: foreground.green * alpha + background.green * (1 - alpha), blue: foreground.blue * alpha + background.blue * (1 - alpha) };
}
export function contrastForCompositedText(foreground, foregroundAlpha, background) {
  const composited = compositeForegroundOverBackground(foreground, foregroundAlpha, background);
  return contrastRatio(relativeLuminance(composited.red, composited.green, composited.blue), relativeLuminance(background.red, background.green, background.blue));
}

function command(root, source) { return execFileSync("/bin/zsh", ["-lc", source], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
export function currentBinding(root = process.cwd()) {
  const sha = (file) => execFileSync("shasum", ["-a", "256", file], { cwd: root, encoding: "utf8" }).trim().split(/\s+/)[0];
  return {
    baselineHead: BASELINE_HEAD,
    head: command(root, "git rev-parse HEAD"),
    trackedDigest: command(root, "git diff --binary HEAD | shasum -a 256"),
    untrackedManifestDigest: command(root, "git ls-files --others --exclude-standard | LC_ALL=C sort | xargs shasum -a 256 | shasum -a 256"),
    combinedBinding: command(root, "{ git diff --binary HEAD; git ls-files --others --exclude-standard | LC_ALL=C sort | xargs shasum -a 256; } | shasum -a 256"),
    packageLock: sha("package-lock.json"), pnpmLock: sha("pnpm-lock.yaml"), pnpmWorkspace: sha("pnpm-workspace.yaml"),
  };
}
export function bindingFailures(binding, root = process.cwd()) {
  const failures = [];
  if (!binding || typeof binding !== "object") return ["missing source binding"];
  if (binding.baselineHead !== BASELINE_HEAD) failures.push("baseline HEAD mismatch");
  for (const [key, value] of Object.entries(LOCKS)) if (binding[key] !== value) failures.push(`${key} hash mismatch`);
  const current = currentBinding(root);
  for (const key of Object.keys(current)) if (binding[key] !== current[key]) failures.push(`source binding mismatch: ${key}`);
  return failures;
}

async function imagePixels(path) { const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, width: info.width, height: info.height }; }
function backgroundRgb(image, x, y) {
  const px = Math.max(0, Math.min(image.width - 1, Math.round(x))); const py = Math.max(0, Math.min(image.height - 1, Math.round(y))); const offset = (py * image.width + px) * 4; const alpha = image.data[offset + 3] / 255;
  return { red: image.data[offset] * alpha + 255 * (1 - alpha), green: image.data[offset + 1] * alpha + 255 * (1 - alpha), blue: image.data[offset + 2] * alpha + 255 * (1 - alpha) };
}
export function sampleGrid(entry, image) {
  const color = parseColor(entry.color); const effectiveOpacity = Number.isFinite(entry.effectiveOpacity) ? entry.effectiveOpacity : 1; const effectiveAlpha = Math.max(0, Math.min(1, color.alpha * effectiveOpacity));
  const backgroundOverride = entry.backgroundColor ? parseColor(entry.backgroundColor) : null;
  const samples = [0.2, 0.5, 0.8].flatMap((horizontal) => [0.2, 0.5, 0.8].map((vertical) => {
    const background = backgroundOverride ?? backgroundRgb(image, entry.box.x + entry.box.width * horizontal, entry.box.y + entry.box.height * vertical);
    return { x: horizontal, y: vertical, ratio: contrastForCompositedText(color, effectiveAlpha, background) };
  }));
  const threshold = entry.kind === "focus" || entry.kind === "ui" || entry.kind === "large" ? 3 : 4.5;
  return { id: entry.id, selector: entry.selector, text: entry.text, kind: entry.kind, threshold, minimumRatio: Math.min(...samples.map((sample) => sample.ratio)), samples, pass: samples.every((sample) => sample.ratio >= threshold) };
}

async function exists(path) { try { await access(path, constants.F_OK); return true; } catch { return false; } }
async function manifestFor(evidenceDir) { return JSON.parse(await readFile(join(evidenceDir, "manifest.json"), "utf8")); }

export async function analyzeContrast(evidenceDir = requiredEvidenceDirectory()) {
  const manifest = await manifestFor(evidenceDir); const failures = [...bindingFailures(manifest.binding)];
  const contrastArtifacts = (manifest.artifacts ?? []).filter((artifact) => artifact.kind === "contrast" || artifact.kind === "focus");
  const requiredFocus = new Set((manifest.required?.focusArtifacts ?? []).map((item) => item.id));
  const seenFocus = new Set(); const states = [];
  for (const artifact of contrastArtifacts) {
    if (!artifact.required) continue;
    const metadataPath = join(evidenceDir, artifact.metadata);
    if (!await exists(metadataPath)) { failures.push(`missing contrast metadata: ${artifact.id}`); continue; }
    const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
    const backgroundPath = join(evidenceDir, metadata.background);
    if (!await exists(backgroundPath)) { failures.push(`missing contrast background: ${artifact.id}`); continue; }
    const image = await imagePixels(backgroundPath);
    const elements = (metadata.elements ?? []).filter((entry) => entry.rendered !== false && entry.visibility !== "hidden" && entry.visibility !== "collapse" && (entry.effectiveOpacity ?? 1) > EFFECTIVELY_ZERO_OPACITY).map((entry) => sampleGrid(entry, image));
    if (!elements.length) failures.push(`empty contrast state: ${artifact.id}`);
    if (artifact.kind === "focus") { seenFocus.add(artifact.focusId); if (!elements.some((entry) => entry.kind === "focus")) failures.push(`focus metric absent: ${artifact.id}`); }
    states.push({ id: artifact.id, elements, pass: elements.length > 0 && elements.every((entry) => entry.pass) });
  }
  for (const focusId of requiredFocus) if (!seenFocus.has(focusId)) failures.push(`missing declared focus artifact: ${focusId}`);
  const elementFailures = states.flatMap((state) => state.elements.filter((entry) => !entry.pass).map((entry) => ({ state: state.id, ...entry })));
  const output = { analyzer: "analyze-contrast", version: ANALYZER_VERSION, method: "manifest-declared screenshot/background sampling plus separate focus-indicator measures", stateCount: states.length, states, failures: [...failures, ...elementFailures], pass: failures.length === 0 && elementFailures.length === 0 };
  await writeFile(join(evidenceDir, "analysis", "contrast-results.json"), `${JSON.stringify(output, null, 2)}\n`);
  return output;
}

if (import.meta.url === `file://${process.argv[1]}`) analyzeContrast().then((result) => { console.log(JSON.stringify({ states: result.stateCount, failures: result.failures.length, pass: result.pass })); if (!result.pass) process.exitCode = 1; }).catch((error) => { console.error(error); process.exitCode = 1; });
