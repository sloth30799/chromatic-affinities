import { execFileSync, spawn } from "node:child_process";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { chromium, devices, webkit, type Browser, type BrowserContext, type BrowserContextOptions, type Page } from "@playwright/test";
import {
  currentSourceBinding,
  EVIDENCE_SCHEMA_VERSION,
  evidenceProjects,
  evidenceScenes,
  focusContracts,
  handoffContracts,
  manifestText,
  routeContracts,
  sceneStates,
  type EvidenceProject,
// @ts-expect-error Node's type-strip runner requires the explicit local .ts extension.
} from "./evidence-routes.ts";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const evidenceDir = requiredEvidenceDirectory();
const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
  compact: { width: 320, height: 568 },
} as const;
const HEROES = [
  ["AC-01-A", "glazed ceramic / porcelain / cobalt-glaze tile"], ["AC-01-C", "pressed mineral pigment / pigment cake / pigment puck"],
  ["AC-02-A", "translucent woven textile / fabric / organza"], ["AC-02-B", "synthetic woven textile / mesh / jacquard / monofilament weave"],
  ["AC-03-A", "lacquer plate / panel / sample sheet"], ["AC-03-C", "transparent resin / glass-like resin shard / faceted resin crystal"],
  ["AC-04-A", "raw clay / earthenware / clay body"], ["AC-04-B", "porcelain / ceramic vessel / bowl"],
] as const;

type Artifact = Record<string, unknown>;
type ErrorRecord = { project: string; route: string; kind: "console" | "pageerror"; message: string };
const artifacts: Artifact[] = [];
const errors: ErrorRecord[] = [];
const performance: Array<Record<string, unknown>> = [];

function requiredEvidenceDirectory() {
  const value = process.env.CA_EVIDENCE_DIR;
  if (!value) throw new Error("CA_EVIDENCE_DIR is required. Capture never writes into the repository.");
  const target = resolve(value); const relation = relative(root, target);
  if (!isAbsolute(target) || relation === "" || (!relation.startsWith("..") && !relation.startsWith("/"))) throw new Error("CA_EVIDENCE_DIR must be an absolute path outside the worktree.");
  return target;
}
async function ensureFreshDestination() { try { if ((await readdir(evidenceDir)).length) throw new Error(`CA_EVIDENCE_DIR must be absent or empty: ${evidenceDir}`); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; } }
async function writeJson(path: string, value: unknown) { await mkdir(dirname(path), { recursive: true }); const temporary = `${path}.${process.pid}.tmp`; await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`); await rename(temporary, path); }
function command(commandName: string, args: string[]) { return execFileSync(commandName, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
async function freePort() {
  const server = createServer(); await new Promise<void>((resolvePromise, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", () => resolvePromise()); });
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Could not reserve an isolated loopback port."); await new Promise<void>((resolvePromise, reject) => server.close((error) => error ? reject(error) : resolvePromise())); return address.port;
}
async function startTestProductionServer() {
  const build = spawn("npm", ["run", "build"], { cwd: root, env: { ...process.env, NEXT_PUBLIC_CA_TEST_MODE: "1" }, stdio: "pipe" }); const buildOutput: Buffer[] = [];
  build.stdout?.on("data", (chunk) => buildOutput.push(Buffer.from(chunk))); build.stderr?.on("data", (chunk) => buildOutput.push(Buffer.from(chunk)));
  const buildCode = await new Promise<number>((resolvePromise, reject) => { build.once("error", reject); build.once("exit", (code) => resolvePromise(code ?? 1)); });
  if (buildCode !== 0) throw new Error(`Test-only production build failed:\n${Buffer.concat(buildOutput).toString()}`);
  const port = await freePort(); const server = spawn("npm", ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: root, env: { ...process.env, NEXT_PUBLIC_CA_TEST_MODE: "1" }, stdio: "pipe" }); const output: Buffer[] = [];
  server.stdout?.on("data", (chunk) => output.push(Buffer.from(chunk))); server.stderr?.on("data", (chunk) => output.push(Buffer.from(chunk)));
  await new Promise<void>((resolvePromise, reject) => { const timeout = setTimeout(() => reject(new Error(`Evidence server did not start:\n${Buffer.concat(output).toString()}`)), 30_000); server.once("error", reject); server.stdout?.on("data", (chunk) => { if (String(chunk).includes("Ready")) { clearTimeout(timeout); resolvePromise(); } }); });
  return { baseURL: `http://127.0.0.1:${port}`, async stop() { if (server.exitCode === null) { server.kill("SIGTERM"); await new Promise<void>((resolvePromise) => server.once("exit", () => resolvePromise())); } } };
}
function contextOptions(project: EvidenceProject, viewport?: { width: number; height: number }): BrowserContextOptions {
  if (project === "webkit-iphone-15") return { ...devices["iPhone 15"] };
  return { viewport: viewport ?? viewports.desktop };
}
function browserFor(project: EvidenceProject): Promise<Browser> { return project === "chromium-desktop" ? chromium.launch() : webkit.launch(); }
function projectVersion(project: EvidenceProject, browser: Browser) { return { project, engine: project === "chromium-desktop" ? "Chromium" : "WebKit", version: browser.version(), device: project === "webkit-iphone-15" ? "Playwright iPhone 15 profile (mobile Safari UA, touch, mobile viewport, device scale factor)" : "desktop" }; }
function collectErrors(page: Page, project: string, route: string) {
  page.on("console", (message) => { if (message.type() === "error") errors.push({ project, route, kind: "console", message: message.text() }); }); page.on("pageerror", (error) => errors.push({ project, route, kind: "pageerror", message: error.message }));
}
async function bridge(page: Page, method: string, ...args: unknown[]) { return page.evaluate(({ name, values }) => { const value = (window as unknown as { __CA_TEST__?: Record<string, (...input: unknown[]) => unknown> }).__CA_TEST__; if (!value || typeof value[name] !== "function") throw new Error(`test bridge method unavailable: ${name}`); return value[name]!(...values); }, { name: method, values: args }); }
async function settle(page: Page) { await page.evaluate(() => new Promise<void>((resolvePromise) => requestAnimationFrame(() => requestAnimationFrame(() => resolvePromise())))); }
async function completeOpening(page: Page) { await page.waitForFunction(() => Boolean((window as unknown as { __CA_TEST__?: unknown }).__CA_TEST__)); await bridge(page, "flushFrame"); await bridge(page, "flushFrame"); await settle(page); for (let attempt = 0; attempt < 8; attempt += 1) { const holding = await page.getByText("Opening hold", { exact: true }).isVisible(); if (!holding) break; await bridge(page, "flushFrame"); await bridge(page, "advance", 300); await settle(page); } await page.getByText("Playing", { exact: true }).waitFor(); await settle(page); }
async function setState(page: Page, chapterIndex: number, progressValue: number) {
  await bridge(page, "setChapter", chapterIndex);
  await page.waitForFunction((index) => document.querySelector(".exhibition-nav button[aria-current='page']")?.getAttribute("data-chapter-index") === String(index), chapterIndex);
  await bridge(page, "setProgress", progressValue);
  await bridge(page, "flushFrame");
  await settle(page);
}
async function openedPage(context: BrowserContext, baseURL: string, project: string, route: string, opening = route === "/") { const page = await context.newPage(); collectErrors(page, project, route); await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" }); if (opening && !await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)) await completeOpening(page); return page; }
async function visualMetadata(page: Page, route: keyof typeof routeContracts, focusSelector?: string) {
  return page.evaluate(({ selectors, focus }) => {
    const captureSelectors = focus ? [...selectors, focus] : selectors; const selected = [...new Set(captureSelectors.flatMap((selector) => [...document.querySelectorAll<HTMLElement>(selector)]))]; const missingSelectors = selectors.filter((selector) => !document.querySelector(selector));
    const elements = selected.map((element, index) => { const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); const focused = Boolean(focus) && element.matches(focus!); const opaqueElementBackground = style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== "transparent" ? style.backgroundColor : undefined; let opacity = 1; let rendered = element.isConnected && element.getClientRects().length > 0;
      for (let current: HTMLElement | null = element; current; current = current.parentElement) { const currentStyle = getComputedStyle(current); opacity *= Number.parseFloat(currentStyle.opacity) || 1; if (currentStyle.display === "none" || currentStyle.visibility !== "visible") rendered = false; }
      return { id: `essential-${index}`, selector: focused ? focus : element.className || element.tagName.toLowerCase(), text: (element.innerText || element.getAttribute("aria-label") || "").trim(), kind: focused ? "focus" : element.tagName === "BUTTON" ? "ui" : Number.parseFloat(style.fontSize) >= 24 ? "large" : "normal", color: focused ? style.outlineColor : style.color, backgroundColor: focused ? getComputedStyle(document.body).backgroundColor : opaqueElementBackground, visibility: style.visibility, effectiveOpacity: opacity, rendered, box: { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0)), height: Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0)) } };
    }).filter((entry) => entry.rendered && entry.text && entry.box.width > 0 && entry.box.height > 0);
    const controls = [...document.querySelectorAll<HTMLElement>(".playback-controls button, .field-note-index__trigger, .campaign-links a, [data-editorial-route] a")].filter((element) => { const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; }).map((element) => element.getBoundingClientRect());
    const collisions: string[] = []; for (let first = 0; first < controls.length; first += 1) for (let second = first + 1; second < controls.length; second += 1) if (controls[first]!.left < controls[second]!.right && controls[first]!.right > controls[second]!.left && controls[first]!.top < controls[second]!.bottom && controls[first]!.bottom > controls[second]!.top) collisions.push(`${first}:${second}`);
    return { elements, missingSelectors, layout: { horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1, collisions }, dimensions: { width: innerWidth, height: innerHeight } };
  }, { selectors: routeContracts[route].essentialSelectors, focus: focusSelector });
}
async function hideText(page: Page) { await page.evaluate(() => { const selected = [...document.querySelectorAll<HTMLElement>("h1, h2, h3, p, a, button, strong, span")]; const state = selected.map((element) => ({ element, style: element.getAttribute("style") })); (window as unknown as { __CA_TEXT_STATE__?: typeof state }).__CA_TEXT_STATE__ = state; for (const { element } of state) { element.style.setProperty("color", "transparent", "important"); element.style.setProperty("-webkit-text-fill-color", "transparent", "important"); element.style.setProperty("text-shadow", "none", "important"); } }); }
async function restoreText(page: Page) { await page.evaluate(() => { for (const entry of (window as unknown as { __CA_TEXT_STATE__?: Array<{ element: HTMLElement; style: string | null }> }).__CA_TEXT_STATE__ ?? []) { if (entry.style === null) entry.element.removeAttribute("style"); else entry.element.setAttribute("style", entry.style); } delete (window as unknown as { __CA_TEXT_STATE__?: unknown }).__CA_TEXT_STATE__; }); }
async function captureStill(page: Page, id: string, route: keyof typeof routeContracts, detail: Record<string, unknown> = {}, focus?: { id: string; selector: string }) {
  const path = `stills/${id}.png`; const metadataPath = `metadata/${id}.json`; const background = `contrast/backgrounds/${id}.png`; await page.screenshot({ path: join(evidenceDir, path), scale: "css" }); const metadata = await visualMetadata(page, route, focus?.selector); await hideText(page); try { await page.screenshot({ path: join(evidenceDir, background), scale: "css" }); } finally { await restoreText(page); }
  await writeJson(join(evidenceDir, metadataPath), { screenshot: path, background, elements: metadata.elements }); artifacts.push({ id, kind: focus ? "focus" : "contrast", focusId: focus?.id, required: true, route, path, metadata: metadataPath, background, dimensions: metadata.dimensions, layout: metadata.layout, missingSelectors: metadata.missingSelectors, ...detail });
}
async function measureFrames(page: Page, id: string) { await settle(page); await page.waitForTimeout(250); const result = await page.evaluate(() => new Promise<{ frameCount: number; minimumFps: number; longTasks: unknown[] }>((resolvePromise) => { const samples: number[] = []; const loop = (time: number) => { samples.push(time); if (samples.length >= 61) { const deltas = samples.slice(1).map((value, index) => value - samples[index]!); resolvePromise({ frameCount: samples.length, minimumFps: 1_000 / Math.max(...deltas), longTasks: [] }); } else requestAnimationFrame(loop); }; requestAnimationFrame(loop); })); performance.push({ id, ...result }); }
async function captureRoute(baseURL: string, project: EvidenceProject, viewportName: keyof typeof viewports, route: keyof typeof routeContracts, browser: Browser) {
  const context = await browser.newContext(contextOptions(project, viewports[viewportName])); const page = await openedPage(context, baseURL, project, route); try { await captureStill(page, `route-${project}-${viewportName}-${route === "/" ? "root" : route.slice(1)}`, route, { project, viewport: viewportName, state: "entry" }); await measureFrames(page, `route-${project}-${viewportName}-${route === "/" ? "root" : route.slice(1)}`); if (routeContracts[route].scroll === "document") { await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await settle(page); await captureStill(page, `final-${project}-${viewportName}-${route.slice(1)}`, route, { project, viewport: viewportName, state: "final-content" }); } } finally { await context.close(); }
}
async function captureSceneStates(baseURL: string, project: EvidenceProject, browser: Browser) {
  const context = await browser.newContext(contextOptions(project)); const page = await openedPage(context, baseURL, project, "/"); try { for (let chapter = 0; chapter < evidenceScenes.length; chapter += 1) for (const state of sceneStates) { await setState(page, chapter, state.progress); await captureStill(page, `scene-${project}-native-${evidenceScenes[chapter]}-${state.id}`, "/", { project, viewport: "native", chapter: evidenceScenes[chapter], state: state.id, progress: state.progress }); } } finally { await context.close(); }
}
async function captureResponsiveScenes(baseURL: string, browser: Browser, viewportName: "tablet" | "mobile") {
  const context = await browser.newContext({ viewport: viewports[viewportName] }); const page = await openedPage(context, baseURL, "chromium-desktop", "/"); try { for (const [chapter, state] of [[1, .62], [3, .9]] as const) { await setState(page, chapter, state); await captureStill(page, `scene-chromium-${viewportName}-${evidenceScenes[chapter]}-${state === .9 ? "handoff" : "fusion"}`, "/", { project: "chromium-desktop", viewport: viewportName, chapter: evidenceScenes[chapter], state: state === .9 ? "handoff" : "fusion", progress: state }); } } finally { await context.close(); }
}
async function captureReduced(baseURL: string, browser: Browser) {
  const context = await browser.newContext({ viewport: viewports.desktop, reducedMotion: "reduce" }); const page = await openedPage(context, baseURL, "chromium-desktop", "/"); try { for (let chapter = 0; chapter < evidenceScenes.length; chapter += 1) { await setState(page, chapter, .5); await captureStill(page, `reduced-desktop-${evidenceScenes[chapter]}`, "/", { project: "chromium-desktop", viewport: "desktop", chapter: evidenceScenes[chapter], state: "reduced" }); } } finally { await context.close(); }
  for (const route of ["/collection", "/case-study"] as const) { const editorial = await browser.newContext({ viewport: viewports.mobile, reducedMotion: "reduce" }); const editorialPage = await openedPage(editorial, baseURL, "chromium-desktop", route); try { await captureStill(editorialPage, `reduced-mobile-${route.slice(1)}`, route, { project: "chromium-desktop", viewport: "mobile", state: "reduced" }); } finally { await editorial.close(); } }
}
async function captureStress(baseURL: string, browser: Browser) {
  for (const [id, viewport] of [["compact", viewports.compact], ["zoom200", { width: 720, height: 450 }]] as const) { const context = await browser.newContext({ viewport }); const page = await openedPage(context, baseURL, "chromium-desktop", "/case-study", false); try { if (id === "zoom200") await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; dispatchEvent(new Event("resize")); }); await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await captureStill(page, `stress-${id}-case-study`, "/case-study", { project: "chromium-desktop", viewport: id, state: "final-content" }); } finally { await context.close(); } }
}
async function captureFocus(baseURL: string, browser: Browser) {
  for (const contract of focusContracts) { const context = await browser.newContext({ viewport: viewports.desktop }); const page = await openedPage(context, baseURL, "chromium-desktop", contract.route); try { const target = page.locator(contract.selector).first(); await target.focus(); await page.waitForFunction((selector) => document.querySelector(selector) === document.activeElement, contract.selector); await captureStill(page, `focus-${contract.id}`, contract.route, { project: "chromium-desktop", viewport: "desktop", state: "focus" }, contract); } finally { await context.close(); } }
}
async function captureHandoffs(baseURL: string, browser: Browser) {
  const context = await browser.newContext({ viewport: viewports.desktop }); const page = await openedPage(context, baseURL, "chromium-desktop", "/"); try { for (let chapter = 0; chapter < handoffContracts.length; chapter += 1) { const contract = handoffContracts[chapter]!; const files: Record<string, string> = {}; const states: Array<[string, number]> = [["outgoing08", .8528], ["outgoing32", .8912], ["restore8067", .8067], ["restore84", .84], ["controlA", .8528], ["controlB", .8528]]; for (const [name, progressValue] of states) { await setState(page, chapter, progressValue); const path = `handoff/${contract.chapter}-${name}.png`; await page.screenshot({ path: join(evidenceDir, path), scale: "css" }); files[name] = path; } artifacts.push({ id: `handoff-${contract.chapter}`, kind: "handoff", chapter: contract.chapter, required: true, files }); } } finally { await context.close(); }
}
async function driveClock(page: Page, durationMs: number) { return page.evaluate((duration) => new Promise<number>((resolvePromise, reject) => { const bridge = (window as unknown as { __CA_TEST__?: { advance: (milliseconds: number) => void; flushFrame: () => void } }).__CA_TEST__; if (!bridge) { reject(new Error("test bridge unavailable while recording")); return; } let first: number | undefined; let prior: number | undefined; const frame = (time: number) => { if (first === undefined) first = time; if (prior !== undefined) bridge.advance(Math.max(0, time - prior)); bridge.flushFrame(); prior = time; if (time - first >= duration) resolvePromise(time - first); else requestAnimationFrame(frame); }; requestAnimationFrame(frame); }), durationMs); }
function recordingDuration(path: string) { return Number.parseFloat(command("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path])) * 1_000; }
async function captureRecording(baseURL: string, project: EvidenceProject, browser: Browser, id: string) {
  const viewport = project === "webkit-iphone-15" ? devices["iPhone 15"].viewport! : viewports.desktop; const raw = join(evidenceDir, "recordings", "raw"); await mkdir(raw, { recursive: true }); const context = await browser.newContext({ ...contextOptions(project), recordVideo: { dir: raw, size: viewport } }); const page = await openedPage(context, baseURL, project, "/"); try { await setState(page, 0, 0); await page.waitForTimeout(750); await driveClock(page, 48_000); const video = page.video(); await context.close(); if (!video) throw new Error("Playwright supplied no recording"); const source = await video.path(); const path = `recordings/${id}.mp4`; const trimStartSeconds = Math.max(0, recordingDuration(source) / 1_000 - 48); execFileSync("ffmpeg", ["-y", "-ss", trimStartSeconds.toFixed(3), "-i", source, "-t", "48", "-r", "30", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(evidenceDir, path)], { stdio: "pipe" }); await rm(source, { force: true }); artifacts.push({ id, kind: "recording", required: true, path, project, dimensions: viewport, durationMs: recordingDuration(join(evidenceDir, path)) }); } catch (error) { await context.close().catch(() => undefined); throw error; }
}
async function captureRecognition(baseURL: string, browser: Browser) {
  const modes = [
    { id: "desktop-standard", context: { viewport: viewports.desktop }, progress: .44 },
    { id: "mobile-standard", context: { viewport: viewports.mobile }, progress: .44 },
    { id: "reduced-motion", context: { viewport: viewports.desktop, reducedMotion: "reduce" as const }, progress: .5 },
  ]; const sealed: Array<Record<string, string>> = []; const publicCrops: string[] = [];
  for (const mode of modes) { const context = await browser.newContext(mode.context); const page = await openedPage(context, baseURL, "chromium-desktop", "/"); try { for (const [specimen, category] of HEROES) { const chapter = Number(specimen.slice(3, 5)) - 1; await setState(page, chapter, mode.progress); const source = page.locator(`[data-specimen-id='${specimen}']`); await source.waitFor(); const captureId = randomUUID().replace(/-/g, "").slice(0, 12); const cropPath = `recognition/crops/${captureId}.png`; const cropId = `recognition-${captureId}`; await source.evaluate((element, id) => { const rect = element.getBoundingClientRect(); const host = document.createElement("div"); host.id = id; host.style.cssText = `position:fixed;inset:0 auto auto 0;width:${Math.max(1, rect.width)}px;height:${Math.max(1, rect.height)}px;overflow:hidden;background:#eee6d7;z-index:2147483647`; const clone = element.cloneNode(true) as HTMLElement; clone.style.cssText += ";position:relative!important;inset:auto!important;width:100%!important;height:100%!important;transform:none!important;opacity:1!important;visibility:visible!important"; host.append(clone); document.body.append(host); }, cropId); try { await page.locator(`#${cropId}`).screenshot({ path: join(evidenceDir, cropPath), scale: "css" }); } finally { await page.locator(`#${cropId}`).evaluate((element) => element.remove()); } sealed.push({ captureId, specimen, category, mode: mode.id, crop: cropPath }); publicCrops.push(`crops/${captureId}.png`); } } finally { await context.close(); } }
  // The observer packet deliberately contains no specimen names, labels or mapping.
  await writeJson(join(evidenceDir, "recognition", "observer-packet.json"), { binding: currentSourceBinding(root), question: "What material object or sample is this?", crops: publicCrops.sort(), observerStatus: "sealed before observer; not scored" });
  await writeJson(join(evidenceDir, "recognition", "sealed-mapping.json"), { binding: currentSourceBinding(root), status: "sealed before observer", expectedCategoriesAndSynonyms: sealed }); artifacts.push({ id: "blinded-recognition-packet", kind: "recognition", required: true, files: { packet: "recognition/observer-packet.json", sealedMapping: "recognition/sealed-mapping.json" }, cropCount: publicCrops.length });
}
async function main() {
  await ensureFreshDestination(); await Promise.all(["stills", "metadata", "contrast/backgrounds", "handoff", "recordings", "recognition/crops", "analysis"].map((directory) => mkdir(join(evidenceDir, directory), { recursive: true })));
  const server = await startTestProductionServer(); const versions: Array<Record<string, string>> = [];
  try {
    const browsers = new Map<EvidenceProject, Browser>(); for (const project of evidenceProjects) { const browser = await browserFor(project); browsers.set(project, browser); versions.push(projectVersion(project, browser)); }
    try {
      for (const project of evidenceProjects) await captureSceneStates(server.baseURL, project, browsers.get(project)!);
      const chromiumBrowser = browsers.get("chromium-desktop")!; await captureResponsiveScenes(server.baseURL, chromiumBrowser, "tablet"); await captureResponsiveScenes(server.baseURL, chromiumBrowser, "mobile");
      for (const route of Object.keys(routeContracts) as Array<keyof typeof routeContracts>) { await captureRoute(server.baseURL, "chromium-desktop", "desktop", route, chromiumBrowser); await captureRoute(server.baseURL, "chromium-desktop", "tablet", route, chromiumBrowser); await captureRoute(server.baseURL, "chromium-desktop", "mobile", route, chromiumBrowser); }
      await captureRoute(server.baseURL, "webkit-desktop", "desktop", "/collection", browsers.get("webkit-desktop")!); await captureRoute(server.baseURL, "webkit-iphone-15", "mobile", "/case-study", browsers.get("webkit-iphone-15")!);
      await captureReduced(server.baseURL, chromiumBrowser); await captureStress(server.baseURL, chromiumBrowser); await captureFocus(server.baseURL, chromiumBrowser); await captureHandoffs(server.baseURL, chromiumBrowser); await captureRecording(server.baseURL, "chromium-desktop", chromiumBrowser, "recording-desktop-48s"); await captureRecording(server.baseURL, "webkit-iphone-15", browsers.get("webkit-iphone-15")!, "recording-mobile-48s"); await captureRecognition(server.baseURL, chromiumBrowser);
    } finally { await Promise.all([...browsers.values()].map((browser) => browser.close())); }
  } finally { await server.stop(); }
  const binding = currentSourceBinding(root); const manifest = { schemaVersion: EVIDENCE_SCHEMA_VERSION, binding, browserVersions: versions, captureScope: "full-unit-07-matrix", required: { projects: [...evidenceProjects], scenes: [...evidenceScenes], sceneStates: sceneStates.map((state) => ({ ...state })), routes: Object.keys(routeContracts), selectors: Object.entries(routeContracts).flatMap(([route, contract]) => contract.essentialSelectors.map((selector) => ({ route, selector }))), focusArtifacts: focusContracts.map((entry) => ({ ...entry })), handoffs: handoffContracts.map((entry) => ({ ...entry })), recordings: [{ id: "recording-desktop-48s", durationMs: 48_000 }, { id: "recording-mobile-48s", durationMs: 48_000 }] }, thresholds: { flash: { fps: 15, luminanceDelta: .1, areaFraction: .25, maxFlashesPerSecond: 3, maxBrightFraction: .9, maxBrightFrames: 0 }, handoff: { pixelL1: 18, outgoingMean: 4, outgoingChangedFraction: .03, restoreMean: 2, restoreChangedFraction: .015, identicalMean: .25, identicalChangedFraction: .001 } }, artifacts, performance, errors, recognition: { packet: "recognition/observer-packet.json", sealedMapping: "recognition/sealed-mapping.json", cropCount: 24, observerStatus: "not run; Iris owns fresh blind observation" } };
  await writeFile(join(evidenceDir, "manifest.json"), manifestText(manifest)); await writeFile(join(evidenceDir, "MANIFEST.md"), `# Chromatic Affinities final evidence\n\nMachine-readable contract: \`manifest.json\`.\n\n- Capture scope: full Unit 7 matrix\n- Source binding: recorded in \`manifest.json\`\n- Recognition observer status: not run; the sealed packet is ready for Iris.\n`); await writeJson(join(evidenceDir, "capture-results.json"), { pass: errors.length === 0, errors, artifactCount: artifacts.length, performanceCount: performance.length });
  if (errors.length) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
