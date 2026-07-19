import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error The production analyzer is an ESM executable without declarations.
import { analyzeContrast, contrastForCompositedText, currentBinding } from "../scripts/analyze-contrast.mjs";

const fixtures: string[] = [];
afterEach(async () => { await Promise.all(fixtures.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "chromatic-affinities-contrast-")); fixtures.push(directory);
  await Promise.all([mkdir(join(directory, "metadata"), { recursive: true }), mkdir(join(directory, "contrast"), { recursive: true }), mkdir(join(directory, "analysis"), { recursive: true })]);
  await sharp({ create: { width: 12, height: 12, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toFile(join(directory, "contrast", "background.png"));
  await writeFile(join(directory, "manifest.json"), `${JSON.stringify({ schemaVersion: 7, binding: currentBinding(), required: { focusArtifacts: [{ id: "focus" }], projects: [], scenes: [], routes: [], selectors: [], handoffs: [], recordings: [] }, artifacts: [{ id: "text", kind: "contrast", required: true, metadata: "metadata/text.json" }, { id: "focus", kind: "focus", focusId: "focus", required: true, metadata: "metadata/focus.json" }] }, null, 2)}\n`);
  return directory;
}
function metadata(elements: unknown[]) { return { background: "contrast/background.png", elements }; }

describe("contrast compositing and manifest coverage", () => {
  it("keeps opaque and translucent compositing mathematically honest", () => {
    expect(contrastForCompositedText({ red: 0, green: 0, blue: 0 }, 1, { red: 255, green: 255, blue: 255 })).toBeCloseTo(21, 8);
    expect(contrastForCompositedText({ red: 0, green: 0, blue: 0 }, .5, { red: 255, green: 255, blue: 255 })).toBeLessThan(4.5);
  });

  it("requires separately declared focus evidence and measures it at 3:1", async () => {
    const directory = await fixture();
    const text = { id: "copy", selector: "h1", text: "Copy", kind: "normal", color: "rgb(0, 0, 0)", visibility: "visible", effectiveOpacity: 1, rendered: true, box: { x: 0, y: 0, width: 10, height: 10 } };
    const focus = { id: "focus", selector: "button:focus-visible", text: "Focus indicator", kind: "focus", color: "rgb(0, 0, 0)", backgroundColor: "rgb(255, 255, 255)", visibility: "visible", effectiveOpacity: 1, rendered: true, box: { x: 0, y: 0, width: 10, height: 10 } };
    await writeFile(join(directory, "metadata", "text.json"), `${JSON.stringify(metadata([text]))}\n`);
    await writeFile(join(directory, "metadata", "focus.json"), `${JSON.stringify(metadata([focus]))}\n`);
    const result = await analyzeContrast(directory);
    expect(result.pass).toBe(true);
    expect(result.states.find((state: { id: string }) => state.id === "focus")?.elements[0]?.threshold).toBe(3);
    await writeFile(join(directory, "manifest.json"), `${JSON.stringify({ schemaVersion: 7, binding: currentBinding(), required: { focusArtifacts: [{ id: "focus" }], projects: [], scenes: [], routes: [], selectors: [], handoffs: [], recordings: [] }, artifacts: [{ id: "text", kind: "contrast", required: true, metadata: "metadata/text.json" }] })}\n`);
    expect((await analyzeContrast(directory)).pass).toBe(false);
  }, 20_000);
});
