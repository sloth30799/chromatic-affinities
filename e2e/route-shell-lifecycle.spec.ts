import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { testClock, type TestClock } from "./support/test-clock";

const tolerance = 0.003;
const browserErrors = new WeakMap<Page, string[]>();

type TimelineSnapshot = {
  chapter: string;
  progress: number;
};

async function settle(clock: TestClock) {
  await clock.flushFrame();
  await clock.flushFrame();
}

async function settleEffects(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

async function advance(clock: TestClock, milliseconds: number) {
  await clock.flushFrame();
  await clock.advance(milliseconds);
  await settle(clock);
}

async function sample(page: Page, clock: TestClock): Promise<TimelineSnapshot> {
  await settle(clock);
  return page.locator(".affinity-stage").evaluate((stage) => ({
    chapter: [...stage.classList].find((name) => name.startsWith("scene--")) ?? "",
    progress: Number.parseFloat(getComputedStyle(stage).getPropertyValue("--timeline")),
  }));
}

async function completeOpening(page: Page) {
  const clock = testClock(page);
  await clock.ready();
  await settle(clock);
  await expect(page.getByText("Opening hold", { exact: true })).toBeVisible();
  for (let attempt = 0; attempt < 8 && await page.getByText("Opening hold", { exact: true }).isVisible(); attempt += 1) {
    await clock.advance(300);
    await settle(clock);
    await settleEffects(page);
  }
  await expect(page.getByText("Playing", { exact: true })).toBeVisible();
  await settleEffects(page);
  return clock;
}

function expectSamePhase(actual: TimelineSnapshot, expected: TimelineSnapshot) {
  expect(actual.chapter).toBe(expected.chapter);
  expect(Math.abs(actual.progress - expected.progress)).toBeLessThanOrEqual(tolerance);
}

type Rect = { left: number; top: number; right: number; bottom: number };

function intersects(first: Rect, second: Rect): boolean {
  return first.left < second.right && first.right > second.left
    && first.top < second.bottom && first.bottom > second.top;
}

async function expectVisibleStudyCopy(page: Page, headingId: string, studyTitle: string) {
  const heading = page.locator(`#${headingId}`);
  await expect(heading).toContainText(studyTitle);
  const bounds = await page.evaluate((targetId) => {
    const rect = (selector: string): Rect | null => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const { left, top, right, bottom } = element.getBoundingClientRect();
      return { left, top, right, bottom };
    };
    const heading = document.getElementById(targetId);
    return {
      heading: rect(`#${targetId}`),
      headingOverflow: heading ? heading.scrollWidth > heading.clientWidth : true,
      study: rect(".campaign-masthead__study"),
      dek: rect(".chapter-dek"),
      materialNotes: rect("#field-notes"),
      playback: rect("#playback-controls"),
      worldLabels: [rect(".world-label--from"), rect(".world-label--to")].filter((value): value is Rect => value !== null),
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      documentWidth: document.documentElement.scrollWidth,
    };
  }, headingId);
  const essential = [bounds.heading, bounds.study, bounds.dek];
  expect(bounds.headingOverflow).toBe(false);
  expect(bounds.scrollX).toBe(0);
  expect(bounds.documentWidth).toBeLessThanOrEqual(bounds.width);
  for (const rect of essential) {
    expect(rect).not.toBeNull();
    expect(rect?.left).toBeGreaterThanOrEqual(0);
    expect(rect?.right).toBeLessThanOrEqual(bounds.width);
    expect(rect?.top).toBeGreaterThanOrEqual(0);
    expect(rect?.bottom).toBeLessThanOrEqual(bounds.height);
    if (rect && bounds.materialNotes) expect(intersects(rect, bounds.materialNotes)).toBe(false);
    if (rect && bounds.playback) expect(intersects(rect, bounds.playback)).toBe(false);
    for (const label of bounds.worldLabels) expect(intersects(rect!, label)).toBe(false);
  }
}

async function setVisibility(page: Page, visibility: "hidden" | "visible") {
  await page.evaluate((nextVisibility) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: nextVisibility });
    document.dispatchEvent(new Event("visibilitychange"));
  }, visibility);
}

async function expectVisibleEntryFocus(page: Page) {
  await expect(page.locator("#campaign-title")).toBeFocused();
  const measurements = await page.evaluate(() => {
    const title = document.getElementById("campaign-title")?.getBoundingClientRect();
    const study = document.querySelector(".campaign-masthead__study")?.getBoundingClientRect();
    return {
      title,
      study,
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      documentWidth: document.documentElement.scrollWidth,
    };
  });
  expect(measurements.scrollX).toBe(0);
  expect(measurements.documentWidth).toBeLessThanOrEqual(measurements.width);
  expect(measurements.title?.left).toBeGreaterThanOrEqual(0);
  expect(measurements.title?.right).toBeLessThanOrEqual(measurements.width);
  expect(measurements.title?.top).toBeGreaterThanOrEqual(0);
  expect(measurements.title?.bottom).toBeLessThanOrEqual(measurements.height);
  expect(measurements.study?.left).toBeGreaterThanOrEqual(0);
  expect(measurements.study?.right).toBeLessThanOrEqual(measurements.width);
  expect(measurements.study?.top).toBeGreaterThanOrEqual(0);
  expect(measurements.study?.bottom).toBeLessThanOrEqual(measurements.height);
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Chromatic Affinities" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.classList.contains("exhibition-route"))).toBe(true);
});

test.afterEach(({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

test("renders the static campaign register, local links, truthful material notes, and route-scoped scroll isolation", async ({ page }) => {
  await expect(page).toHaveTitle("Chromatic Affinities — Material Studies No. 01");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "A fictional self-initiated concept campaign by Atelier Chromatique: four color studies for material worlds.",
  );
  await expect(page.getByText("Atelier Chromatique presents", { exact: true })).toBeVisible();
  await expect(page.getByText("Material Studies No. 01", { exact: true })).toBeVisible();
  await expect(page.getByText("Collection 01", { exact: true })).toBeVisible();
  await expect(page.getByText("Four color studies for material worlds.", { exact: true })).toBeVisible();
  await expect(page.getByText("Self-initiated concept campaign", { exact: true })).toBeVisible();
  await expect(page.getByText("Concept, design, and development by Han.", { exact: true })).toBeVisible();
  await expect(page.getByText("Available for art-directed interactive web experiences.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Material notes/ })).toBeVisible();
  await expect(page.getByText("Field notes", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Field note", { exact: true })).toHaveCount(0);

  const routeState = await page.evaluate(() => ({
    bodyClass: document.body.classList.contains("exhibition-route"),
    htmlClass: document.documentElement.classList.contains("exhibition-document"),
    bodyOverflow: getComputedStyle(document.body).overflow,
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(routeState.bodyClass).toBe(true);
  expect(routeState.htmlClass).toBe(true);
  expect(routeState.bodyOverflow).toBe("hidden");
  expect(routeState.width).toBeLessThanOrEqual(routeState.viewport);

  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  const palette = page.getByRole("link", { name: /View the palette/ });
  const caseStudy = page.getByRole("link", { name: /Read the case study/ });
  await expect(palette).toHaveAttribute("href", "/collection");
  await expect(caseStudy).toHaveAttribute("href", "/case-study");
  await palette.focus();
  await expect(palette).toBeFocused();
  await expect(page.locator("a:focus-visible")).toContainText("View the palette");
  await palette.evaluate((link) => link.addEventListener("click", (event) => {
    link.setAttribute("data-activation", String((event as MouseEvent).detail));
    event.preventDefault();
  }, { once: true }));
  await palette.click();
  await expect(palette).toHaveAttribute("data-activation", "1");

  await caseStudy.focus();
  await expect(caseStudy).toBeFocused();
  await expect(page.locator("a:focus-visible")).toContainText("Read the case study");
  await caseStudy.evaluate((link) => link.addEventListener("click", (event) => {
    link.setAttribute("data-activation", String((event as MouseEvent).detail));
    event.preventDefault();
  }, { once: true }));
  await page.keyboard.press("Enter");
  await expect(caseStudy).toHaveAttribute("data-activation", "0");

  await page.goto("about:blank");
  expect(await page.evaluate(() => document.body.classList.contains("exhibition-route"))).toBe(false);
  expect(await page.locator(".affinity-stage").count()).toBe(0);
  expect(await page.evaluate(() => "__CA_TEST__" in window)).toBe(false);
  await page.goBack();
  const returnedClock = await completeOpening(page);
  await returnedClock.ready();
  await expectVisibleEntryFocus(page);
  const localOrigin = new URL(page.url()).origin;
  expect(requests.filter((url) => url.startsWith("http")).every((url) => new URL(url).origin === localOrigin)).toBe(true);
});

test("preserves the single-clock lifecycle through holds, visibility, orientation, live motion preference, and Back", async ({ page }) => {
  const clock = await completeOpening(page);
  await advance(clock, 1_500);
  const running = await sample(page, clock);
  expect(running.chapter).toBe("scene--navyApricot");
  expect(running.progress).toBeGreaterThan(0.1);

  await page.getByRole("button", { name: "Pause exhibition" }).click();
  const paused = await sample(page, clock);
  await advance(clock, 250);
  expectSamePhase(await sample(page, clock), paused);

  await page.getByRole("button", { name: "Play exhibition" }).click();
  const resumedStart = await sample(page, clock);
  expect(resumedStart.chapter).toBe(paused.chapter);
  expect(resumedStart.progress).toBeGreaterThanOrEqual(paused.progress - tolerance);
  await advance(clock, 250);
  const resumed = await sample(page, clock);
  expect(resumed.chapter).toBe(paused.chapter);
  expect(resumed.progress - resumedStart.progress).toBeGreaterThan(0.005);
  expect(resumed.progress - resumedStart.progress).toBeLessThan(0.04);

  await setVisibility(page, "hidden");
  await expect(page.locator("main.exhibition")).toHaveAttribute("data-playback-status", "held");
  await settleEffects(page);
  const hidden = await sample(page, clock);
  await advance(clock, 500);
  expectSamePhase(await sample(page, clock), hidden);
  await setVisibility(page, "visible");
  await expect(page.locator("main.exhibition")).toHaveAttribute("data-playback-status", "playing");
  await settleEffects(page);
  expectSamePhase(await sample(page, clock), hidden);
  await advance(clock, 250);
  expect((await sample(page, clock)).progress).toBeGreaterThan(hidden.progress + 0.005);

  await page.setViewportSize({ width: 390, height: 844 });
  const portrait = await sample(page, clock);
  await page.setViewportSize({ width: 844, height: 390 });
  expectSamePhase(await sample(page, clock), portrait);
  await page.setViewportSize({ width: 390, height: 844 });
  expectSamePhase(await sample(page, clock), portrait);

  const phaseBeforeReduce = await sample(page, clock);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("main.exhibition")).toHaveAttribute("data-motion-preference", "reduce");
  const reduced = await sample(page, clock);
  expect(reduced.chapter).toBe(phaseBeforeReduce.chapter);
  await advance(clock, 500);
  expectSamePhase(await sample(page, clock), reduced);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("main.exhibition")).toHaveAttribute("data-motion-preference", "no-preference");
  const returnedPreference = await sample(page, clock);
  expect(returnedPreference.chapter).toBe(phaseBeforeReduce.chapter);
  expect(Math.abs(returnedPreference.progress - phaseBeforeReduce.progress)).toBeLessThanOrEqual(tolerance);
  await advance(clock, 500);
  expectSamePhase(await sample(page, clock), returnedPreference);
  await page.getByRole("button", { name: "Play exhibition" }).click();
  const explicitResume = await sample(page, clock);
  await advance(clock, 250);
  const afterExplicitResume = await sample(page, clock);
  expect(afterExplicitResume.progress - explicitResume.progress).toBeGreaterThan(0.005);
  expect(afterExplicitResume.progress - explicitResume.progress).toBeLessThan(0.04);

  const notes = page.getByRole("button", { name: /Material notes/ });
  await notes.click();
  const indexHold = await sample(page, clock);
  await advance(clock, 250);
  expectSamePhase(await sample(page, clock), indexHold);
  await page.getByRole("button", { name: "Cobalt Glaze Tile", exact: true }).click();
  await expect(page.getByRole("note", { name: "Cobalt Glaze Tile" })).toContainText("depth gathers where glaze thickens at the edge.");
  const noteHold = await sample(page, clock);
  await advance(clock, 250);
  expectSamePhase(await sample(page, clock), noteHold);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await page.goto("about:blank");
  await page.goBack();
  const returned = await completeOpening(page);
  const backSnapshot = await sample(page, returned);
  expect(backSnapshot.chapter).toBe("scene--navyApricot");
  expect(Math.abs(backSnapshot.progress)).toBeLessThanOrEqual(tolerance);
  await expectVisibleEntryFocus(page);
});

test("keeps entry focus unclipped at desktop, mobile, and reduced-motion stress widths", async ({ page }) => {
  await expectVisibleEntryFocus(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectVisibleEntryFocus(page);

  await page.setViewportSize({ width: 320, height: 568 });
  await expectVisibleEntryFocus(page);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await testClock(page).ready();
  await settle(testClock(page));
  await expectVisibleEntryFocus(page);
});

test("keeps the full Study 03 composition inside the 320px stress viewport", async ({ page, browserName }) => {
  const clock = testClock(page);
  await clock.ready();
  await page.setViewportSize({ width: 320, height: 568 });
  await clock.setChapter(2);
  await clock.setProgress(.45);
  await settle(clock);
  await expectVisibleStudyCopy(page, "ember-glacier-heading", "Vermilion Ember↔Glacier Cyan");

  if (browserName === "chromium") {
    const evidenceDirectory = process.env.CA_ATTEMPT_2_EVIDENCE;
    expect(evidenceDirectory).toBeTruthy();
    await page.screenshot({ path: join(evidenceDirectory!, "study-03-320x568-standard.png") });
  }

  await page.setViewportSize({ width: 844, height: 390 });
  await clock.setChapter(2);
  await clock.setProgress(.45);
  await settle(clock);
  await expectVisibleStudyCopy(page, "ember-glacier-heading", "Vermilion Ember↔Glacier Cyan");

  await page.setViewportSize({ width: 390, height: 844 });
  await clock.setChapter(3);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("main.exhibition")).toHaveAttribute("data-motion-preference", "reduce");
  await settle(clock);
  await expectVisibleStudyCopy(page, "cacao-ivory-heading", "Cacao Earth↔Porcelain Ivory");

  if (browserName === "chromium") {
    await page.screenshot({ path: join(process.env.CA_ATTEMPT_2_EVIDENCE!, "study-04-390x844-reduced.png") });
  }
});

test("keeps invalid and App Router recovery presentation ahead of playback setup, with no new independent animation vocabulary", () => {
  const exhibition = readFileSync(join(process.cwd(), "components/exhibition/Exhibition.tsx"), "utf8");
  const error = readFileSync(join(process.cwd(), "app/error.tsx"), "utf8");
  const campaignShell = readFileSync(join(process.cwd(), "styles/campaign/shell.css"), "utf8");
  const validationGuard = exhibition.indexOf("if (!exhibitionDataValidation.valid) return <ExhibitionUnavailable />;");
  const runtimeMount = exhibition.indexOf("return <ExhibitionRuntime />;");

  expect(validationGuard).toBeGreaterThanOrEqual(0);
  expect(validationGuard).toBeLessThan(runtimeMount);
  expect(error).toContain("This page could not be opened.");
  expect(error).not.toContain("exhibition could not be opened");
  expect(campaignShell).not.toMatch(/@keyframes|animation\s*:/);
  expect(campaignShell).not.toMatch(/\bcard\b/i);
  expect(readdirSync(join(process.cwd(), "components/campaign"))).toEqual(expect.arrayContaining([
    "CampaignLinks.tsx",
    "CampaignMasthead.tsx",
    "RouteEntryFocus.tsx",
  ]));
});
