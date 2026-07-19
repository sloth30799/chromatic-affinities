import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error Production ESM analyzer has no declaration file.
import { analyzeHandoff } from "../scripts/analyze-handoff.mjs";
// @ts-expect-error Production ESM analyzer has no declaration file.
import { currentBinding } from "../scripts/analyze-contrast.mjs";

const fixtures: string[] = [];
afterEach(async () => { await Promise.all(fixtures.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });
async function image(path: string, color: string) { await sharp({ create: { width: 20, height: 20, channels: 4, background: color } }).png().toFile(path); }

describe("live handoff proof", () => {
  it("passes moving outgoing and restore samples while the identical control stays still", async () => {
    const directory = await mkdtemp(join(tmpdir(), "chromatic-affinities-handoff-")); fixtures.push(directory); await Promise.all([mkdir(join(directory, "handoff"), { recursive: true }), mkdir(join(directory, "analysis"), { recursive: true })]);
    for (const [name, color] of Object.entries({ outgoing08: "#000000", outgoing32: "#ffffff", restore8067: "#111111", restore84: "#888888", controlA: "#222222", controlB: "#222222" })) await image(join(directory, "handoff", `${name}.png`), color);
    const files = Object.fromEntries(Object.keys({ outgoing08: 1, outgoing32: 1, restore8067: 1, restore84: 1, controlA: 1, controlB: 1 }).map((name) => [name, `handoff/${name}.png`]));
    const manifest = { schemaVersion: 7, binding: currentBinding(), required: { projects: [], scenes: [], routes: [], selectors: [], focusArtifacts: [], recordings: [], handoffs: [{ chapter: "01", target: "fixture", crop: { x: 0, y: 0, width: 1, height: 1 } }] }, artifacts: [{ id: "handoff-01", kind: "handoff", chapter: "01", required: true, files }] };
    await writeFile(join(directory, "manifest.json"), `${JSON.stringify(manifest)}\n`); expect((await analyzeHandoff(directory)).pass).toBe(true);
  }, 20_000);
  it("keeps frozen outgoing and frozen restore fixtures failing", async () => {
    const directory = await mkdtemp(join(tmpdir(), "chromatic-affinities-handoff-frozen-")); fixtures.push(directory); await Promise.all([mkdir(join(directory, "handoff"), { recursive: true }), mkdir(join(directory, "analysis"), { recursive: true })]);
    for (const name of ["outgoing08", "outgoing32", "restore8067", "restore84", "controlA", "controlB"]) await image(join(directory, "handoff", `${name}.png`), "#222222");
    const files = Object.fromEntries(["outgoing08", "outgoing32", "restore8067", "restore84", "controlA", "controlB"].map((name) => [name, `handoff/${name}.png`]));
    await writeFile(join(directory, "manifest.json"), `${JSON.stringify({ schemaVersion: 7, binding: currentBinding(), required: { projects: [], scenes: [], routes: [], selectors: [], focusArtifacts: [], recordings: [], handoffs: [{ chapter: "01", target: "frozen", crop: { x: 0, y: 0, width: 1, height: 1 } }] }, artifacts: [{ id: "frozen-01", kind: "handoff", chapter: "01", required: true, files }] })}\n`);
    const result = await analyzeHandoff(directory); expect(result.pass).toBe(false); expect(result.failures.join("\n")).toContain("handoff limits failed");
  }, 20_000);
});
