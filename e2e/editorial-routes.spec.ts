import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { testClock } from "./support/test-clock";

const studies = [
  {
    anchor: "study-01", number: "01", title: "Tidal Aperture", feeling: "depth becoming warmth.",
    colors: ["Midnight Navy", "#071A2D", "Solar Apricot", "#FFB36B"],
    specimens: ["AC-01-A", "Cobalt Glaze Tile", "AC-01-B", "Tidal Lacquer Panel", "AC-01-C", "Solar Mineral Cake"],
  },
  {
    anchor: "study-02", number: "02", title: "Botanical Fluorescence", feeling: "organic growth becoming electric.",
    colors: ["Moss Verdant", "#38523B", "Electric Orchid", "#C377FF"],
    specimens: ["AC-02-A", "Verdant Organza", "AC-02-B", "Orchid Signal Weave", "AC-02-C", "Botanical Pigment Vial"],
  },
  {
    anchor: "study-03", number: "03", title: "Thermal Fracture", feeling: "velocity meeting stillness.",
    colors: ["Vermilion Ember", "#E4472E", "Glacier Cyan", "#8FE7F2"],
    specimens: ["AC-03-A", "Vermilion Lacquer Plate", "AC-03-B", "Ember Pigment Cast", "AC-03-C", "Glacier Resin Shard"],
  },
  {
    anchor: "study-04", number: "04", title: "Material Fold", feeling: "weight becoming refinement.",
    colors: ["Cacao Earth", "#4A2C24", "Porcelain Ivory", "#F3E8D3"],
    specimens: ["AC-04-A", "Cacao Clay Body", "AC-04-B", "Porcelain Vessel", "AC-04-C", "Folded Ceramic Sheet"],
  },
] as const;

const browserErrors = new WeakMap<Page, string[]>();
const privateOrUnverifiableVocabulary = /control-center|worker|session id|run id|private evidence|client outcome|award|launched to|user count|booking|mailto:|https?:\/\//i;

function editorialState(page: Page) {
  return page.evaluate(() => ({
    scrollX: window.scrollX,
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyLocked: document.body.classList.contains("exhibition-route"),
    documentLocked: document.documentElement.classList.contains("exhibition-document"),
    hasStage: document.querySelector(".affinity-stage") !== null,
    hasTestBridge: "__CA_TEST__" in window,
    animations: document.querySelectorAll<HTMLElement>("[data-editorial-route] *").length > 0
      ? [...document.querySelectorAll<HTMLElement>("[data-editorial-route], [data-editorial-route] *")]
        .flatMap((element) => element.getAnimations({ subtree: false }).map((animation) => animation.playState))
      : [],
  }));
}

async function expectEntryFocus(page: Page, titleId: string) {
  await expect(page.locator(`#${titleId}`)).toBeFocused();
  const bounds = await page.locator(`#${titleId}`).evaluate((heading) => {
    const rect = heading.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: window.innerWidth, height: window.innerHeight, scrollX: window.scrollX, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(bounds.scrollX).toBe(0);
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width);
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.width);
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
}

async function expectReachableFinalContent(page: Page, selector: string) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const result = await page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: window.innerHeight, scrollX: window.scrollX, width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(result.scrollX).toBe(0);
  expect(result.scrollWidth).toBeLessThanOrEqual(result.width);
  expect(result.top).toBeLessThan(result.height);
  expect(result.bottom).toBeGreaterThan(0);
}

async function expectLocalRequests(page: Page, requests: string[]) {
  const origin = new URL(page.url()).origin;
  const remote = requests.filter((url) => /^https?:\/\//.test(url) && new URL(url).origin !== origin);
  expect(remote).toEqual([]);
}

function contrastRatio(first: [number, number, number], second: [number, number, number]) {
  const luminance = ([red, green, blue]: [number, number, number]) => {
    const channels = [red, green, blue].map((channel) => {
      const normalized = channel / 255;
      return normalized <= .03928 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
    });
    return .2126 * channels[0]! + .7152 * channels[1]! + .0722 * channels[2]!;
  };
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter! + .05) / (darker! + .05);
}

function rgb(value: string): [number, number, number] {
  const match = value.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number);
  if (!match || match.length !== 3) throw new Error(`Expected an RGB color, received ${value}`);
  return [match[0]!, match[1]!, match[2]!];
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
});

test.afterEach(({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

test("records the current source binding with the browser evidence", ({}, testInfo) => {
  const binding = {
    head: process.env.CA_SOURCE_HEAD,
    trackedDigest: process.env.CA_TRACKED_DIGEST,
    untrackedManifestDigest: process.env.CA_UNTRACKED_DIGEST,
    combinedBinding: process.env.CA_COMBINED_BINDING,
    packageLock: process.env.CA_PACKAGE_LOCK_DIGEST,
  };
  expect(Object.values(binding).every(Boolean)).toBe(true);
  writeFileSync(testInfo.outputPath("source-binding.json"), `${JSON.stringify(binding, null, 2)}\n`);
});

test("collection is a static, focused material register with all twelve frozen specimens", async ({ page }, testInfo) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/collection");

  await expect(page).toHaveTitle("Collection 01 — Material Studies | Chromatic Affinities");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Collection 01 is a fictional, self-initiated material studies concept campaign by Atelier Chromatique.");
  await expectEntryFocus(page, "collection-title");
  await expect(page.getByText("Atelier Chromatique presents", { exact: true })).toBeVisible();
  await expect(page.getByText("Material Studies No. 01", { exact: true })).toBeVisible();
  await expect(page.getByText("Self-initiated concept campaign", { exact: true })).toBeVisible();
  await expect(page.locator("[data-study-figure]")).toHaveCount(12);
  await expect(page.locator("[data-specimen-register]")).toHaveCount(12);
  await expect(page.locator("[data-specimen-id]")).toHaveCount(12);

  for (const study of studies) {
    const section = page.locator(`#${study.anchor}`);
    await expect(section).toBeVisible();
    await expect(section).toContainText(`Study ${study.number}`);
    await expect(section).toContainText(study.title);
    await expect(section).toContainText(study.feeling);
    for (const value of [...study.colors, ...study.specimens]) await expect(section).toContainText(value);
  }

  const specimenLinks = await page.locator("[data-study-figure]").evaluateAll((figures) => figures.map((figure) => ({
    id: figure.getAttribute("data-study-figure"),
    identifier: figure.querySelector("[data-specimen-register]")?.getAttribute("data-specimen-register"),
    note: figure.textContent?.includes("Note") ?? false,
  })));
  expect(specimenLinks.every((figure) => figure.id === figure.identifier && figure.note)).toBe(true);

  await page.locator('a[href="#study-03"]').click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#study-03");
  await page.getByRole("link", { name: "04", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => new URL(page.url()).hash).toBe("#study-04");
  await page.screenshot({ path: testInfo.outputPath("collection-1440x900.png"), fullPage: true, scale: "css" });
  await expectReachableFinalContent(page, ".collection-footer");
  await expectLocalRequests(page, requests);
});

test("case study states the real local outcome and renders every proof artifact", async ({ page }, testInfo) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/case-study");

  await expect(page).toHaveTitle("Project Case Study — Chromatic Affinities | Chromatic Affinities");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "A local, self-initiated case study for Chromatic Affinities, a fictional Atelier Chromatique material studies concept.");
  await expectEntryFocus(page, "case-study-title");
  await expect(page.getByText("Project case study", { exact: true })).toBeVisible();
  await expect(page.getByText("Atelier Chromatique is fictional.", { exact: false })).toBeVisible();
  await expect(page.getByText("Self-initiated concept campaign", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /How can a materials studio make color/ })).toBeVisible();
  for (const section of ["Response", "Four-study system", "Motion system", "Material translation", "Accessibility and responsive behavior", "Implementation", "Authored constraints and tradeoffs", "Role and outcome"]) {
    await expect(page.getByText(section, { exact: false }).first()).toBeVisible();
  }
  await expect(page.locator(".case-system__row")).toHaveCount(4);
  await expect(page.locator(".motion-score li")).toHaveCount(6);
  await expect(page.locator(".material-stills [data-study-figure]")).toHaveCount(4);
  await expect(page.getByText("Standard-versus-reduced-motion comparison.", { exact: true })).toBeVisible();
  await expect(page.getByText("Desktop-versus-mobile composition pair:", { exact: false })).toBeVisible();
  await expect(page.locator(".tradeoff-register > div")).toHaveCount(4);
  await expect(page.getByText("Concept, design, and development by Han.", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Available for art-directed interactive web experiences.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Working with Han", exact: true })).toHaveAttribute("href", "#availability");
  await expect(page.locator("#availability")).toBeVisible();

  const visibleCopy = await page.locator("main").innerText();
  expect(visibleCopy).not.toMatch(privateOrUnverifiableVocabulary);
  const outboundLinks = await page.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? "").filter((href) => /^(mailto:|https?:)/.test(href)));
  expect(outboundLinks).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("case-study-1440x900.png"), fullPage: true, scale: "css" });
  await expectReachableFinalContent(page, "#availability");
  await expectLocalRequests(page, requests);
});

test("editorial routes tear down the exhibition and route Back restores heading focus", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".affinity-stage")).toBeVisible();
  await page.getByRole("link", { name: /View the palette/ }).click();
  await expect(page).toHaveURL(/\/collection$/);
  const collection = await editorialState(page);
  expect(collection.bodyLocked).toBe(false);
  expect(collection.documentLocked).toBe(false);
  expect(collection.hasStage).toBe(false);
  expect(collection.hasTestBridge).toBe(false);
  expect(collection.animations).toEqual([]);
  await expectEntryFocus(page, "collection-title");

  await page.getByRole("link", { name: "Project case study", exact: true }).first().click();
  await expect(page).toHaveURL(/\/case-study$/);
  await expectEntryFocus(page, "case-study-title");
  await page.goBack();
  await expect(page).toHaveURL(/\/collection$/);
  await expectEntryFocus(page, "collection-title");
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".affinity-stage")).toBeVisible();
  await expect(page.locator("#campaign-title")).toBeFocused();
  await expect.poll(() => page.evaluate(() => "__CA_TEST__" in window)).toBe(true);
  const clock = testClock(page);
  await clock.ready();
  await clock.flushFrame();
  const restart = await page.locator(".affinity-stage").evaluate((stage) => ({
    chapter: [...stage.classList].find((name) => name.startsWith("scene--")),
    progress: Number.parseFloat(getComputedStyle(stage).getPropertyValue("--timeline")),
  }));
  expect(restart.chapter).toBe("scene--navyApricot");
  expect(Math.abs(restart.progress)).toBeLessThanOrEqual(.003);
});

test("editorial layouts remain static, keyboard-usable, and bounded across mobile, short landscape, zoom, and reduced motion", async ({ page, browserName }, testInfo) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/collection");
  await expectEntryFocus(page, "collection-title");
  await page.screenshot({ path: testInfo.outputPath("collection-390x844.png"), fullPage: true, scale: "css" });
  await page.setViewportSize({ width: 320, height: 568 });
  await expectReachableFinalContent(page, ".collection-footer");
  await page.screenshot({ path: testInfo.outputPath("collection-320x568.png"), fullPage: true, scale: "css" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/case-study");
  await expectEntryFocus(page, "case-study-title");
  await page.screenshot({ path: testInfo.outputPath("case-study-390x844.png"), fullPage: true, scale: "css" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await editorialState(page);
  expect(reduced.animations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("case-study-390x844-reduced.png"), fullPage: true, scale: "css" });
  await page.setViewportSize({ width: 320, height: 568 });
  if (browserName === "chromium") {
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
    await expect.poll(() => page.evaluate(() => window.visualViewport?.scale ?? 1)).toBeGreaterThanOrEqual(2);
  } else {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
      window.dispatchEvent(new Event("resize"));
    });
  }
  await expectReachableFinalContent(page, "#availability");
  await page.screenshot({ path: testInfo.outputPath("case-study-320x568-200-percent.png"), fullPage: true, scale: "css" });
  await page.setViewportSize({ width: 844, height: 390 });
  const landscape = await editorialState(page);
  expect(landscape.scrollX).toBe(0);
  expect(landscape.scrollWidth).toBeLessThanOrEqual(landscape.viewport);

  const focus = page.getByRole("link", { name: "Collection 01", exact: true }).first();
  await focus.focus();
  await expect(focus).toBeFocused();
  await expect(page.locator("a:focus-visible")).toHaveCount(1);
  const colors = await focus.evaluate((link) => ({
    outline: getComputedStyle(link).outlineColor,
    foreground: getComputedStyle(link).color,
    background: getComputedStyle(document.querySelector(".case-study-page")!).backgroundColor,
  }));
  expect(colors.outline).not.toBe("rgba(0, 0, 0, 0)");
  expect(contrastRatio(rgb(colors.outline), rgb(colors.background))).toBeGreaterThanOrEqual(3);
  expect(contrastRatio(rgb(colors.foreground), rgb(colors.background))).toBeGreaterThanOrEqual(4.5);
});

test("route recovery and source contracts remain route-specific and free of editorial anti-patterns", () => {
  const root = process.cwd();
  const collectionPage = readFileSync(join(root, "app/collection/page.tsx"), "utf8");
  const caseStudyPage = readFileSync(join(root, "app/case-study/page.tsx"), "utf8");
  const collectionError = readFileSync(join(root, "app/collection/error.tsx"), "utf8");
  const caseStudyError = readFileSync(join(root, "app/case-study/error.tsx"), "utf8");
  const collectionStyles = readFileSync(join(root, "styles/campaign/collection.css"), "utf8");
  const caseStudyStyles = readFileSync(join(root, "styles/campaign/case-study.css"), "utf8");
  const productSource = [collectionPage, caseStudyPage, collectionError, caseStudyError, collectionStyles, caseStudyStyles].join("\n");

  expect(collectionPage).toContain("exhibitionDataValidation.valid");
  expect(caseStudyPage).toContain("exhibitionDataValidation.valid");
  expect(collectionError).toContain("Try collection again");
  expect(collectionError).toContain('href="/"');
  expect(caseStudyError).toContain("Try case study again");
  expect(caseStudyError).toContain('href="/collection"');
  expect(productSource).not.toMatch(/@keyframes|requestAnimationFrame|setInterval|setTimeout|scroll-behavior:\s*smooth|parallax/i);
  expect(productSource).not.toMatch(/\b(price|pricing|checkout|inventory|filter|cart|testimonial|ecommerce)\b/i);
  expect(productSource).not.toMatch(privateOrUnverifiableVocabulary);
});
