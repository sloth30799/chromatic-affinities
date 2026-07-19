import { expect, test } from "@playwright/test";

const specimenIds = [
  "AC-01-A", "AC-01-B", "AC-01-C",
  "AC-02-A", "AC-02-B", "AC-02-C",
  "AC-03-A", "AC-03-B", "AC-03-C",
  "AC-04-A", "AC-04-B", "AC-04-C",
] as const;

const specimenNames = [
  "Cobalt Glaze Tile", "Tidal Lacquer Panel", "Solar Mineral Cake",
  "Verdant Organza", "Orchid Signal Weave", "Botanical Pigment Vial",
  "Vermilion Lacquer Plate", "Ember Pigment Cast", "Glacier Resin Shard",
  "Cacao Clay Body", "Porcelain Vessel", "Folded Ceramic Sheet",
] as const;

async function openGallery(page: import("@playwright/test").Page) {
  await page.goto("/#specimen-primitives");
  await expect(page.getByRole("region", { name: "Specimen primitives test gallery" })).toBeVisible();
  await expect(page.locator("[data-specimen-id]")).toHaveCount(12);
}

async function expectBoundedSpecimens(page: import("@playwright/test").Page) {
  const outcome = await page.locator("[data-specimen-id]").evaluateAll((artworks) => {
    const documentWidth = document.documentElement.clientWidth;
    return {
      documentWidth,
      scrollWidth: document.documentElement.scrollWidth,
      artwork: artworks.map((artwork) => {
        const rect = artwork.getBoundingClientRect();
        const sample = artwork.closest("figure")?.getBoundingClientRect();
        return {
          id: artwork.getAttribute("data-specimen-id"),
          role: artwork.getAttribute("data-specimen-role"),
          silhouette: artwork.getAttribute("data-specimen-silhouette"),
          width: rect.width,
          height: rect.height,
          contained: Boolean(sample)
            && rect.left >= sample!.left - 0.5
            && rect.right <= sample!.right + 0.5
            && rect.top >= sample!.top - 0.5
            && rect.bottom <= sample!.bottom + 0.5,
        };
      }),
    };
  });

  expect(outcome.scrollWidth).toBeLessThanOrEqual(outcome.documentWidth);
  expect(outcome.artwork.map((entry) => entry.id)).toEqual(specimenIds);
  expect(new Set(outcome.artwork.map((entry) => entry.silhouette)).size).toBe(12);
  for (const specimen of outcome.artwork) {
    expect(specimen.role === "hero" || specimen.role === "supporting").toBe(true);
    expect(specimen.width).toBeGreaterThan(0);
    expect(specimen.height).toBeGreaterThan(0);
    expect(specimen.contained, specimen.id ?? "unnamed specimen").toBe(true);
  }
}

test("renders the complete label-free and labeled desktop primitive register", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openGallery(page);
  await expect(page.locator("[data-gallery-mode]")).toHaveAttribute("data-gallery-mode", "label-free");
  await expect(page.locator("#specimen-primitives figcaption")).toHaveCount(0);
  await expectBoundedSpecimens(page);
  await page.screenshot({ path: testInfo.outputPath("desktop-label-free.png"), fullPage: true });

  await page.getByRole("button", { name: "Show labels" }).click();
  await expect(page.locator("[data-gallery-mode]")).toHaveAttribute("data-gallery-mode", "labeled");
  await expect(page.locator("#specimen-primitives figcaption")).toHaveCount(12);
  for (const name of specimenNames) await expect(page.getByText(name, { exact: true })).toBeVisible();
  for (const id of specimenIds) await expect(page.getByText(id, { exact: true })).toBeVisible();
  await expectBoundedSpecimens(page);
  await page.screenshot({ path: testInfo.outputPath("desktop-labeled.png"), fullPage: true });
});

test("keeps every primitive bounded without horizontal overflow on mobile", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGallery(page);
  await expectBoundedSpecimens(page);
  await page.getByRole("button", { name: "Show labels" }).click();
  await expect(page.locator("#specimen-primitives figcaption")).toHaveCount(12);
  await expectBoundedSpecimens(page);
  await page.screenshot({ path: testInfo.outputPath("mobile-labeled.png"), fullPage: true });
});

test("is static in reduced motion while retaining the label-free recognition register", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await openGallery(page);
  await expect(page.locator("#specimen-primitives figcaption")).toHaveCount(0);
  await expectBoundedSpecimens(page);
  const motion = await page.locator("[data-specimen-id]").evaluateAll((artworks) => artworks.map((artwork) => {
    const style = getComputedStyle(artwork);
    return {
      animation: style.animationName,
      transition: style.transitionDuration,
      runningAnimations: artwork.getAnimations({ subtree: true }).length,
    };
  }));
  for (const specimen of motion) {
    expect(specimen.animation).toBe("none");
    expect(specimen.transition).toBe("0s");
    expect(specimen.runningAnimations).toBe(0);
  }
  await page.screenshot({ path: testInfo.outputPath("mobile-reduced-label-free.png"), fullPage: true });
});
