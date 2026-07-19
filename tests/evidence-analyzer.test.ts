import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error Production ESM analyzer has no declaration file.
import { analyzeEvidence } from "../scripts/analyze-evidence.mjs";
// @ts-expect-error Production ESM analyzer has no declaration file.
import { currentBinding } from "../scripts/analyze-contrast.mjs";

const fixtures: string[] = [];
afterEach(async () => { await Promise.all(fixtures.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

async function writeManifest(directory: string, includeArtifact = true) {
  const artifacts = includeArtifact ? [{ id: "route-root", kind: "still", required: true, path: "stills/root.png", dimensions: { width: 20, height: 10 }, layout: { horizontalOverflow: false, collisions: [] } }] : [{ id: "route-root", kind: "still", required: true, path: "stills/missing.png", dimensions: { width: 20, height: 10 }, layout: { horizontalOverflow: false, collisions: [] } }];
  await writeFile(join(directory, "manifest.json"), `${JSON.stringify({ schemaVersion: 7, binding: currentBinding(), required: { projects: ["chromium-desktop"], scenes: ["01"], routes: ["/"], selectors: ["#campaign-title"], focusArtifacts: [], handoffs: [], recordings: [] }, artifacts, performance: [{ id: "root", frameCount: 60, minimumFps: 60, longTasks: [] }] }, null, 2)}\n`);
}

describe("manifest-driven evidence analysis", () => {
  it("accepts declared dimensions, layout and performance fields", async () => {
    const directory = await mkdtemp(join(tmpdir(), "chromatic-affinities-evidence-")); fixtures.push(directory); await mkdir(join(directory, "stills"), { recursive: true }); await mkdir(join(directory, "analysis"), { recursive: true });
    await sharp({ create: { width: 20, height: 10, channels: 4, background: "#000" } }).png().toFile(join(directory, "stills", "root.png")); await writeManifest(directory);
    expect((await analyzeEvidence(directory, { nested: false })).pass).toBe(true);
  }, 20_000);
  it("fails when the manifest declares an artifact that is absent", async () => {
    const directory = await mkdtemp(join(tmpdir(), "chromatic-affinities-evidence-")); fixtures.push(directory); await mkdir(join(directory, "analysis"), { recursive: true }); await writeManifest(directory, false);
    const result = await analyzeEvidence(directory, { nested: false}); expect(result.pass).toBe(false); expect(result.failures.join("\n")).toContain("missing declared artifact");
  }, 20_000);
});
