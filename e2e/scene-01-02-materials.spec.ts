import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { testClock } from "./support/test-clock";

type StudyContract = Readonly<{
  chapterIndex: number;
  chapterId: string;
  sceneClass: string;
  specimenIds: readonly string[];
  heroIds: readonly string[];
  hotspots: readonly string[];
  outgoingId: string;
  outgoingSide: "left" | "right";
}>;

const studies: readonly StudyContract[] = [
  {
    chapterIndex: 0,
    chapterId: "navy-apricot",
    sceneClass: "scene--navyApricot",
    specimenIds: ["AC-01-A", "AC-01-B", "AC-01-C"],
    heroIds: ["AC-01-A", "AC-01-C"],
    hotspots: ["raven-feather", "night-flower", "peach-stone"],
    outgoingId: "AC-01-A",
    outgoingSide: "left",
  },
  {
    chapterIndex: 1,
    chapterId: "moss-orchid",
    sceneClass: "scene--mossOrchid",
    specimenIds: ["AC-02-A", "AC-02-B", "AC-02-C"],
    heroIds: ["AC-02-A", "AC-02-B"],
    hotspots: ["lichen-map", "beetle-wing", "orchid-throat"],
    outgoingId: "AC-02-B",
    outgoingSide: "right",
  },
];

type Bounds = Readonly<{ left: number; top: number; width: number; height: number }>;
type CropPixels = Readonly<{ data: Buffer; channels: number }>;

async function settleFrame(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
}

async function readyAtChapter(page: Page, study: StudyContract, progress = 0.4) {
  const clock = testClock(page);
  await clock.ready();
  await clock.setChapter(study.chapterIndex);
  await expect(page.locator(`.affinity-stage.${study.sceneClass}`)).toBeVisible();
  await clock.setProgress(progress);
  await settleFrame(page);
  return clock;
}

async function pauseForGeometry(page: Page) {
  const clock = testClock(page);
  await clock.ready();
  await clock.flushFrame();
  await clock.flushFrame();
  await clock.advance(300);
  await clock.flushFrame();
  const pause = page.getByRole("button", { name: "Pause exhibition" });
  if (await pause.isVisible()) await pause.click();
  return clock;
}

async function readBounds(page: Page, selector: string): Promise<Bounds> {
  return page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  });
}

async function expectHotspotsIntersectSpecimens(page: Page, study: StudyContract) {
  for (let index = 0; index < study.specimenIds.length; index += 1) {
    const specimenId = study.specimenIds[index]!;
    const hotspotId = study.hotspots[index]!;
    const intersection = await page.locator(`#hotspot-${study.chapterId}-${hotspotId}`).evaluate((button, id) => {
      const target = document.querySelector<HTMLElement>(`[data-specimen-id="${id}"]`);
      const hotspot = button.getBoundingClientRect();
      const specimen = target?.getBoundingClientRect();
      if (!specimen) return { present: false, intersects: false };
      const x = hotspot.left + hotspot.width / 2;
      const y = hotspot.top + hotspot.height / 2;
      return {
        present: specimen.width > 0 && specimen.height > 0,
        intersects: x >= specimen.left && x <= specimen.right && y >= specimen.top && y <= specimen.bottom,
      };
    }, specimenId);
    expect(intersection.present, `${study.chapterId} ${specimenId} should be visible`).toBe(true);
    expect(intersection.intersects, `${hotspotId} should land inside ${specimenId}`).toBe(true);
  }
}

function expectSameSilhouette(before: Bounds, after: Bounds, id: string) {
  expect(after.left, `${id} left`).toBeCloseTo(before.left, 1);
  expect(after.top, `${id} top`).toBeCloseTo(before.top, 1);
  expect(after.width, `${id} width`).toBeCloseTo(before.width, 1);
  expect(after.height, `${id} height`).toBeCloseTo(before.height, 1);
}

async function cropScreenshot(page: Page, side: StudyContract["outgoingSide"]): Promise<CropPixels> {
  const screenshot = await page.screenshot({ scale: "css" });
  const decoded = await sharp(screenshot).raw().toBuffer({ resolveWithObject: true });
  const left = side === "left" ? 0 : Math.floor(decoded.info.width * 0.78);
  const width = Math.floor(decoded.info.width * 0.22);
  const top = Math.floor(decoded.info.height * 0.18);
  const height = Math.floor(decoded.info.height * 0.64);
  const cropped = await sharp(decoded.data, {
    raw: { width: decoded.info.width, height: decoded.info.height, channels: decoded.info.channels },
  }).extract({ left, top, width, height }).raw().toBuffer({ resolveWithObject: true });
  return { data: cropped.data, channels: cropped.info.channels };
}

function pixelDelta(first: CropPixels, second: CropPixels) {
  expect(first.data.length).toBe(second.data.length);
  expect(first.channels).toBe(second.channels);
  let total = 0;
  let changed = 0;
  const pixelCount = first.data.length / first.channels;

  for (let offset = 0; offset < first.data.length; offset += first.channels) {
    const delta = Math.abs(first.data[offset]! - second.data[offset]!)
      + Math.abs(first.data[offset + 1]! - second.data[offset + 1]!)
      + Math.abs(first.data[offset + 2]! - second.data[offset + 2]!);
    total += delta / 3;
    if (delta > 18) changed += 1;
  }

  return { mean: total / pixelCount, changedRatio: changed / pixelCount };
}

test("studies 01–02 mount only their exact shared specimens and hold both heroes through calm", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await pauseForGeometry(page);

  for (const study of studies) {
    const clock = await readyAtChapter(page, study, 0.4);
    await expect(page.locator("[data-specimen-id]")).toHaveCount(3);
    const renderedIds = await page.locator("[data-specimen-id]").evaluateAll((nodes) => (
      nodes.map((node) => node.getAttribute("data-specimen-id"))
    ));
    expect(renderedIds).toEqual(study.specimenIds);
    await expectHotspotsIntersectSpecimens(page, study);

    await clock.setProgress(0.35);
    await settleFrame(page);
    const calmStart = await Promise.all(study.heroIds.map((id) => readBounds(page, `[data-specimen-id="${id}"]`)));
    await clock.setProgress(0.4333);
    await settleFrame(page);
    const calmEnd = await Promise.all(study.heroIds.map((id) => readBounds(page, `[data-specimen-id="${id}"]`)));
    for (let index = 0; index < study.heroIds.length; index += 1) {
      expectSameSilhouette(calmStart[index]!, calmEnd[index]!, study.heroIds[index]!);
    }
  }

  await page.screenshot({ path: testInfo.outputPath("studies-01-02-desktop-calm.png") });
});

for (const viewport of [
  { name: "mobile", width: 390, height: 844, reduced: false },
  { name: "reduced-motion", width: 390, height: 844, reduced: true },
] as const) {
  test(`studies 01–02 keep hotspot anchors inside specimen boxes on ${viewport.name}`, async ({ page }, testInfo) => {
    if (viewport.reduced) await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    if (!viewport.reduced) await pauseForGeometry(page);
    for (const study of studies) {
      const clock = await readyAtChapter(page, study, 0.4);
      await expect(page.locator(`[data-specimen-id="${study.specimenIds[0]}"]`)).toHaveAttribute("data-specimen-viewport", "mobile");
      await expectHotspotsIntersectSpecimens(page, study);
      if (viewport.reduced) {
        await expect(page.locator(".transition-layer")).toBeHidden();
        const animations = await page.locator(".scene-art").evaluate((scene) => scene.getAnimations({ subtree: true }).length);
        expect(animations).toBe(0);
      } else {
        await clock.setProgress(0.4);
      }
    }

    await page.screenshot({ path: testInfo.outputPath(`studies-01-02-${viewport.name}.png`) });
  });
}

test("both owned handoffs keep their outgoing specimen mounted and change its side crop", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await pauseForGeometry(page);

  for (const study of studies) {
    const clock = await readyAtChapter(page, study, 0.84 + 0.16 * 0.08);
    await expect(page.locator(`[data-specimen-id="${study.outgoingId}"]`)).toBeAttached();
    const earlyHandoff = await page.locator(".affinity-stage").evaluate((stage) => Number(getComputedStyle(stage).getPropertyValue("--handoff")));
    const earlyCrop = await cropScreenshot(page, study.outgoingSide);

    await clock.setProgress(0.84 + 0.16 * 0.32);
    await settleFrame(page);
    await expect(page.locator(`[data-specimen-id="${study.outgoingId}"]`)).toBeAttached();
    const laterHandoff = await page.locator(".affinity-stage").evaluate((stage) => Number(getComputedStyle(stage).getPropertyValue("--handoff")));
    const laterCrop = await cropScreenshot(page, study.outgoingSide);
    const delta = pixelDelta(earlyCrop, laterCrop);

    expect(laterHandoff).toBeGreaterThan(earlyHandoff);
    expect(delta.mean, `${study.chapterId} outgoing crop mean delta`).toBeGreaterThanOrEqual(4);
    expect(delta.changedRatio, `${study.chapterId} outgoing crop changed ratio`).toBeGreaterThanOrEqual(0.03);
    await page.screenshot({ path: testInfo.outputPath(`${study.chapterId}-handoff-32.png`) });
  }
});

test("studies 01–02 add no independent animation, remote request, overflow, or card vocabulary", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await pauseForGeometry(page);

  for (const study of studies) {
    await readyAtChapter(page, study, 0.4);
    const sceneState = await page.locator(".scene-art").evaluate((scene) => ({
      running: scene.getAnimations({ subtree: true }).length,
      animationNames: [...scene.querySelectorAll<HTMLElement>("*")].map((node) => getComputedStyle(node).animationName),
      documentWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      cardClasses: [...document.querySelectorAll<HTMLElement>("[class]")]
        .flatMap((node) => [...node.classList])
        .filter((className) => /card/i.test(className)),
    }));
    expect(sceneState.running).toBe(0);
    expect(sceneState.animationNames.every((name) => name === "none")).toBe(true);
    expect(sceneState.scrollWidth).toBeLessThanOrEqual(sceneState.documentWidth);
    expect(sceneState.cardClasses).toEqual([]);
  }

  const remote = requests.filter((url) => {
    const parsed = new URL(url);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname !== "127.0.0.1";
  });
  expect(remote).toEqual([]);
});
