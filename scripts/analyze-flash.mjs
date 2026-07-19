import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { bindingFailures } from "./analyze-contrast.mjs";

export const ANALYZER_VERSION = "2.0.0";

function requiredEvidenceDirectory() { if (!process.env.CA_EVIDENCE_DIR) throw new Error("CA_EVIDENCE_DIR is required for flash analysis."); return resolve(process.env.CA_EVIDENCE_DIR); }
function linearChannel(value) { const normalized = value / 255; return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4; }
const linear = Float64Array.from({ length: 256 }, (_, index) => linearChannel(index));

async function luminanceFrame(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const values = new Float32Array(info.width * info.height); let bright = 0;
  for (let pixel = 0, offset = 0; pixel < values.length; pixel += 1, offset += 4) {
    const alpha = data[offset + 3] / 255; const value = (0.2126 * linear[data[offset]] + .7152 * linear[data[offset + 1]] + .0722 * linear[data[offset + 2]]) * alpha + 1 - alpha;
    values[pixel] = value; if (value > .9) bright += 1;
  }
  return { values, pixels: values.length, brightFraction: bright / values.length };
}

async function framesForRecording(recording, tempRoot, fps) {
  const output = join(tempRoot, recording.replace(/[^a-z0-9]/gi, "_")); await rm(output, { recursive: true, force: true }); await mkdir(output, { recursive: true });
  // Downsampling leaves temporal frequency and area ratios intact while keeping raw
  // evidence analysis practical for the two full 48-second captures.
  execFileSync("ffmpeg", ["-v", "error", "-i", recording, "-vf", `fps=${fps},scale=480:-2`, join(output, "%06d.png")], { stdio: "pipe" });
  return (await readdir(output)).filter((file) => file.endsWith(".png")).sort().map((file) => join(output, file));
}

function maxPerSecond(events) {
  return events.reduce((maximum, event) => Math.max(maximum, events.filter((candidate) => candidate.atMs >= event.atMs && candidate.atMs < event.atMs + 1_000).length), 0);
}

export async function analyzeFlash(evidenceDir = requiredEvidenceDirectory()) {
  const manifest = JSON.parse(await readFile(join(evidenceDir, "manifest.json"), "utf8"));
  const limits = { fps: 15, luminanceDelta: .1, areaFraction: .25, maxFlashesPerSecond: 3, maxBrightFraction: .9, maxBrightFrames: 0, ...(manifest.thresholds?.flash ?? {}) };
  const recordings = (manifest.artifacts ?? []).filter((artifact) => artifact.kind === "recording" && artifact.required);
  const failures = [...bindingFailures(manifest.binding)]; const tempRoot = await mkdtemp(join(tmpdir(), "chromatic-affinities-flash-")); const results = [];
  try {
    for (const artifact of recordings) {
      const path = join(evidenceDir, artifact.path); const frames = await framesForRecording(path, tempRoot, limits.fps); const transitions = []; const brightFrames = []; let previous;
      for (let index = 0; index < frames.length; index += 1) {
        const current = await luminanceFrame(frames[index]); if (current.brightFraction > limits.maxBrightFraction) brightFrames.push({ frame: index + 1, fraction: current.brightFraction });
        if (previous) {
          let changed = 0; let directionTotal = 0;
          for (let pixel = 0; pixel < current.pixels; pixel += 1) { const delta = current.values[pixel] - previous.values[pixel]; if (Math.abs(delta) >= limits.luminanceDelta) { changed += 1; directionTotal += Math.sign(delta); } }
          const areaFraction = changed / current.pixels;
          if (areaFraction >= limits.areaFraction) transitions.push({ frame: index + 1, atMs: index / limits.fps * 1_000, areaFraction, direction: Math.sign(directionTotal) });
        }
        previous = current;
      }
      const flashes = transitions.filter((event, index) => index > 0 && event.direction !== 0 && transitions[index - 1].direction !== 0 && event.direction !== transitions[index - 1].direction && event.atMs - transitions[index - 1].atMs <= 1_000);
      const frequency = maxPerSecond(flashes);
      const result = { id: artifact.id, recording: artifact.path, frameCount: frames.length, limits, transitions, flashes, flashFrequencyPerSecond: frequency, brightFrames, pass: frequency <= limits.maxFlashesPerSecond && brightFrames.length <= limits.maxBrightFrames };
      if (!result.pass) failures.push(`flash limits failed: ${artifact.id}`); results.push(result);
    }
  } finally { await rm(tempRoot, { recursive: true, force: true }); }
  if (!results.length) failures.push("no declared recordings");
  const output = { analyzer: "analyze-flash", version: ANALYZER_VERSION, method: "manifest-declared recordings; sampled linear luminance, changed area, alternating direction, and rolling one-second frequency", recordings: results, failures, pass: failures.length === 0 };
  await writeFile(join(evidenceDir, "analysis", "flash-results.json"), `${JSON.stringify(output, null, 2)}\n`);
  return output;
}

if (import.meta.url === `file://${process.argv[1]}`) analyzeFlash().then((result) => { console.log(JSON.stringify({ recordings: result.recordings.length, pass: result.pass })); if (!result.pass) process.exitCode = 1; }).catch((error) => { console.error(error); process.exitCode = 1; });
