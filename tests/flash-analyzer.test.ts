import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error Production ESM analyzer has no declaration file.
import { analyzeFlash } from "../scripts/analyze-flash.mjs";
// @ts-expect-error Production ESM analyzer has no declaration file.
import { currentBinding } from "../scripts/analyze-contrast.mjs";

const fixtures: string[] = [];
afterEach(async () => { await Promise.all(fixtures.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

describe("flash evidence limits", () => {
  it("passes a stable recording and rejects a missing declared recording", async () => {
    const directory = await mkdtemp(join(tmpdir(), "chromatic-affinities-flash-")); fixtures.push(directory); await Promise.all([mkdir(join(directory, "recordings"), { recursive: true }), mkdir(join(directory, "analysis"), { recursive: true })]);
    execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=c=black:s=32x32:d=1", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(directory, "recordings", "stable.mp4")]);
    const manifest = { schemaVersion: 7, binding: currentBinding(), thresholds: { flash: { fps: 12 } }, required: { projects: [], scenes: [], routes: [], selectors: [], focusArtifacts: [], handoffs: [], recordings: [{ id: "stable", durationMs: 1_000 }] }, artifacts: [{ id: "stable", kind: "recording", required: true, path: "recordings/stable.mp4" }] };
    await writeFile(join(directory, "manifest.json"), `${JSON.stringify(manifest)}\n`); expect((await analyzeFlash(directory)).pass).toBe(true);
    manifest.artifacts[0]!.path = "recordings/missing.mp4"; await writeFile(join(directory, "manifest.json"), `${JSON.stringify(manifest)}\n`); await expect(analyzeFlash(directory)).rejects.toThrow();
  }, 20_000);
});
