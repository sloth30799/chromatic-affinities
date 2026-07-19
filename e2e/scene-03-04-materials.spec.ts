import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { testClock } from "./support/test-clock";

type HotspotContract = Readonly<{ id: string; target: string; name: string }>;
type StudyContract = Readonly<{
  chapterIndex: number;
  chapterId: string;
  sceneClass: string;
  specimenIds: readonly string[];
  heroIds: readonly string[];
  hotspots: readonly HotspotContract[];
  outgoingId: string;
  outgoingSide: "left" | "right";
}>;

const studies: readonly StudyContract[] = [
  {
    chapterIndex: 2,
    chapterId: "ember-glacier",
    sceneClass: "scene--emberGlacier",
    specimenIds: ["AC-03-A", "AC-03-B", "AC-03-C"],
    heroIds: ["AC-03-A", "AC-03-C"],
    hotspots: [
      { id: "poppy", target: "AC-03-A", name: "Vermilion Lacquer Plate" },
      { id: "koi-scale", target: "AC-03-B", name: "Ember Pigment Cast" },
      { id: "ice-facet", target: "AC-03-C", name: "Glacier Resin Shard" },
    ],
    outgoingId: "AC-03-C",
    outgoingSide: "right",
  },
  {
    chapterIndex: 3,
    chapterId: "cacao-ivory",
    sceneClass: "scene--cacaoIvory",
    specimenIds: ["AC-04-A", "AC-04-B", "AC-04-C"],
    heroIds: ["AC-04-A", "AC-04-B"],
    hotspots: [
      { id: "cacao-ridge", target: "AC-04-A", name: "Cacao Clay Body" },
      { id: "walnut-shell", target: "AC-04-B", name: "Porcelain Vessel" },
      { id: "porcelain-edge", target: "AC-04-C", name: "Folded Ceramic Sheet" },
    ],
    outgoingId: "AC-04-B",
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
  for (const hotspot of study.hotspots) {
    const button = page.locator(`#hotspot-${study.chapterId}-${hotspot.id}`);
    await expect(button).toHaveAttribute("aria-label", `Discover ${hotspot.name}`);
    const intersection = await button.evaluate((element, specimenId) => {
      const target = document.querySelector<HTMLElement>(`[data-specimen-id="${specimenId}"]`);
      const hotspotBounds = element.getBoundingClientRect();
      const specimenBounds = target?.getBoundingClientRect();
      if (!specimenBounds) return { present: false, intersects: false };
      const x = hotspotBounds.left + hotspotBounds.width / 2;
      const y = hotspotBounds.top + hotspotBounds.height / 2;
      return {
        present: specimenBounds.width > 0 && specimenBounds.height > 0,
        intersects: x >= specimenBounds.left && x <= specimenBounds.right
          && y >= specimenBounds.top && y <= specimenBounds.bottom,
      };
    }, hotspot.target);
    expect(intersection.present, `${study.chapterId} ${hotspot.target} should be visible`).toBe(true);
    expect(intersection.intersects, `${hotspot.id} should land inside ${hotspot.target}`).toBe(true);
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
    total += delta;
    if (delta > 18) changed += 1;
  }

  return { mean: total / pixelCount, changedRatio: changed / pixelCount };
}

test("studies 03–04 mount their exact shared specimens and hold both heroes through calm", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await pauseForGeometry(page);

  for (const study of studies) {
    const clock = await readyAtChapter(page, study, 0.4);
    await expect(page.locator("[data-specimen-id]")).toHaveCount(3);
    await expect(page.locator(".scene-specimen")).toHaveCount(3);
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

  await page.screenshot({ path: testInfo.outputPath("studies-03-04-desktop-calm.png") });
});

for (const viewport of [
  { name: "mobile", width: 390, height: 844, reduced: false },
  { name: "reduced-motion", width: 390, height: 844, reduced: true },
] as const) {
  test(`studies 03–04 keep exact hotspot targets inside shared specimen boxes on ${viewport.name}`, async ({ page }, testInfo) => {
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

    await page.screenshot({ path: testInfo.outputPath(`studies-03-04-${viewport.name}.png`) });
  });
}

test("03→04 keeps Glacier Resin Shard life and 04→01 keeps Porcelain Vessel life in bounded handoffs", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await pauseForGeometry(page);

  for (const study of studies) {
    const clock = await readyAtChapter(page, study, 0.8067);
    const outgoing = page.locator(`[data-specimen-id="${study.outgoingId}"]`);
    await expect(outgoing).toBeAttached();

    const earlyRestoreCrop = await cropScreenshot(page, study.outgoingSide);
    await clock.setProgress(0.84);
    await settleFrame(page);
    const lateRestoreCrop = await cropScreenshot(page, study.outgoingSide);
    const restoreDelta = pixelDelta(earlyRestoreCrop, lateRestoreCrop);
    expect(restoreDelta.mean, `${study.chapterId} restore crop mean RGB delta`).toBeGreaterThanOrEqual(2);
    expect(restoreDelta.changedRatio, `${study.chapterId} restore crop changed ratio`).toBeGreaterThanOrEqual(0.015);

    await clock.setProgress(0.84 + 0.16 * 0.08);
    await settleFrame(page);
    const earlyHandoff = await page.locator(".affinity-stage").evaluate((stage) => Number(getComputedStyle(stage).getPropertyValue("--handoff")));
    const earlyCrop = await cropScreenshot(page, study.outgoingSide);

    await clock.setProgress(0.84 + 0.16 * 0.32);
    await settleFrame(page);
    await expect(outgoing).toBeAttached();
    const laterHandoff = await page.locator(".affinity-stage").evaluate((stage) => Number(getComputedStyle(stage).getPropertyValue("--handoff")));
    const laterCrop = await cropScreenshot(page, study.outgoingSide);
    const delta = pixelDelta(earlyCrop, laterCrop);

    expect(laterHandoff).toBeGreaterThan(earlyHandoff);
    expect(delta.mean, `${study.chapterId} outgoing crop mean delta`).toBeGreaterThanOrEqual(4);
    expect(delta.changedRatio, `${study.chapterId} outgoing crop changed ratio`).toBeGreaterThanOrEqual(0.03);
    await page.screenshot({ path: testInfo.outputPath(`${study.chapterId}-handoff-32.png`) });
  }

  const clock = await readyAtChapter(page, studies[1]!, 0.84 + 0.16 * 0.5);
  void clock;
  await expect(page.locator('[data-specimen-id="AC-04-B"]')).toBeAttached();
  const bounded = await page.locator(".ensemble-return-handoff > *").evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
  }));
  for (const bounds of bounded) {
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(1440);
    expect(bounds.bottom).toBeLessThanOrEqual(900);
  }
});

test("studies 03–04 add no independent animation, overflow, generic cards, or remote request", async ({ page }) => {
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
